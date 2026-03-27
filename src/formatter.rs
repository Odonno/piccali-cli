use crate::models::Document;

/// Format a document as a pretty-printed JSON string.
pub fn format_json(document: &Document) -> Result<String, String> {
    serde_json::to_string_pretty(document)
        .map_err(|error| format!("JSON serialization failed: {error}"))
}
