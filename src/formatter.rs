use crate::assets::FrontendAssets;
use crate::models::Document;
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
