//! End-to-end: `piccali-cli lsp` speaks LSP over stdio — initialize, publish warnings
//! and parse errors as diagnostics, answer `textDocument/formatting`, shut down.

use std::io::{BufRead, BufReader, Read, Write};
use std::process::{ChildStdin, ChildStdout, Command, Stdio};

use serde_json::{Value, json};

/// One LSP message framed for stdio, sent over the child's stdin.
fn send(stdin: &mut ChildStdin, msg: &Value) {
    let body = msg.to_string();
    write!(stdin, "Content-Length: {}\r\n\r\n{}", body.len(), body).unwrap();
    stdin.flush().unwrap();
}

/// Read one framed message from the server's stdout.
fn receive(stdout: &mut BufReader<ChildStdout>) -> Value {
    let mut length = 0;
    let mut line = String::new();
    loop {
        line.clear();
        stdout.read_line(&mut line).unwrap();
        if line.trim().is_empty() {
            break;
        }
        if let Some(value) = line.strip_prefix("Content-Length: ") {
            length = value.trim().parse().unwrap();
        }
    }
    let mut body = vec![0u8; length];
    stdout.read_exact(&mut body).unwrap();
    serde_json::from_slice(&body).unwrap()
}

/// Read messages until one matches (responses and notifications interleave freely).
fn receive_until(stdout: &mut BufReader<ChildStdout>, matches: impl Fn(&Value) -> bool) -> Value {
    loop {
        let msg = receive(stdout);
        if matches(&msg) {
            return msg;
        }
    }
}

/// A request message (expects a response with the same id).
fn request(id: i64, method: &str, params: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "method": method, "params": params})
}

/// A notification message (no response).
fn notify(method: &str, params: Value) -> Value {
    json!({"jsonrpc": "2.0", "method": method, "params": params})
}

#[test]
fn lsp_diagnostics_and_formatting_over_stdio() {
    let dir = tempfile::tempdir().unwrap();
    let messy =
        "Feature: End to end\nSenario: typo\nGiven a swallowed step\nScenario: Real\nGiven ok\n";
    let uri = format!("file://{}", dir.path().join("messy.feature").display());

    let mut child = Command::new(env!("CARGO_BIN_EXE_piccali-cli"))
        .arg("lsp")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let mut stdin = child.stdin.take().unwrap();
    let mut stdout = BufReader::new(child.stdout.take().unwrap());

    send(
        &mut stdin,
        &request(1, "initialize", json!({"capabilities": {}})),
    );
    let init = receive_until(&mut stdout, |m| m["id"] == 1);
    send(&mut stdin, &notify("initialized", json!({})));
    assert!(
        init["result"]["capabilities"].is_object(),
        "initialize must return capabilities: {init}"
    );

    send(
        &mut stdin,
        &notify(
            "textDocument/didOpen",
            json!({"textDocument": {"uri": uri, "languageId": "gherkin", "version": 1, "text": messy}}),
        ),
    );
    let published = receive_until(&mut stdout, |m| {
        m["method"] == "textDocument/publishDiagnostics"
    });
    let diagnostics = published["params"]["diagnostics"].as_array().unwrap();
    assert!(
        diagnostics.len() >= 2,
        "typo + swallowed steps: {published}"
    );
    assert!(diagnostics.iter().any(|d| {
        d["message"]
            .as_str()
            .unwrap()
            .contains("did you mean 'Scenario'")
    }));
    assert!(diagnostics.iter().any(|d| {
        d["message"]
            .as_str()
            .unwrap()
            .contains("step 'Given' sits in the Feature description")
    }));

    send(
        &mut stdin,
        &request(
            2,
            "textDocument/formatting",
            json!({"textDocument": {"uri": uri}, "options": {"tabSize": 2, "insertSpaces": true}}),
        ),
    );
    let formatted = receive_until(&mut stdout, |m| m["id"] == 2);
    let edits = formatted["result"].as_array().unwrap();
    assert_eq!(edits.len(), 1, "one whole-document edit: {formatted}");
    assert_ne!(edits[0]["newText"].as_str().unwrap(), messy);
    assert!(edits[0]["newText"].as_str().unwrap().contains("Feature:"));

    send(&mut stdin, &request(3, "shutdown", json!({})));
    receive_until(&mut stdout, |m| m["id"] == 3);
    send(&mut stdin, &notify("exit", json!({})));
    drop(stdin);
    assert!(child.wait().unwrap().success());
}
