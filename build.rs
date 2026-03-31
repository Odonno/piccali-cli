use chrono::Utc;
use gherkin::GherkinEnv;
use globset::Glob;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

// ---------------------------------------------------------------------------
// Models (mirrors src/models.rs)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct Tag {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
}

#[derive(Debug, Serialize)]
struct Document {
    folders: Vec<FolderNode>,
}

#[derive(Debug, Serialize)]
struct FolderNode {
    name: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    folders: Vec<FolderNode>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    features: Vec<Feature>,
}

#[derive(Debug, Serialize)]
struct Feature {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    scenarios: Vec<Scenario>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    rules: Vec<Rule>,
}

#[derive(Debug, Serialize)]
struct Rule {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    scenarios: Vec<Scenario>,
}

#[derive(Debug, Serialize)]
struct Background {
    keyword: String,
    steps: Vec<Step>,
}

#[derive(Debug, Serialize)]
struct Scenario {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<Tag>,
    steps: Vec<Step>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    examples: Vec<Examples>,
}

#[derive(Debug, Serialize)]
struct Examples {
    keyword: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<Tag>,
    table: Table,
}

#[derive(Debug, Serialize)]
struct Step {
    keyword: String,
    #[serde(rename = "type")]
    step_type: StepType,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    doc_string: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    table: Option<Table>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
enum StepType {
    Given,
    When,
    Then,
}

#[derive(Debug, Serialize)]
struct Table {
    header: Vec<String>,
    rows: Vec<Vec<String>>,
}

// ---------------------------------------------------------------------------
// Tag resolution (mirrors src/parser.rs)
// ---------------------------------------------------------------------------

fn resolve_tag(raw: &str, tag_links: &HashMap<&str, &str>) -> Tag {
    let url = tag_links.iter().find_map(|(prefix, template)| {
        raw.strip_prefix(prefix)
            .map(|id| template.replace("{id}", id))
    });
    Tag {
        name: raw.to_owned(),
        url,
    }
}

fn resolve_tags(raw: &[String], tag_links: &HashMap<&str, &str>) -> Vec<Tag> {
    raw.iter().map(|t| resolve_tag(t, tag_links)).collect()
}

// ---------------------------------------------------------------------------
// Parser (mirrors src/parser.rs)
// ---------------------------------------------------------------------------

fn parse_feature_file(path: &Path, tag_links: &HashMap<&str, &str>) -> Result<Feature, String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("Could not read path: {}: {e}", path.display()))?;
    let preprocessed = escape_backslashes_in_table_cells(&raw);
    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse(&preprocessed, env)
        .map_err(|e| format!("Failed to parse {}: {e}", path.display()))?;
    Ok(convert_feature(&parsed, tag_links))
}

/// Pre-process raw Gherkin text to escape backslashes inside table cells that
/// are not part of a recognised Gherkin escape sequence (`\n`, `\|`, `\\`).
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

    if !source.ends_with('\n') {
        result.pop();
    }

    result
}

fn escape_table_row(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\\' {
            match chars.peek() {
                Some('n') | Some('|') | Some('\\') => {
                    out.push(ch);
                }
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

fn convert_feature(f: &gherkin::Feature, tag_links: &HashMap<&str, &str>) -> Feature {
    Feature {
        keyword: f.keyword.clone(),
        name: f.name.clone(),
        description: f.description.clone(),
        tags: resolve_tags(&f.tags, tag_links),
        background: f.background.as_ref().map(convert_background),
        scenarios: f
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
        rules: f.rules.iter().map(|r| convert_rule(r, tag_links)).collect(),
    }
}

fn convert_background(b: &gherkin::Background) -> Background {
    Background {
        keyword: b.keyword.clone(),
        steps: b.steps.iter().map(convert_step).collect(),
    }
}

fn convert_rule(r: &gherkin::Rule, tag_links: &HashMap<&str, &str>) -> Rule {
    Rule {
        keyword: r.keyword.clone(),
        name: r.name.clone(),
        description: r.description.clone(),
        tags: resolve_tags(&r.tags, tag_links),
        background: r.background.as_ref().map(convert_background),
        scenarios: r
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
    }
}

fn convert_scenario(s: &gherkin::Scenario, tag_links: &HashMap<&str, &str>) -> Scenario {
    Scenario {
        keyword: s.keyword.clone(),
        name: s.name.clone(),
        description: s.description.clone(),
        tags: resolve_tags(&s.tags, tag_links),
        steps: s.steps.iter().map(convert_step).collect(),
        examples: s
            .examples
            .iter()
            .map(|e| convert_examples(e, tag_links))
            .collect(),
    }
}

fn convert_step(s: &gherkin::Step) -> Step {
    Step {
        keyword: s.keyword.clone(),
        step_type: match s.ty {
            gherkin::StepType::Given => StepType::Given,
            gherkin::StepType::When => StepType::When,
            gherkin::StepType::Then => StepType::Then,
        },
        text: s.value.clone(),
        doc_string: s.docstring.clone(),
        table: s.table.as_ref().map(convert_table),
    }
}

fn convert_examples(e: &gherkin::Examples, tag_links: &HashMap<&str, &str>) -> Examples {
    let table = e.table.as_ref().map(convert_table).unwrap_or(Table {
        header: vec![],
        rows: vec![],
    });
    Examples {
        keyword: e.keyword.clone(),
        name: e.name.clone(),
        tags: resolve_tags(&e.tags, tag_links),
        table,
    }
}

fn convert_table(t: &gherkin::Table) -> Table {
    let mut rows_iter = t.rows.iter();
    let header = rows_iter.next().cloned().unwrap_or_default();
    let rows: Vec<Vec<String>> = rows_iter.cloned().collect();
    Table { header, rows }
}

// ---------------------------------------------------------------------------
// File discovery (mirrors src/main.rs discover_files)
// ---------------------------------------------------------------------------

fn discover_files(glob: &Glob) -> Vec<PathBuf> {
    let matcher = glob.compile_matcher();
    let mut files = Vec::new();

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
                files.push(path);
            }
        }
    }

    files.sort();
    files
}

// ---------------------------------------------------------------------------
// Folder tree builder (mirrors src/parser.rs build_folder_tree)
// ---------------------------------------------------------------------------

fn build_folder_tree(entries: Vec<(PathBuf, Feature)>) -> Vec<FolderNode> {
    let mut root: Vec<FolderNode> = Vec::new();

    for (path, feature) in entries {
        let relative = path.strip_prefix(".").unwrap_or(&path);

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

        insert_into_tree(&mut root, &dir_components, feature);
    }

    root
}

fn insert_into_tree(nodes: &mut Vec<FolderNode>, path_parts: &[String], feature: Feature) {
    if path_parts.is_empty() {
        if let Some(node) = nodes.last_mut() {
            node.features.push(feature);
        } else {
            nodes.push(FolderNode {
                name: String::new(),
                folders: Vec::new(),
                features: vec![feature],
            });
        }
        return;
    }

    let folder_name = &path_parts[0];
    let rest = &path_parts[1..];

    let idx = nodes.iter().position(|n| &n.name == folder_name);
    let idx = match idx {
        Some(i) => i,
        None => {
            nodes.push(FolderNode {
                name: folder_name.clone(),
                folders: Vec::new(),
                features: Vec::new(),
            });
            nodes.len() - 1
        }
    };

    if rest.is_empty() {
        nodes[idx].features.push(feature);
    } else {
        let sub = &mut nodes[idx].folders;
        insert_into_tree(sub, rest, feature);
    }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata {
    title: String,
    created_at: String,
}

// ---------------------------------------------------------------------------
// Build entry point
// ---------------------------------------------------------------------------

fn main() {
    // Re-run whenever any .feature file changes
    println!("cargo:rerun-if-changed=features/");

    // Tag prefix → URL template mappings used when generating data.json.
    // "feat:" tags link to the internal documentation hub at https://my-docs/{id}.
    let tag_links: HashMap<&str, &str> = HashMap::from([("feat:", "https://my-docs/{id}")]);

    // Ensure the output directory exists
    std::fs::create_dir_all("template/public").expect("Failed to create template/public directory");

    // Discover all .feature files (default glob: **/*.feature)
    let glob = Glob::new("**/*.feature").expect("Invalid glob pattern");
    let feature_files = discover_files(&glob);

    if feature_files.is_empty() {
        panic!("No feature files found matching pattern: **/*.feature");
    }

    // Parse all feature files, keeping the path alongside each feature
    let mut entries: Vec<(PathBuf, Feature)> = Vec::new();
    for path in feature_files {
        match parse_feature_file(&path, &tag_links) {
            Ok(feature) => entries.push((path, feature)),
            Err(e) => panic!("{e}"),
        }
    }

    let folders = build_folder_tree(entries);
    let document = Document { folders };

    // Serialize to JSON
    let json = serde_json::to_string_pretty(&document).expect("JSON serialization failed");

    // Write to template/public/data.json
    std::fs::write("template/public/data.json", json)
        .expect("Failed to write template/public/data.json");

    // Build and write metadata.json
    let metadata = Metadata {
        title: "Cucumber docs".to_string(),
        created_at: Utc::now().to_rfc3339(),
    };
    let metadata_json =
        serde_json::to_string_pretty(&metadata).expect("Metadata JSON serialization failed");
    std::fs::write("template/public/metadata.json", metadata_json)
        .expect("Failed to write template/public/metadata.json");
}
