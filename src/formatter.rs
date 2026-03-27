use crate::models::Document;
use chrono::Utc;
use serde::Serialize;
use std::path::Path;

/// Format a document as a pretty-printed JSON string.
pub fn format_json(document: &Document) -> Result<String, String> {
    serde_json::to_string_pretty(document)
        .map_err(|error| format!("JSON serialization failed: {error}"))
}

/// Write an HTML site to `output_dir` by:
/// 1. Copying the pre-built `template/dist/` into `output_dir`
/// 2. Writing `data.json` (the JSON-formatted document)
/// 3. Writing `metadata.json`
pub fn format_html(document: &Document, output_dir: &Path, title: &str) -> Result<(), String> {
    // Locate the template/dist directory relative to the manifest
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let dist_dir = Path::new(&manifest_dir).join("template").join("dist");

    if !dist_dir.exists() {
        return Err(format!(
            "template/dist not found at {}. Run 'bun run build' inside template/ first.",
            dist_dir.display()
        ));
    }

    // Create output directory
    std::fs::create_dir_all(output_dir).map_err(|e| {
        format!(
            "Failed to create output directory {}: {e}",
            output_dir.display()
        )
    })?;

    // Copy template/dist/ into output_dir
    copy_dir_all(&dist_dir, output_dir).map_err(|e| {
        format!(
            "Failed to copy template/dist to {}: {e}",
            output_dir.display()
        )
    })?;

    // Write data.json
    let data_json = format_json(document)?;
    let data_path = output_dir.join("data.json");
    std::fs::write(&data_path, data_json)
        .map_err(|e| format!("Failed to write {}: {e}", data_path.display()))?;

    // Write metadata.json
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Metadata<'a> {
        title: &'a str,
        created_at: String,
    }

    let metadata = Metadata {
        title,
        created_at: Utc::now().to_rfc3339(),
    };
    let metadata_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Metadata JSON serialization failed: {e}"))?;
    let metadata_path = output_dir.join("metadata.json");
    std::fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write {}: {e}", metadata_path.display()))?;

    Ok(())
}

/// Recursively copy the contents of `src` into `dst`.
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dest = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &dest)?;
        } else {
            std::fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}
