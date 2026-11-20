//! `piccali-cli lsp` — Language Server Protocol server over stdio, for editor integration
//! (Zed's `zed-piccali` extension launches this binary).
//!
//! Diagnostics: the `check` lint on the open buffer — warnings for silently-swallowed Gherkin mistakes, a single error when the text does not parse.
//! Published on open, change (full sync) and save, cleared on close.
//! Formatting: the `format` engine on the in-memory text; style comes from the file's `.editorconfig`, exactly as on the command line.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tower_lsp::jsonrpc::Result as JsonRpcResult;
use tower_lsp::lsp_types::{
    Diagnostic, DiagnosticSeverity, DidChangeTextDocumentParams, DidCloseTextDocumentParams,
    DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentFormattingParams,
    InitializeParams, InitializeResult, InitializedParams, OneOf, Position, Range,
    ServerCapabilities, TextDocumentSyncCapability, TextDocumentSyncKind, TextEdit, Url,
};
use tower_lsp::{Client, LanguageServer, LspService, Server};

use crate::{check, fmt};

/// Entry point for the `lsp` subcommand: serve LSP over stdin/stdout until shutdown.
pub fn run() -> color_eyre::Result<()> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    runtime.block_on(async {
        let (service, socket) = LspService::new(|client| Backend {
            client,
            documents: Mutex::new(HashMap::new()),
        });
        let stdin = tokio::io::stdin();
        let stdout = tokio::io::stdout();
        Server::new(stdin, stdout, socket).serve(service).await;
    });
    Ok(())
}

struct Backend {
    client: Client,
    /// Full-document text per open buffer (sync kind FULL: the client sends the whole text).
    documents: Mutex<HashMap<Url, String>>,
}

impl Backend {
    fn text_of(&self, uri: &Url) -> Option<String> {
        self.documents.lock().unwrap().get(uri).cloned()
    }

    async fn publish_diagnostics_for(&self, uri: &Url) {
        if let Some(text) = self.text_of(uri) {
            let diagnostics = diagnostics_for(&text, &buffer_path(uri));
            self.client
                .publish_diagnostics(uri.clone(), diagnostics, None)
                .await;
        }
    }
}

#[tower_lsp::async_trait]
impl LanguageServer for Backend {
    async fn initialize(&self, _params: InitializeParams) -> JsonRpcResult<InitializeResult> {
        Ok(InitializeResult {
            server_info: None,
            capabilities: ServerCapabilities {
                text_document_sync: Some(TextDocumentSyncCapability::Kind(
                    TextDocumentSyncKind::FULL,
                )),
                document_formatting_provider: Some(OneOf::Left(true)),
                ..ServerCapabilities::default()
            },
        })
    }

    async fn initialized(&self, _params: InitializedParams) {}

    async fn did_open(&self, params: DidOpenTextDocumentParams) {
        let uri = params.text_document.uri;
        self.documents.lock().unwrap().insert(
            uri.clone(),
            strip_bom(&params.text_document.text).to_string(),
        );
        self.publish_diagnostics_for(&uri).await;
    }

    async fn did_change(&self, params: DidChangeTextDocumentParams) {
        // FULL sync: the last content change carries the whole document.
        if let Some(change) = params.content_changes.into_iter().next_back() {
            let uri = params.text_document.uri;
            self.documents
                .lock()
                .unwrap()
                .insert(uri.clone(), strip_bom(&change.text).to_string());
            self.publish_diagnostics_for(&uri).await;
        }
    }

    async fn did_save(&self, params: DidSaveTextDocumentParams) {
        self.publish_diagnostics_for(&params.text_document.uri)
            .await;
    }

    async fn did_close(&self, params: DidCloseTextDocumentParams) {
        let uri = params.text_document.uri;
        self.documents.lock().unwrap().remove(&uri);
        self.client.publish_diagnostics(uri, Vec::new(), None).await;
    }

    async fn formatting(
        &self,
        params: DocumentFormattingParams,
    ) -> JsonRpcResult<Option<Vec<TextEdit>>> {
        let uri = params.text_document.uri;
        let Some(text) = self.text_of(&uri) else {
            return Ok(None);
        };
        // Unparseable buffers format to None; their error diagnostic already says why.
        Ok(fmt::format_buffer(&text, &buffer_path(&uri))
            .ok()
            .and_then(|new| {
                (new != text).then(|| {
                    vec![TextEdit {
                        range: whole_document(&text),
                        new_text: new,
                    }]
                })
            }))
    }

    async fn shutdown(&self) -> JsonRpcResult<()> {
        Ok(())
    }
}

/// The buffer's filesystem path, for `.editorconfig` lookup and lint messages.
/// Non-file buffers fall back to a bare name, which resolves to the house style.
fn buffer_path(uri: &Url) -> PathBuf {
    uri.to_file_path()
        .unwrap_or_else(|_| PathBuf::from("buffer.feature"))
}

/// Editors send the buffer with its BOM; the parsers expect it stripped,
/// like every CLI entry point (`check`, `format --stdin-file-path`).
fn strip_bom(text: &str) -> &str {
    text.strip_prefix('\u{FEFF}').unwrap_or(text)
}

/// Lint one buffer: `check` findings as warnings, a parse failure as one error.
fn diagnostics_for(text: &str, path: &Path) -> Vec<Diagnostic> {
    match check::lint_text(text, path) {
        Ok(findings) => findings
            .into_iter()
            .map(|(line, message)| {
                let index = line.saturating_sub(1) as u32;
                let width = text
                    .lines()
                    .nth(index as usize)
                    .map(|l| l.encode_utf16().count() as u32)
                    .unwrap_or(0);
                Diagnostic {
                    range: Range::new(Position::new(index, 0), Position::new(index, width)),
                    severity: Some(DiagnosticSeverity::WARNING),
                    source: Some("piccali".to_string()),
                    message,
                    ..Diagnostic::default()
                }
            })
            .collect(),
        Err(err) => vec![Diagnostic {
            range: Range::default(),
            severity: Some(DiagnosticSeverity::ERROR),
            source: Some("piccali".to_string()),
            // Root cause only: gherkin's own "Error at line:col" message.
            message: err.root_cause().to_string(),
            ..Diagnostic::default()
        }],
    }
}

/// Range spanning the entire document: start 0:0 to the position after the last line.
fn whole_document(text: &str) -> Range {
    Range::new(
        Position::new(0, 0),
        Position::new(text.lines().count() as u32, 0),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn diagnostics(text: &str) -> Vec<Diagnostic> {
        diagnostics_for(text, Path::new("buffer.feature"))
    }

    #[test]
    fn typo_and_swallowed_step_are_warnings_at_their_line() {
        let diags = diagnostics("Feature: F\n\n  Senario: Swallowed\n    Given a step\n");
        assert_eq!(diags.len(), 2, "{diags:?}");
        assert_eq!(diags[0].range.start.line, 2);
        assert!(diags[0].message.contains("did you mean 'Scenario'"));
        assert!(diags[1].message.contains("step 'Given'"));
        assert_eq!(diags[0].severity, Some(DiagnosticSeverity::WARNING));
    }

    #[test]
    fn clean_feature_has_no_diagnostics() {
        assert!(diagnostics("Feature: F\n\n  Scenario: S\n    Given a step\n").is_empty());
    }

    #[test]
    fn bom_prefixed_buffer_lints_like_the_cli_paths() {
        // did_open/did_change strip the BOM before storing; lint sees clean text.
        let text = "\u{FEFF}Feature: F\n\n  Scenario: S\n    Given a step\n";
        assert!(diagnostics_for(strip_bom(text), Path::new("buffer.feature")).is_empty());
    }

    #[test]
    fn unparseable_text_is_one_error() {
        let diags = diagnostics("Feature: F\n  Scenario: S\n    Given ok\n    INVALID_KEYWORD\n");
        assert_eq!(diags.len(), 1, "{diags:?}");
        assert_eq!(diags[0].severity, Some(DiagnosticSeverity::ERROR));
        assert!(diags[0].message.contains("Error at"), "{diags:?}");
    }
}
