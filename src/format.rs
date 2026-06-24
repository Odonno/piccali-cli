use crate::assets::FrontendAssets;
use crate::models::{
    Background, Document, Examples, Feature, FolderNode, Rule, Scenario, Step, Table, Tag,
};
use crate::parser::{AssetRef, ImageRef};
use chrono::Utc;
use color_eyre::eyre::{Result, WrapErr, eyre};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata<'a> {
    title: &'a str,
    created_at: String,
    scripts: Vec<String>,
    styles: Vec<String>,
}

/// Format a document as a pretty-printed JSON string.
pub fn format_json(document: &Document) -> Result<String> {
    serde_json::to_string_pretty(document).wrap_err("JSON serialization failed")
}

/// Produce the `metadata.json` payload as a pretty-printed JSON string.
///
/// `scripts` and `styles` are derived from `asset_refs` (filtered by `.js` / `.css` extension).
pub fn format_metadata(title: &str, asset_refs: &[AssetRef]) -> Result<String> {
    let mut scripts = Vec::<String>::new();
    let mut styles = Vec::<String>::new();

    for asset in asset_refs {
        let path = &asset.rel_path;
        if path.ends_with(".js") {
            scripts.push(format!("/{path}"));
        } else if path.ends_with(".css") {
            styles.push(format!("/{path}"));
        }
    }

    let metadata = Metadata {
        title,
        created_at: Utc::now().to_rfc3339(),
        scripts,
        styles,
    };
    serde_json::to_string_pretty(&metadata).wrap_err("Metadata JSON serialization failed")
}

/// Write an HTML site to `output_dir` by:
/// 1. Extracting the embedded `template/dist/` assets into `output_dir`
/// 2. Writing `data.json` (the JSON-formatted document)
/// 3. Writing `metadata.json`
/// 4. Copying any local images referenced in feature descriptions into
///    `output_dir/images/`
/// 5. Copying any additional asset files from `asset_refs` into `output_dir`,
///    preserving their paths relative to the glob base directory.
pub fn format_html(
    document: &Document,
    output_dir: &Path,
    title: &str,
    image_refs: &[ImageRef],
    asset_refs: &[AssetRef],
    base_url: Option<&str>,
    lang: Option<&str>,
) -> Result<()> {
    // Create output directory
    std::fs::create_dir_all(output_dir)
        .wrap_err_with(|| format!("Failed to create output directory {}", output_dir.display()))?;

    // Extract all embedded frontend assets into output_dir
    for file_path in FrontendAssets::iter() {
        let file = FrontendAssets::get(file_path.as_ref())
            .ok_or_else(|| eyre!("Failed to retrieve embedded asset: {file_path}"))?;

        let dest = output_dir.join(file_path.as_ref());

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)
                .wrap_err_with(|| format!("Failed to create directory {}", parent.display()))?;
        }

        std::fs::write(&dest, file.data.as_ref())
            .wrap_err_with(|| format!("Failed to write {}", dest.display()))?;
    }

    // Inject <base href="..."> into index.html if base_url is set
    if let Some(base_url) = base_url {
        let index_path = output_dir.join("index.html");
        let content = std::fs::read_to_string(&index_path)
            .wrap_err_with(|| format!("Failed to read {}", index_path.display()))?;
        let injected = inject_base_url(&content, base_url);
        std::fs::write(&index_path, injected)
            .wrap_err_with(|| format!("Failed to write {}", index_path.display()))?;
    }

    // Replace lang attribute in index.html if lang is set
    if let Some(lang) = lang {
        let index_path = output_dir.join("index.html");
        let content = std::fs::read_to_string(&index_path)
            .wrap_err_with(|| format!("Failed to read {}", index_path.display()))?;
        let injected = inject_lang(&content, lang);
        std::fs::write(&index_path, injected)
            .wrap_err_with(|| format!("Failed to write {}", index_path.display()))?;
    }

    // Write data.json
    let data_json = format_json(document)?;
    let data_path = output_dir.join("data.json");
    std::fs::write(&data_path, &data_json)
        .wrap_err_with(|| format!("Failed to write {}", data_path.display()))?;

    // Write metadata.json
    let metadata_json = format_metadata(title, asset_refs)?;
    let metadata_path = output_dir.join("metadata.json");
    std::fs::write(&metadata_path, metadata_json)
        .wrap_err_with(|| format!("Failed to write {}", metadata_path.display()))?;

    // Copy local images into output_dir/images/
    if !image_refs.is_empty() {
        let images_dir = output_dir.join("images");
        std::fs::create_dir_all(&images_dir)
            .wrap_err_with(|| format!("Failed to create directory {}", images_dir.display()))?;

        for img in image_refs {
            let dest = images_dir.join(&img.output_name);
            std::fs::copy(&img.src_path, &dest).wrap_err_with(|| {
                format!(
                    "Failed to copy image {} to {}",
                    img.src_path.display(),
                    dest.display()
                )
            })?;
        }
    }

    // Copy additional assets into output_dir, preserving paths relative to glob base.
    for asset in asset_refs {
        let dest = output_dir.join(&asset.rel_path);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)
                .wrap_err_with(|| format!("Failed to create directory {}", parent.display()))?;
        }
        std::fs::copy(&asset.src_path, &dest).wrap_err_with(|| {
            format!(
                "Failed to copy asset {} to {}",
                asset.src_path.display(),
                dest.display()
            )
        })?;
    }

    Ok(())
}

/// Inject `<base href="...">` as the first element inside `<head>`.
fn inject_base_url(html: &str, base_url: &str) -> String {
    html.replacen(
        "<head>",
        &format!("<head>\n    <base href=\"{base_url}\" />"),
        1,
    )
}

/// Replace the `lang` attribute on the `<html>` element.
fn inject_lang(html: &str, lang: &str) -> String {
    // The template always ships with lang="en"; replace the first occurrence.
    html.replacen("lang=\"en\"", &format!("lang=\"{lang}\""), 1)
}

// ---------------------------------------------------------------------------
// Markdown formatter
// ---------------------------------------------------------------------------

/// Collect all features from the document tree in folder-traversal order and
/// concatenate their Markdown representations, separated by `---` dividers.
///
/// Used for `--dry-run` output to stdout.
pub fn format_markdown_dry_run(document: &Document) -> String {
    let mut parts: Vec<String> = Vec::new();
    collect_folder_markdown(&document.folders, &mut parts, 1);
    parts.join("\n---\n\n")
}

fn collect_folder_markdown(folders: &[FolderNode], parts: &mut Vec<String>, base_level: usize) {
    for folder in folders {
        for feature in &folder.features {
            parts.push(format_feature_markdown_at(feature, base_level));
        }
        collect_folder_markdown(&folder.folders, parts, base_level);
    }
}

/// Write one `.md` file per feature into `output_dir`, preserving the folder
/// hierarchy from the document tree.
pub fn format_markdown(document: &Document, output_dir: &Path) -> Result<()> {
    std::fs::create_dir_all(output_dir)
        .wrap_err_with(|| format!("Failed to create output directory {}", output_dir.display()))?;

    write_folder_markdown(&document.folders, output_dir)
}

fn write_folder_markdown(folders: &[FolderNode], base: &Path) -> Result<()> {
    for folder in folders {
        let folder_path = base.join(&folder.name);

        // Write features in this folder
        for feature in &folder.features {
            let slug = slugify(&feature.name);
            let file_path = folder_path.join(format!("{slug}.md"));

            std::fs::create_dir_all(&folder_path).wrap_err_with(|| {
                format!("Failed to create directory {}", folder_path.display())
            })?;

            let content = format_feature_markdown(feature);
            std::fs::write(&file_path, content)
                .wrap_err_with(|| format!("Failed to write {}", file_path.display()))?;
        }

        // Recurse into sub-folders
        write_folder_markdown(&folder.folders, &folder_path)?;
    }
    Ok(())
}

/// Format a single `Feature` as a Markdown string, with feature at H1.
///
/// Structure:
/// - `# Feature name`  (H1)
/// - Tags as `@tag` inline text
/// - Description (if any)
/// - Background steps as bullet list
/// - Top-level Scenarios at H3
/// - Rules at H2, with their scenarios at H3
pub fn format_feature_markdown(feature: &Feature) -> String {
    format_feature_markdown_at(feature, 1)
}

/// Format a single `Feature` as a Markdown string, with headings starting at `base_level`.
///
/// Used by single-file output (`base_level = 2`) so that the document title H1 sits
/// above all feature headings (H2), rules (H3), and scenarios (H4).
fn format_feature_markdown_at(feature: &Feature, base_level: usize) -> String {
    let h_feature = "#".repeat(base_level);
    let h_rule = "#".repeat(base_level + 1);
    let h_scenario = "#".repeat(base_level + 2);

    let mut out = String::new();

    out.push_str(&format!("{h_feature} {}\n", feature.name));

    if !feature.tags.is_empty() {
        out.push('\n');
        out.push_str(&render_tags(&feature.tags));
        out.push('\n');
    }

    if let Some(desc) = &feature.description {
        out.push('\n');
        out.push_str(desc.trim());
        out.push('\n');
    }

    if let Some(bg) = &feature.background {
        out.push('\n');
        out.push_str(&render_background(bg));
    }

    for scenario in &feature.scenarios {
        out.push('\n');
        out.push_str(&render_scenario(scenario, &h_scenario));
    }

    for rule in &feature.rules {
        out.push('\n');
        out.push_str(&render_rule(rule, &h_rule, &h_scenario));
    }

    out
}

fn render_rule(rule: &Rule, heading: &str, scenario_heading: &str) -> String {
    let mut out = String::new();

    out.push_str(&format!("{heading} {}\n", rule.name));

    if !rule.tags.is_empty() {
        out.push('\n');
        out.push_str(&render_tags(&rule.tags));
        out.push('\n');
    }

    if let Some(desc) = &rule.description {
        out.push('\n');
        out.push_str(desc.trim());
        out.push('\n');
    }

    if let Some(bg) = &rule.background {
        out.push('\n');
        out.push_str(&render_background(bg));
    }

    for scenario in &rule.scenarios {
        out.push('\n');
        out.push_str(&render_scenario(scenario, scenario_heading));
    }

    out
}

/// Write all features into a single Markdown file, prefixed with a document title heading.
///
/// The file starts with `# {title}` and features are separated by `---` dividers.
/// Used when `--output` points to a file path (has a file extension).
pub fn format_markdown_single_file(document: &Document, title: &str, output_path: &Path) -> Result<()> {
    // Create parent directories if needed
    if let Some(parent) = output_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).wrap_err_with(|| {
                format!("Failed to create parent directory {}", parent.display())
            })?;
        }
    }

    let mut parts: Vec<String> = Vec::new();
    collect_folder_markdown(&document.folders, &mut parts, 2);

    let body = parts.join("\n---\n\n");
    let content = format!("# {title}\n\n{body}");

    std::fs::write(output_path, content)
        .wrap_err_with(|| format!("Failed to write {}", output_path.display()))?;

    Ok(())
}

fn render_background(bg: &Background) -> String {
    let mut out = String::new();
    out.push_str("**Background**\n");
    out.push('\n');
    for step in &bg.steps {
        out.push_str(&render_step(step));
    }
    out
}

fn render_scenario(scenario: &Scenario, heading: &str) -> String {
    let mut out = String::new();

    out.push_str(&format!("{heading} {}\n", scenario.name));

    if !scenario.tags.is_empty() {
        out.push('\n');
        out.push_str(&render_tags(&scenario.tags));
        out.push('\n');
    }

    if let Some(desc) = &scenario.description {
        out.push('\n');
        out.push_str(desc.trim());
        out.push('\n');
    }

    if !scenario.steps.is_empty() {
        out.push('\n');
        for step in &scenario.steps {
            out.push_str(&render_step(step));
        }
    }

    for examples in &scenario.examples {
        out.push('\n');
        out.push_str(&render_examples(examples));
    }

    out
}

fn render_step(step: &Step) -> String {
    let mut out = String::new();
    out.push_str(&format!("- **{}** {}\n", step.keyword.trim(), step.text));

    if let Some(doc) = &step.doc_string {
        out.push('\n');
        out.push_str("  ```\n");
        for line in doc.lines() {
            out.push_str(&format!("  {line}\n"));
        }
        out.push_str("  ```\n");
    }

    if let Some(table) = &step.table {
        out.push('\n');
        for line in render_table(table).lines() {
            out.push_str(&format!("  {line}\n"));
        }
        out.push('\n');
    }

    out
}

fn render_examples(examples: &Examples) -> String {
    let mut out = String::new();

    out.push_str("**Examples");
    if let Some(name) = &examples.name
        && !name.is_empty()
    {
        out.push_str(&format!(": {name}"));
    }
    out.push_str("**\n");

    if !examples.tags.is_empty() {
        out.push('\n');
        out.push_str(&render_tags(&examples.tags));
        out.push('\n');
    }

    out.push('\n');
    out.push_str(&render_table(&examples.table));

    out
}

fn render_table(table: &Table) -> String {
    let mut out = String::new();

    // Header row
    out.push('|');
    for col in &table.header {
        out.push_str(&format!(" {col} |"));
    }
    out.push('\n');

    // Separator row
    out.push('|');
    for _ in &table.header {
        out.push_str(" --- |");
    }
    out.push('\n');

    // Data rows
    for row in &table.rows {
        out.push('|');
        for cell in row {
            out.push_str(&format!(" {cell} |"));
        }
        out.push('\n');
    }

    out
}

fn render_tags(tags: &[Tag]) -> String {
    tags.iter()
        .map(|tag| format!("@{}", tag.name))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Convert a feature name to a filesystem-safe slug (lowercase, spaces → hyphens).
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn make_asset(rel_path: &str) -> AssetRef {
        AssetRef {
            src_path: PathBuf::from(rel_path),
            rel_path: rel_path.to_string(),
        }
    }

    fn parse_metadata(json: &str) -> serde_json::Value {
        serde_json::from_str(json).expect("valid JSON")
    }

    #[test]
    fn inject_lang_replaces_lang_attribute() {
        let html = r#"<!doctype html><html lang="en"><head></head></html>"#;
        let result = inject_lang(html, "fr");
        assert!(result.contains("lang=\"fr\""), "expected lang=\"fr\" in: {result}");
        assert!(!result.contains("lang=\"en\""), "old lang should be gone: {result}");
    }

    #[test]
    fn inject_lang_does_not_modify_when_same_lang() {
        let html = r#"<!doctype html><html lang="en"><head></head></html>"#;
        let result = inject_lang(html, "en");
        assert!(result.contains("lang=\"en\""));
    }

    #[test]
    fn metadata_contains_title_and_created_at() {
        let json = format_metadata("My Docs", &[]).unwrap();
        let v = parse_metadata(&json);
        assert_eq!(v["title"], "My Docs");
        assert!(v["createdAt"].as_str().is_some());
    }

    #[test]
    fn metadata_user_js_asset_added_to_scripts() {
        let asset = make_asset("custom/extra.js");
        let json = format_metadata("test", &[asset]).unwrap();
        let v = parse_metadata(&json);
        let scripts: Vec<&str> = v["scripts"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap())
            .collect();
        assert!(
            scripts.contains(&"/custom/extra.js"),
            "expected /custom/extra.js in scripts: {scripts:?}"
        );
    }

    #[test]
    fn metadata_user_css_asset_added_to_styles() {
        let asset = make_asset("custom/theme.css");
        let json = format_metadata("test", &[asset]).unwrap();
        let v = parse_metadata(&json);
        let styles: Vec<&str> = v["styles"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap())
            .collect();
        assert!(
            styles.contains(&"/custom/theme.css"),
            "expected /custom/theme.css in styles: {styles:?}"
        );
    }

    #[test]
    fn metadata_non_js_css_asset_not_added() {
        let asset = make_asset("images/logo.png");
        let json = format_metadata("test", &[asset]).unwrap();
        let v = parse_metadata(&json);
        let scripts: Vec<&str> = v["scripts"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap())
            .collect();
        let styles: Vec<&str> = v["styles"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| s.as_str().unwrap())
            .collect();
        assert!(
            !scripts.contains(&"/images/logo.png"),
            "png should not be in scripts"
        );
        assert!(
            !styles.contains(&"/images/logo.png"),
            "png should not be in styles"
        );
    }
}
