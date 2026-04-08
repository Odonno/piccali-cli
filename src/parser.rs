use color_eyre::eyre::{Result, WrapErr};
use gherkin::GherkinEnv;
use globset::Glob;
use regex::Regex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use walkdir::WalkDir;

use crate::models;

// ---------------------------------------------------------------------------
// Local image reference handling
// ---------------------------------------------------------------------------

/// A resolved reference to a local image found in a Gherkin description.
///
/// `src_path` is the absolute (or CWD-relative) path to the source image on
/// disk.  `output_name` is the de-duplicated name used under the `/images/`
/// prefix in every output mode (e.g. `SearchByVin_lego-car.jpg`).
#[derive(Debug, Clone)]
pub struct ImageRef {
    /// Absolute / CWD-relative path to the source image on disk.
    pub src_path: PathBuf,
    /// Name under which the image should be served/written (collision-safe).
    pub output_name: String,
}

/// Lazily-compiled regex that matches `![alt](path)` — all image syntax.
/// Remote / absolute paths are filtered out in Rust after matching.
fn local_image_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        // Capture group "path": anything inside `![...](...)`.
        Regex::new(r"!\[[^\]]*\]\((?P<path>[^)]+)\)").expect("local image regex is valid")
    })
}

/// Return `true` if `path` looks like a remote URL or absolute path that should
/// not be treated as a local file reference.
fn is_remote_or_absolute(path: &str) -> bool {
    // Absolute filesystem paths.
    if path.starts_with('/') {
        return true;
    }
    // URL schemes: one or more word chars followed by `:` (e.g. `http:`, `data:`, …).
    if let Some(colon_pos) = path.find(':') {
        let scheme = &path[..colon_pos];
        if !scheme.is_empty()
            && scheme
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')
        {
            return true;
        }
    }
    false
}

/// Normalize a markdown image link target into a path suitable for local lookup.
///
/// Handles:
/// - optional markdown image size suffixes like `=500x450`
/// - optional leading `./`
/// - URL percent-encoding (`%20`, `%C3%A9`, ...)
fn normalize_markdown_image_path(raw_path: &str) -> String {
    // Some markdown flavors append attributes after whitespace, e.g.
    // `![alt](./img.png =500x450)`. Keep only the target itself.
    let path_only = raw_path
        .trim()
        .split_ascii_whitespace()
        .next()
        .unwrap_or("");

    let decoded = url_escape::decode(path_only);
    decoded
        .strip_prefix("./")
        .unwrap_or(decoded.as_ref())
        .to_string()
}

/// Encode a local URL path (or path segment) for use inside markdown links.
///
/// Every segment is encoded independently so `/` separators are preserved while
/// spaces, unicode, and reserved characters inside segment names are escaped.
fn encode_url_path(path: &str) -> String {
    path.split('/')
        .map(|segment| url_escape::encode_component(segment).into_owned())
        .collect::<Vec<String>>()
        .join("/")
}

/// Extract every local image reference from an optional description string.
///
/// `feature_dir` is the directory that contains the `.feature` file; relative
/// image paths are resolved against it.  `folder_prefix` is a filesystem-safe
/// label (e.g. `SearchByVin`) prepended to each filename to avoid collisions
/// when multiple feature folders contain images with the same name.
///
/// Only paths that resolve to an existing file on disk are included.
pub fn extract_local_image_refs(
    description: Option<&str>,
    feature_dir: &Path,
    folder_prefix: &str,
) -> Vec<ImageRef> {
    let Some(desc) = description else {
        return Vec::new();
    };

    let re = local_image_re();
    let mut refs = Vec::new();

    for cap in re.captures_iter(desc) {
        let raw_path = &cap["path"];
        let normalized_path = normalize_markdown_image_path(raw_path);
        // Skip remote URLs and absolute paths.
        if is_remote_or_absolute(&normalized_path) {
            continue;
        }

        let src_path = feature_dir.join(&normalized_path);
        if !src_path.exists() {
            continue;
        }

        // Derive a collision-safe output name: `{prefix}_{filename}`.
        let file_name = src_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        let output_name = if folder_prefix.is_empty() {
            file_name
        } else {
            format!("{folder_prefix}_{file_name}")
        };

        refs.push(ImageRef {
            src_path,
            output_name,
        });
    }

    refs
}

/// Rewrite local image paths inside a description string so that they point to
/// `/images/{output_name}` (for colocated images) or `/assets/{rel_path}`
/// (for assets supplied via `--assets`).
///
/// `image_map` maps the original relative path (as it appears in the markdown,
/// e.g. `lego-car.jpg`) to the `output_name` (e.g. `SearchByVin_lego-car.jpg`).
///
/// `asset_refs` is the list of extra assets discovered via `--assets`.  If a
/// path is not found in `image_map` (i.e. it is not a file colocated with the
/// feature), it is matched by `rel_path` against every `AssetRef` and rewritten
/// to `/assets/{rel_path}`.  Local colocated matches always take priority.
pub fn rewrite_local_image_refs(
    description: &str,
    image_map: &HashMap<String, String>,
    asset_refs: &[AssetRef],
) -> String {
    let re = local_image_re();
    re.replace_all(description, |caps: &regex::Captures<'_>| {
        let full_match = caps.get(0).map_or("", |m| m.as_str());
        let raw_path = &caps["path"];
        let normalized_path = normalize_markdown_image_path(raw_path);

        // Leave remote URLs and absolute paths unchanged.
        if is_remote_or_absolute(&normalized_path) {
            return full_match.to_owned();
        }

        // Priority 1: colocated image map.
        if let Some(output_name) = image_map.get(&normalized_path) {
            let encoded_output_name = encode_url_path(output_name);
            return full_match.replace(raw_path, &format!("/images/{encoded_output_name}"));
        }

        // Priority 2: asset from --assets matched by rel_path.
        if let Some(asset) = asset_refs
            .iter()
            .find(|a| a.rel_path.ends_with(normalized_path.as_str()))
        {
            let encoded_rel_path = encode_url_path(&asset.rel_path);
            return full_match.replace(raw_path, &format!("/{encoded_rel_path}"));
        }

        full_match.to_owned()
    })
    .into_owned()
}

/// Resolve a raw tag string into a `models::Tag`, optionally expanding a URL
/// using the provided prefix→url_template map.
///
/// For a tag `"us:DATADIGIT-123"` and entry `("us:", "https://my-docs/{id}")`,
/// the `{id}` placeholder is replaced with `"DATADIGIT-123"` (the part after
/// the prefix).
fn resolve_tag(raw: &str, tag_links: &HashMap<String, String>) -> models::Tag {
    let url = tag_links.iter().find_map(|(prefix, template)| {
        raw.strip_prefix(prefix.as_str())
            .map(|id| template.replace("{id}", id))
    });
    models::Tag {
        name: raw.to_owned(),
        url,
    }
}

fn resolve_tags(raw: &[String], tag_links: &HashMap<String, String>) -> Vec<models::Tag> {
    raw.iter().map(|t| resolve_tag(t, tag_links)).collect()
}

/// Parse a single `.feature` file and convert it to our model.
///
/// `tag_links` maps tag prefixes (e.g. `"us:"`) to URL templates
/// (e.g. `"https://my-docs/{id}"`).
pub fn parse_feature_file(
    path: &Path,
    tag_links: &HashMap<String, String>,
) -> Result<models::Feature> {
    let raw = std::fs::read_to_string(path)
        .wrap_err_with(|| format!("Could not read path: {}", path.display()))
        .wrap_err_with(|| format!("Failed to parse {}", path.display()))?;

    let preprocessed = escape_backslashes_in_table_cells(&raw);

    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse(&preprocessed, env)
        .wrap_err_with(|| format!("Could not parse feature file: {}", path.display()))
        .wrap_err_with(|| format!("Failed to parse {}", path.display()))?;
    Ok(convert_feature(&parsed, tag_links))
}

/// Pre-process raw Gherkin text to escape backslashes inside table cells that
/// are not part of a recognised Gherkin escape sequence (`\n`, `\|`, `\\`).
///
/// The Gherkin table-cell parser only recognises those three escape sequences;
/// any other `\X` causes a parse error.  Real-world feature files often contain
/// regex patterns such as `\(\d+\)` in table cells, which would otherwise fail
/// to parse.  By doubling unrecognised backslashes (`\(` → `\\(`) before
/// handing the source to the Gherkin library we preserve the intended literal
/// value while staying within the library's grammar.
fn escape_backslashes_in_table_cells(source: &str) -> String {
    let mut result = String::with_capacity(source.len());

    for line in source.split('\n') {
        let trimmed = line.trim_start();
        if trimmed.starts_with('|') {
            result.push_str(&escape_table_row(line));
        } else {
            result.push_str(line);
        }
        result.push('\n');
    }

    // Remove the trailing newline we unconditionally added if the original
    // source did not end with one.
    if !source.ends_with('\n') {
        result.pop();
    }

    result
}

/// Escape unrecognised backslash sequences inside a single table row line.
///
/// Gherkin recognises `\n`, `\|`, and `\\` as escape sequences inside table
/// cells.  Any other `\X` is left as-is by doubling the backslash so that the
/// Gherkin parser ultimately delivers the original single `\` in the cell
/// value.
fn escape_table_row(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\\' {
            match chars.peek() {
                // Recognised Gherkin escape sequences — leave unchanged.
                Some('n') | Some('|') | Some('\\') => {
                    out.push(ch);
                }
                // Any other character after `\`: double the backslash so that
                // the Gherkin parser interprets `\\` as a literal `\`.
                _ => {
                    out.push('\\');
                    out.push(ch);
                }
            }
        } else {
            out.push(ch);
        }
    }

    out
}

/// Build a nested folder tree from a list of `(path, feature)` pairs.
///
/// The path components between the working directory and the feature file
/// become the folder hierarchy. Files in the same directory are grouped
/// under the same `FolderNode`.
///
/// Example: given paths `features/A/Foo.feature` and `features/A/Bar.feature`
/// and `features/B/Baz.feature`, the result is:
/// ```
/// [ FolderNode("features", folders=[
///     FolderNode("A", features=[Foo, Bar]),
///     FolderNode("B", features=[Baz]),
/// ]) ]
/// ```
pub fn build_folder_tree(
    entries: Vec<(std::path::PathBuf, models::Feature)>,
) -> Vec<models::FolderNode> {
    // We build the tree by inserting each entry into a root vec of FolderNodes.
    let mut root: Vec<models::FolderNode> = Vec::new();

    for (path, feature) in entries {
        // Strip the leading "./" if present
        let relative = path.strip_prefix(".").unwrap_or(&path);

        // Collect path components, excluding the filename itself
        let dir_components: Vec<String> = relative
            .parent()
            .map(|p| {
                p.components()
                    .filter_map(|c| match c {
                        std::path::Component::Normal(s) => Some(s.to_string_lossy().into_owned()),
                        _ => None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Navigate / create the folder hierarchy, then push the feature
        insert_into_tree(&mut root, &dir_components, feature);
    }

    root
}

/// Recursively insert a `feature` at the location described by `path_parts`
/// within the given `nodes` vec, creating `FolderNode`s as needed.
fn insert_into_tree(
    nodes: &mut Vec<models::FolderNode>,
    path_parts: &[String],
    feature: models::Feature,
) {
    if path_parts.is_empty() {
        // Features with no parent directory go into a synthetic root folder
        // named "" — callers should handle this case if desired.
        // For now, push to the last node or create an anonymous one.
        if let Some(node) = nodes.last_mut() {
            node.features.push(feature);
        } else {
            nodes.push(models::FolderNode {
                name: String::new(),
                folders: Vec::new(),
                features: vec![feature],
            });
        }
        return;
    }

    let folder_name = &path_parts[0];
    let rest = &path_parts[1..];

    // Find or create the folder node at this level
    let idx = nodes.iter().position(|n| &n.name == folder_name);
    let idx = match idx {
        Some(i) => i,
        None => {
            nodes.push(models::FolderNode {
                name: folder_name.clone(),
                folders: Vec::new(),
                features: Vec::new(),
            });
            nodes.len() - 1
        }
    };

    if rest.is_empty() {
        // Leaf: place the feature directly in this folder
        nodes[idx].features.push(feature);
    } else {
        // Recurse into sub-folders
        let sub = &mut nodes[idx].folders;
        insert_into_tree(sub, rest, feature);
    }
}

fn convert_feature(
    feature: &gherkin::Feature,
    tag_links: &HashMap<String, String>,
) -> models::Feature {
    models::Feature {
        keyword: feature.keyword.clone(),
        name: feature.name.clone(),
        description: feature.description.clone(),
        tags: resolve_tags(&feature.tags, tag_links),
        background: feature.background.as_ref().map(convert_background),
        scenarios: feature
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
        rules: feature
            .rules
            .iter()
            .map(|r| convert_rule(r, tag_links))
            .collect(),
    }
}

fn convert_background(background: &gherkin::Background) -> models::Background {
    models::Background {
        keyword: background.keyword.clone(),
        steps: background.steps.iter().map(convert_step).collect(),
    }
}

fn convert_rule(rule: &gherkin::Rule, tag_links: &HashMap<String, String>) -> models::Rule {
    models::Rule {
        keyword: rule.keyword.clone(),
        name: rule.name.clone(),
        description: rule.description.clone(),
        tags: resolve_tags(&rule.tags, tag_links),
        background: rule.background.as_ref().map(convert_background),
        scenarios: rule
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
    }
}

fn convert_scenario(
    scenario: &gherkin::Scenario,
    tag_links: &HashMap<String, String>,
) -> models::Scenario {
    models::Scenario {
        keyword: scenario.keyword.clone(),
        name: scenario.name.clone(),
        description: scenario.description.clone(),
        tags: resolve_tags(&scenario.tags, tag_links),
        steps: scenario.steps.iter().map(convert_step).collect(),
        examples: scenario
            .examples
            .iter()
            .map(|e| convert_examples(e, tag_links))
            .collect(),
    }
}

fn convert_step(step: &gherkin::Step) -> models::Step {
    models::Step {
        keyword: step.keyword.clone(),
        step_type: convert_step_type(step.ty),
        text: step.value.clone(),
        doc_string: step.docstring.clone(),
        table: step.table.as_ref().map(convert_table),
    }
}

fn convert_step_type(step_type: gherkin::StepType) -> models::StepType {
    match step_type {
        gherkin::StepType::Given => models::StepType::Given,
        gherkin::StepType::When => models::StepType::When,
        gherkin::StepType::Then => models::StepType::Then,
    }
}

fn convert_examples(
    examples: &gherkin::Examples,
    tag_links: &HashMap<String, String>,
) -> models::Examples {
    let table = examples
        .table
        .as_ref()
        .map(convert_table)
        .unwrap_or_else(|| models::Table {
            header: vec![],
            rows: vec![],
        });
    models::Examples {
        keyword: examples.keyword.clone(),
        name: examples.name.clone(),
        tags: resolve_tags(&examples.tags, tag_links),
        table,
    }
}

fn convert_table(table: &gherkin::Table) -> models::Table {
    let mut rows_iter = table.rows.iter();
    let header = rows_iter.next().cloned().unwrap_or_default();
    let rows: Vec<Vec<String>> = rows_iter.cloned().collect();
    models::Table { header, rows }
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/// A resolved reference to an additional asset file specified via `--assets`.
///
/// `src_path` is the source path on disk.
/// `rel_path` is the path relative to the glob base directory, used as the
/// output path (served URL or destination path in the output folder).
#[derive(Debug, Clone)]
pub struct AssetRef {
    /// Source path on disk (may be absolute or CWD-relative).
    pub src_path: PathBuf,
    /// Path relative to the glob base directory (used as output/URL path).
    pub rel_path: String,
}

/// Extract the literal (non-wildcard) base directory from a glob pattern string.
///
/// For example:
/// - `"static/**/*"` → `"static"`
/// - `"assets/images/*.png"` → `"assets/images"`
/// - `"**/*.png"` → `"."` (no literal prefix)
/// - `"fonts/foo.woff"` → `"fonts"`
fn glob_base_dir(glob_str: &str) -> PathBuf {
    // Split on '/' to find the longest prefix of components with no wildcards.
    let parts: Vec<&str> = glob_str.split('/').collect();
    let mut base_parts: Vec<&str> = Vec::new();
    for part in &parts[..parts.len().saturating_sub(1)] {
        // A component containing any special glob character ends the literal prefix.
        if part.contains(['*', '?', '[', '{']) {
            break;
        }
        base_parts.push(part);
    }
    if base_parts.is_empty() {
        PathBuf::from(".")
    } else {
        PathBuf::from(base_parts.join("/"))
    }
}

/// Walk the filesystem and return all [`AssetRef`]s matching `glob`.
///
/// Each entry has:
/// - `src_path`: the actual file path
/// - `rel_path`: path relative to the glob base directory (for output routing)
pub fn discover_assets(glob: &Glob) -> Vec<AssetRef> {
    let matcher = glob.compile_matcher();
    let base = glob_base_dir(glob.glob());

    let mut assets: Vec<AssetRef> = Vec::new();

    let walker = WalkDir::new(".").into_iter().filter_entry(|entry| {
        let name = entry.file_name().to_string_lossy();
        !matches!(name.as_ref(), "target" | "node_modules" | ".git")
    });

    for entry in walker.filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.into_path();
            let relative = path.strip_prefix(".").unwrap_or(&path);
            let normalized = relative.to_string_lossy().replace('\\', "/");

            if matcher.is_match(&normalized) {
                // Strip the glob base to get the path used for output routing.
                let rel_path = if base.as_os_str() == "." {
                    normalized.clone()
                } else {
                    let base_str = base.to_string_lossy();
                    let prefix = format!("{}/", base_str);
                    normalized
                        .strip_prefix(prefix.as_str())
                        .unwrap_or(&normalized)
                        .to_string()
                };
                let rel_path = format!("assets/{}", rel_path);

                assets.push(AssetRef {
                    src_path: path,
                    rel_path,
                });
            }
        }
    }

    assets.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
    assets
}

/// Walk the current directory and return all file paths matching the glob pattern.
pub fn discover_files(glob: &Glob) -> Vec<PathBuf> {
    let matcher = glob.compile_matcher();
    let mut files = Vec::new();

    let walker = WalkDir::new(".").into_iter().filter_entry(|entry| {
        // Skip common directories that should never contain feature files
        let name = entry.file_name().to_string_lossy();
        !matches!(name.as_ref(), "target" | "node_modules" | ".git")
    });

    for entry in walker.filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.into_path();
            // Strip the leading "./" or ".\" to get a clean relative path
            let relative = path.strip_prefix(".").unwrap_or(&path);
            // Normalize path separators to forward slashes for consistent glob matching
            let normalized = relative.to_string_lossy().replace('\\', "/");
            if matcher.is_match(&normalized) {
                files.push(path);
            }
        }
    }

    files.sort();
    files
}

// ---------------------------------------------------------------------------
// Image collection and rewriting helpers
// ---------------------------------------------------------------------------

/// For every `(path, feature)` entry, scan all description fields for local
/// image references, build a deduplicated list of [`ImageRef`]s, and
/// rewrite the descriptions in-place to use `/images/{output_name}` URLs.
///
/// Any image path that is not colocated on disk but matches an [`AssetRef`]'s
/// `rel_path` (from `--assets`) is rewritten to `/assets/{rel_path}` instead.
///
/// Returns the deduplicated list of image references (keyed on `output_name`).
pub fn collect_and_rewrite_images(
    entries: &mut [(PathBuf, models::Feature)],
    asset_refs: &[AssetRef],
) -> Vec<ImageRef> {
    // Pass 1 — collect all image refs across every description field.
    // We keep them in insertion order and deduplicate by `output_name`.
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut all_refs: Vec<ImageRef> = Vec::new();

    for (path, feature) in entries.iter() {
        let feature_dir = path.parent().unwrap_or(Path::new("."));

        // Use the immediate parent folder name as the collision-avoidance prefix.
        let folder_prefix = feature_dir
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        // Collect from the feature description and all nested descriptions.
        let descs = description_strings(feature);
        for desc in descs {
            let refs = extract_local_image_refs(Some(desc), feature_dir, &folder_prefix);
            for r in refs {
                if seen.insert(r.output_name.clone()) {
                    all_refs.push(r);
                }
            }
        }
    }

    // Pass 2 — rewrite description strings in-place.
    // Build a per-feature lookup: raw relative path → output_name.
    for (path, feature) in entries.iter_mut() {
        let feature_dir = path.parent().unwrap_or(Path::new("."));

        let folder_prefix = feature_dir
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        // Build a map for this feature: raw_path → output_name.
        let image_map: HashMap<String, String> = {
            let mut m = HashMap::new();
            // We re-extract so we get the raw_path strings for this feature.
            let descs = description_strings_owned(feature);
            for desc in &descs {
                let refs = extract_local_image_refs(Some(desc), feature_dir, &folder_prefix);
                for r in refs {
                    // raw_path is the filename (or relative path) as it appears in the markdown.
                    // We need to recover the original raw path from the description.
                    // Since extract_local_image_refs resolved feature_dir.join(raw_path),
                    // we can get the raw path by stripping the feature_dir prefix from src_path.
                    if let Ok(rel) = r.src_path.strip_prefix(feature_dir) {
                        let raw = rel.to_string_lossy().replace('\\', "/");
                        m.insert(raw, r.output_name);
                    }
                }
            }
            m
        };

        if image_map.is_empty() && asset_refs.is_empty() {
            continue;
        }

        rewrite_feature_descriptions(feature, &image_map, asset_refs);
    }

    all_refs
}

/// Collect all description string references from a feature (borrowed).
fn description_strings(feature: &models::Feature) -> Vec<&str> {
    let mut descs = Vec::new();
    if let Some(d) = &feature.description {
        descs.push(d.as_str());
    }
    for scenario in &feature.scenarios {
        if let Some(d) = &scenario.description {
            descs.push(d.as_str());
        }
    }
    for rule in &feature.rules {
        if let Some(d) = &rule.description {
            descs.push(d.as_str());
        }
        for scenario in &rule.scenarios {
            if let Some(d) = &scenario.description {
                descs.push(d.as_str());
            }
        }
    }
    descs
}

/// Collect all description strings from a feature (owned clones).
fn description_strings_owned(feature: &models::Feature) -> Vec<String> {
    description_strings(feature)
        .into_iter()
        .map(str::to_owned)
        .collect()
}

/// Rewrite all description fields in a feature using the given raw→output_name map.
fn rewrite_feature_descriptions(
    feature: &mut models::Feature,
    image_map: &HashMap<String, String>,
    asset_refs: &[AssetRef],
) {
    if let Some(d) = &feature.description {
        feature.description = Some(rewrite_local_image_refs(d, image_map, asset_refs));
    }
    for scenario in &mut feature.scenarios {
        if let Some(d) = &scenario.description {
            scenario.description = Some(rewrite_local_image_refs(d, image_map, asset_refs));
        }
    }
    for rule in &mut feature.rules {
        if let Some(d) = &rule.description {
            rule.description = Some(rewrite_local_image_refs(d, image_map, asset_refs));
        }
        for scenario in &mut rule.scenarios {
            if let Some(d) = &scenario.description {
                scenario.description = Some(rewrite_local_image_refs(d, image_map, asset_refs));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{tempdir, NamedTempFile};

    // --- helpers ---

    /// Write Gherkin content to a temporary `.feature` file and return it.
    fn write_feature(content: &str) -> NamedTempFile {
        let mut tmp = NamedTempFile::with_suffix(".feature").unwrap();
        write!(tmp, "{content}").unwrap();
        tmp
    }

    /// Collect the full eyre error chain as a `Vec<String>`.
    fn error_chain(err: &color_eyre::eyre::Error) -> Vec<String> {
        err.chain().map(|c| c.to_string()).collect()
    }

    // --- parse_feature_file: success cases ---

    #[test]
    fn parse_valid_feature_file_succeeds() {
        let tmp = write_feature(
            "Feature: Warranty alert\n\
             \n\
               Scenario: Alert is shown\n\
             \n\
                 Given a warranty is about to expire\n\
             \n\
                 Then an alert is displayed\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Warranty alert",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Alert is shown",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "a warranty is about to expire"
                },
                {
                  "keyword": "Then ",
                  "type": "Then",
                  "text": "an alert is displayed"
                }
              ]
            }
          ]
        }
        "#);
    }

    #[test]
    fn parse_feature_file_with_tag_links_resolves_url() {
        let tmp = write_feature(
            "@us:TICKET-42\n\
             Feature: Tagged feature\n\
             \n\
               Scenario: A scenario\n\
             \n\
                 Given something\n",
        );

        let mut tag_links = HashMap::new();
        tag_links.insert(
            "us:".to_string(),
            "https://tracker.example.com/browse/{id}".to_string(),
        );

        let feature = parse_feature_file(tmp.path(), &tag_links).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Tagged feature",
          "tags": [
            {
              "name": "us:TICKET-42",
              "url": "https://tracker.example.com/browse/TICKET-42"
            }
          ],
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "A scenario",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "something"
                }
              ]
            }
          ]
        }
        "#);
    }

    // --- parse_feature_file: regex text ---

    #[test]
    fn parse_feature_file_with_regex_in_step_text_succeeds() {
        let tmp = write_feature(
            "Feature: Regex in step text\n\
             \n\
               Scenario: Validate with regex\n\
             \n\
                 Given a field matching pattern \"\\(\\d+\\)\"\n\
                 When I validate input \"(123)\"\n\
                 Then the value matches regex \"^\\d{3}$\"\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Regex in step text",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Validate with regex",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "a field matching pattern \"\\(\\d+\\)\""
                },
                {
                  "keyword": "When ",
                  "type": "When",
                  "text": "I validate input \"(123)\""
                },
                {
                  "keyword": "Then ",
                  "type": "Then",
                  "text": "the value matches regex \"^\\d{3}$\""
                }
              ]
            }
          ]
        }
        "#);
    }

    #[test]
    fn parse_feature_file_with_regex_in_table_cell_succeeds() {
        let tmp = write_feature(
            "Feature: Regex in table\n\
             \n\
               Scenario: Validate patterns from table\n\
             \n\
                 Given the following patterns:\n\
                   | pattern    | valid  |\n\
                   | \\(\\d+\\) | true   |\n\
                   | ^\\d{3}$   | false  |\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Regex in table",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Validate patterns from table",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "the following patterns:",
                  "table": {
                    "header": [
                      "pattern",
                      "valid"
                    ],
                    "rows": [
                      [
                        "\\(\\d+\\)",
                        "true"
                      ],
                      [
                        "^\\d{3}$",
                        "false"
                      ]
                    ]
                  }
                }
              ]
            }
          ]
        }
        "#);
    }

    // --- local image references ---

    #[test]
    fn extract_local_image_refs_decodes_percent_encoding_and_trims_size_suffix() {
        let dir = tempdir().unwrap();
        let image_dir = dir.path().join("selection du_titre");
        std::fs::create_dir_all(&image_dir).unwrap();
        let image_path = image_dir.join("screen.png");
        std::fs::write(&image_path, b"png").unwrap();

        let refs = extract_local_image_refs(
            Some("![test](./selection%20du_titre/screen.png =500x450)"),
            dir.path(),
            "SearchByVin",
        );

        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].src_path, image_path);
        assert_eq!(refs[0].output_name, "SearchByVin_screen.png");
    }

    #[test]
    fn rewrite_local_image_refs_decodes_percent_encoding_and_trims_size_suffix() {
        let mut image_map = HashMap::new();
        image_map.insert(
            "selection du_titre/screen.png".to_string(),
            "SearchByVin_screen.png".to_string(),
        );

        let rewritten = rewrite_local_image_refs(
            "![test](./selection%20du_titre/screen.png =500x450)",
            &image_map,
            &[],
        );

        assert_eq!(rewritten, "![test](/images/SearchByVin_screen.png)");
    }

    #[test]
    fn rewrite_local_image_refs_encodes_mapped_image_output_path() {
        let mut image_map = HashMap::new();
        image_map.insert(
            "selection du_titre/screen.png".to_string(),
            "Search By Vin_écran final.png".to_string(),
        );

        let rewritten = rewrite_local_image_refs(
            "![test](./selection%20du_titre/screen.png =500x450)",
            &image_map,
            &[],
        );

        assert_eq!(
            rewritten,
            "![test](/images/Search%20By%20Vin_%C3%A9cran%20final.png)"
        );
    }

    #[test]
    fn rewrite_local_image_refs_encodes_mapped_asset_output_path() {
        let asset_refs = vec![AssetRef {
            src_path: PathBuf::from("assets/screenshots/écran final.png"),
            rel_path: "assets/screenshots/écran final.png".to_string(),
        }];

        let rewritten = rewrite_local_image_refs(
            "![test](./screenshots/%C3%A9cran%20final.png)",
            &HashMap::new(),
            &asset_refs,
        );

        assert_eq!(
            rewritten,
            "![test](/assets/screenshots/%C3%A9cran%20final.png)"
        );
    }

    // --- parse_feature_file: error cases ---

    #[test]
    fn parse_missing_feature_file_returns_error() {
        let path = std::path::Path::new("nonexistent_path/does_not_exist.feature");
        let err = parse_feature_file(path, &HashMap::new()).unwrap_err();
        let chain = error_chain(&err);

        // Top-level context wraps the gherkin error with our path message
        insta::assert_snapshot!(chain[0], @"Failed to parse nonexistent_path/does_not_exist.feature");

        // Gherkin surface error
        insta::assert_snapshot!(chain[1], @"Could not read path: nonexistent_path/does_not_exist.feature");

        // Root cause: OS error
        insta::assert_snapshot!(chain[2], @"No such file or directory (os error 2)");
    }

    #[test]
    fn parse_invalid_gherkin_reports_line_and_column() {
        // The invalid keyword starts at line 4, column 5 (4 spaces of indent).
        // gherkin's ParseError records the exact position where parsing failed.
        let tmp = write_feature(
            "Feature: Broken feature\n\
               Scenario: A scenario\n\
                 Given a valid step\n\
                 INVALID_KEYWORD this line causes a parse error\n",
        );

        let err = parse_feature_file(tmp.path(), &HashMap::new()).unwrap_err();
        let chain = error_chain(&err);

        // Top-level context — redact the non-deterministic temp path
        let path_str = tmp.path().display().to_string();
        let top = chain[0].replace(&path_str, "[PATH]");
        insta::assert_snapshot!(top, @"Failed to parse [PATH]");

        // Gherkin's own surface error — path also varies
        let mid = chain[1].replace(&path_str, "[PATH]");
        insta::assert_snapshot!(mid, @"Could not parse feature file: [PATH]");

        // ParseError with line/column — stable, no path involved
        insta::assert_snapshot!(chain[2], @r#"Error at 4:18: {"unknown keyword"}"#);
    }
}
