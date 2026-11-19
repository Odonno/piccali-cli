mod common;

use predicates::str::contains;
use std::fs;
use tempfile::TempDir;

use common::piccali;

/// Write a feature file inside `dir` and return its path.
fn feature_file(dir: &TempDir, name: &str, content: &str) -> std::path::PathBuf {
    let path = dir.path().join(name);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, content).unwrap();
    path
}

/// Run `piccali-cli check <args>` with `dir` as the working directory.
fn run_check(dir: &TempDir, args: &[&str]) -> assert_cmd::assert::Assert {
    piccali()
        .current_dir(dir.path())
        .arg("check")
        .args(args)
        .assert()
}

/// Combined stdout + stderr of an assert, as text for snapshots.
///
/// Paths are CWD-relative so snapshots stay deterministic; ANSI color codes
/// from the error report are stripped so `.snap` files stay reviewable.
fn combined_output(assert: &assert_cmd::assert::Assert) -> String {
    let output = assert.get_output();
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    format!(
        "--- stdout ---\n{}--- stderr ---\n{}",
        strip_ansi(&stdout),
        strip_ansi(&stderr)
    )
}

/// Strip SGR escape sequences (`\x1b[…m`) from color_eyre output.
fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' && chars.next() == Some('[') {
            for c in chars.by_ref() {
                if c.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// The exact file from the reported issue: `Senario` instead of `Scenario`.
const ISSUE_FILE: &str = "\
Feature: Error2

  Senario: Successful login
    Given a user \"alice\"
    Then I see the home page
";

const CLEAN_FILE: &str = "\
Feature: Warranty

  Scenario: Alert is shown
    Given a warranty is about to expire
";

const UNPARSEABLE_FILE: &str = "\
Feature: Broken

  Scenario: A
    Given a step
    INVALID_KEYWORD after a step
";

#[test]
fn issue_file_reports_misspelled_keyword_and_swallowed_steps() {
    let dir = TempDir::new().unwrap();
    feature_file(&dir, "error2.feature", ISSUE_FILE);

    let assert = run_check(&dir, &["error2.feature"]).failure().code(1);

    insta::assert_snapshot!(combined_output(&assert));
}

#[test]
fn clean_file_passes() {
    let dir = TempDir::new().unwrap();
    feature_file(&dir, "clean.feature", CLEAN_FILE);

    run_check(&dir, &["clean.feature"])
        .success()
        .stdout(contains("OK: 1 file(s) checked."));
}

#[test]
fn unparseable_file_is_reported_on_stderr() {
    let dir = TempDir::new().unwrap();
    feature_file(&dir, "broken.feature", UNPARSEABLE_FILE);

    let assert = run_check(&dir, &["broken.feature"]).failure().code(1);

    insta::assert_snapshot!(combined_output(&assert));
}

#[test]
fn all_problems_across_files_are_reported_in_one_run() {
    let dir = TempDir::new().unwrap();
    feature_file(&dir, "a/error2.feature", ISSUE_FILE);
    feature_file(&dir, "a/broken.feature", UNPARSEABLE_FILE);
    feature_file(&dir, "a/clean.feature", CLEAN_FILE);

    let assert = run_check(&dir, &["a"]).failure().code(1);

    insta::assert_snapshot!(combined_output(&assert));
}

#[test]
fn no_files_matches_error() {
    let dir = TempDir::new().unwrap();

    run_check(&dir, &["nonexistent/*.feature"])
        .failure()
        .stderr(contains("No feature files found"));
}
