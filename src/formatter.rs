use crate::assets::FrontendAssets;
use crate::models::{
    Background, Document, Examples, Feature, FolderNode, Rule, Scenario, Step, Table, Tag,
};
use chrono::Utc;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata<'a> {
    title: &'a str,
    created_at: String,
}

/// Format a document as a pretty-printed JSON string.
pub fn format_json(document: &Document) -> Result<String, String> {
    serde_json::to_string_pretty(document)
        .map_err(|error| format!("JSON serialization failed: {error}"))
}

/// Produce the `metadata.json` payload as a pretty-printed JSON string.
pub fn format_metadata(title: &str) -> Result<String, String> {
    let metadata = Metadata {
        title,
        created_at: Utc::now().to_rfc3339(),
    };
    serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Metadata JSON serialization failed: {e}"))
}

/// Write an HTML site to `output_dir` by:
/// 1. Extracting the embedded `template/dist/` assets into `output_dir`
/// 2. Writing `data.json` (the JSON-formatted document)
/// 3. Writing `metadata.json`
pub fn format_html(document: &Document, output_dir: &Path, title: &str) -> Result<(), String> {
    // Create output directory
    std::fs::create_dir_all(output_dir).map_err(|e| {
        format!(
            "Failed to create output directory {}: {e}",
            output_dir.display()
        )
    })?;

    // Extract all embedded frontend assets into output_dir
    for file_path in FrontendAssets::iter() {
        let file = FrontendAssets::get(file_path.as_ref())
            .ok_or_else(|| format!("Failed to retrieve embedded asset: {file_path}"))?;

        let dest = output_dir.join(file_path.as_ref());

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {e}", parent.display()))?;
        }

        std::fs::write(&dest, file.data.as_ref())
            .map_err(|e| format!("Failed to write {}: {e}", dest.display()))?;
    }

    // Write data.json
    let data_json = format_json(document)?;
    let data_path = output_dir.join("data.json");
    std::fs::write(&data_path, &data_json)
        .map_err(|e| format!("Failed to write {}: {e}", data_path.display()))?;

    // Write metadata.json
    let metadata_json = format_metadata(title)?;
    let metadata_path = output_dir.join("metadata.json");
    std::fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write {}: {e}", metadata_path.display()))?;

    Ok(())
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
    collect_folder_markdown(&document.folders, &mut parts);
    parts.join("\n---\n\n")
}

fn collect_folder_markdown(folders: &[FolderNode], parts: &mut Vec<String>) {
    for folder in folders {
        for feature in &folder.features {
            parts.push(format_feature_markdown(feature));
        }
        collect_folder_markdown(&folder.folders, parts);
    }
}

/// Write one `.md` file per feature into `output_dir`, preserving the folder
/// hierarchy from the document tree.
pub fn format_markdown(document: &Document, output_dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(output_dir).map_err(|e| {
        format!(
            "Failed to create output directory {}: {e}",
            output_dir.display()
        )
    })?;

    write_folder_markdown(&document.folders, output_dir)
}

fn write_folder_markdown(folders: &[FolderNode], base: &Path) -> Result<(), String> {
    for folder in folders {
        let folder_path = base.join(&folder.name);

        // Write features in this folder
        for feature in &folder.features {
            let slug = slugify(&feature.name);
            let file_path = folder_path.join(format!("{slug}.md"));

            std::fs::create_dir_all(&folder_path).map_err(|e| {
                format!("Failed to create directory {}: {e}", folder_path.display())
            })?;

            let content = format_feature_markdown(feature);
            std::fs::write(&file_path, content)
                .map_err(|e| format!("Failed to write {}: {e}", file_path.display()))?;
        }

        // Recurse into sub-folders
        write_folder_markdown(&folder.folders, &folder_path)?;
    }
    Ok(())
}

/// Format a single `Feature` as a Markdown string.
///
/// Structure:
/// - `# Feature name`  (H1)
/// - Tags as `@tag` inline text
/// - Description (if any)
/// - Background steps as bullet list
/// - Top-level Scenarios at H3
/// - Rules at H2, with their scenarios at H3
pub fn format_feature_markdown(feature: &Feature) -> String {
    let mut out = String::new();

    // H1 — feature name
    out.push_str(&format!("# {}\n", feature.name));

    // Tags
    if !feature.tags.is_empty() {
        out.push('\n');
        out.push_str(&render_tags(&feature.tags));
        out.push('\n');
    }

    // Description
    if let Some(desc) = &feature.description {
        out.push('\n');
        out.push_str(desc.trim());
        out.push('\n');
    }

    // Background
    if let Some(bg) = &feature.background {
        out.push('\n');
        out.push_str(&render_background(bg));
    }

    // Top-level scenarios
    for scenario in &feature.scenarios {
        out.push('\n');
        out.push_str(&render_scenario(scenario, "###"));
    }

    // Rules
    for rule in &feature.rules {
        out.push('\n');
        out.push_str(&render_rule(rule));
    }

    out
}

fn render_rule(rule: &Rule) -> String {
    let mut out = String::new();

    out.push_str(&format!("## {}\n", rule.name));

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
        out.push_str(&render_scenario(scenario, "###"));
    }

    out
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
