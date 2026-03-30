mod common;

use common::piccali;
use predicates::prelude::*;

#[test]
fn missing_output_and_dry_run_fails_json() {
    piccali()
        .args(["--formatter", "json"])
        .assert()
        .failure()
        .stderr(predicates::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails_markdown() {
    piccali()
        .args(["--formatter", "markdown"])
        .assert()
        .failure()
        .stderr(predicates::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails() {
    piccali()
        .args(["--formatter", "markdown"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails_alias() {
    piccali()
        .args(["--formatter", "md"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn output_and_dry_run_conflict() {
    piccali()
        .args(["--formatter", "json", "--output", "out.json", "--dry-run"])
        .assert()
        .failure()
        .stderr(predicate::str::contains("cannot be used with"));
}

#[test]
fn no_matching_files_fails() {
    piccali()
        .args([
            "--formatter",
            "json",
            "--dry-run",
            "--input",
            "nonexistent/**/*.feature",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains("No feature files found"));
}
