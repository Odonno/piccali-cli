use crate::assets::FrontendAssets;
use crate::format;
use crate::models::Document;
use crate::parser::ImageRef;
use color_eyre::eyre::{eyre, Result};
use std::collections::HashMap;
use std::io::Cursor;
use std::path::PathBuf;
use std::sync::{Arc, OnceLock};
use std::thread;
use tiny_http::{Header, Response, Server};

/// Shared server state, cheaply cloneable across threads via `Arc`.
struct ServerState {
    /// Lazily-generated `data.json` payload (populated on first request).
    data_json: OnceLock<Result<String, String>>,
    /// Lazily-generated `metadata.json` payload (populated on first request).
    metadata_json: OnceLock<Result<String, String>>,
    /// The parsed document — needed to produce `data.json` on demand.
    document: Document,
    /// Page title — needed to produce `metadata.json` on demand.
    title: String,
    /// Map from `/images/{output_name}` → absolute source path on disk.
    /// Used to serve local images referenced in feature descriptions.
    images: HashMap<String, PathBuf>,
}

impl ServerState {
    fn get_data_json(&self) -> std::result::Result<&str, &str> {
        self.data_json
            .get_or_init(|| format::format_json(&self.document).map_err(|e| e.to_string()))
            .as_deref()
            .map_err(|e| e.as_str())
    }

    fn get_metadata_json(&self) -> std::result::Result<&str, &str> {
        self.metadata_json
            .get_or_init(|| format::format_metadata(&self.title).map_err(|e| e.to_string()))
            .as_deref()
            .map_err(|e| e.as_str())
    }
}

/// Start a local HTTP server on `port`, serving the embedded frontend and the
/// lazily-generated JSON data for the given `document` and `title`.
///
/// `image_refs` is the list of local images referenced in feature descriptions.
/// They are served at `/images/{output_name}` directly from disk.
///
/// Requests are handled concurrently — each incoming request is dispatched to a
/// new thread so that parallel browser requests (assets + data) never block each
/// other.
///
/// Blocks the calling thread until the process exits. Returns `Err` if the
/// server socket cannot be bound.
pub fn serve(
    port: u16,
    document: Document,
    title: String,
    image_refs: Vec<ImageRef>,
) -> Result<()> {
    let addr = format!("127.0.0.1:{port}");
    let server =
        Server::http(&addr).map_err(|e| eyre!("Failed to start HTTP server on {addr}: {e}"))?;

    let url = format!("http://{addr}");
    eprintln!("Piccali server running at {url}");
    eprintln!("Press Ctrl+C to stop.");

    // Build the images lookup map.
    let images: HashMap<String, PathBuf> = image_refs
        .into_iter()
        .map(|r| (r.output_name, r.src_path))
        .collect();

    let state = Arc::new(ServerState {
        data_json: OnceLock::new(),
        metadata_json: OnceLock::new(),
        document,
        title,
        images,
    });

    for request in server.incoming_requests() {
        let state = Arc::clone(&state);

        thread::spawn(move || {
            handle_request(request, &state);
        });
    }

    Ok(())
}

fn handle_request(request: tiny_http::Request, state: &ServerState) {
    let raw_path = request.url().to_string();
    // Strip query string / fragment
    let path = raw_path.split('?').next().unwrap_or("/");

    let (body, mime, status): (Vec<u8>, &str, u16) = if path == "/data.json" {
        match state.get_data_json() {
            Ok(json) => (json.as_bytes().to_vec(), "application/json", 200),
            Err(e) => (e.as_bytes().to_vec(), "text/plain", 500),
        }
    } else if path == "/metadata.json" {
        match state.get_metadata_json() {
            Ok(json) => (json.as_bytes().to_vec(), "application/json", 200),
            Err(e) => (e.as_bytes().to_vec(), "text/plain", 500),
        }
    } else if let Some(image_name) = path.strip_prefix("/images/") {
        // Serve a local image from disk.
        match state.images.get(image_name) {
            Some(src_path) => match std::fs::read(src_path) {
                Ok(bytes) => {
                    let mime = mime_for(image_name);
                    (bytes, mime, 200)
                }
                Err(e) => (
                    format!("Failed to read image: {e}").into_bytes(),
                    "text/plain",
                    500,
                ),
            },
            None => (b"Image not found".to_vec(), "text/plain", 404),
        }
    } else {
        // Resolve asset path: strip leading '/'
        let asset_path = if path == "/" {
            "index.html"
        } else {
            path.trim_start_matches('/')
        };

        match FrontendAssets::get(asset_path) {
            Some(file) => {
                let mime = mime_for(asset_path);
                (file.data.into_owned(), mime, 200)
            }
            None => {
                // SPA fallback: serve index.html for any unrecognised path so
                // that client-side routing works correctly.
                match FrontendAssets::get("index.html") {
                    Some(file) => (file.data.into_owned(), "text/html; charset=utf-8", 200),
                    None => (b"Not Found".to_vec(), "text/plain", 404),
                }
            }
        }
    };

    let content_type =
        Header::from_bytes("Content-Type", mime).expect("Content-Type header is always valid");

    // Force Content-Length (not Transfer-Encoding: chunked) by setting the
    // chunked threshold above any realistic response size. tiny_http defaults
    // to chunked for bodies >= 32 KB, which prevents browsers from executing
    // large JS modules served without a Content-Length.
    let response = Response::new(
        tiny_http::StatusCode(status),
        vec![content_type],
        Cursor::new(body.clone()),
        Some(body.len()),
        None,
    )
    .with_chunked_threshold(usize::MAX);

    if let Err(e) = request.respond(response) {
        eprintln!("Warning: failed to send response: {e}");
    }
}

/// Map a file extension to the appropriate MIME type.
fn mime_for(path: &str) -> &'static str {
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "application/javascript",
        "css" => "text/css",
        "json" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "eot" => "application/vnd.ms-fontobject",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}
