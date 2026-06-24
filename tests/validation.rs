mod common;

use common::piccali;
use predicates::prelude::*;

#[test]
fn missing_output_and_dry_run_fails_json() {
    piccali()
        .args(["--format", "json"])
        .assert()
        .failure()
        .stderr(predicates::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails_markdown() {
    piccali()
        .args(["--format", "markdown"])
        .assert()
        .failure()
        .stderr(predicates::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails() {
    piccali()
        .args(["--format", "markdown"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn missing_output_and_dry_run_fails_alias() {
    piccali()
        .args(["--format", "md"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "either --output or --dry-run must be specified",
        ));
}

#[test]
fn output_and_dry_run_conflict() {
    piccali()
        .args(["--format", "json", "--output", "out.json", "--dry-run"])
        .assert()
        .failure()
        .stderr(predicate::str::contains("cannot be used with"));
}

#[test]
fn no_matching_files_fails() {
    piccali()
        .args([
            "--format",
            "json",
            "--dry-run",
            "--input",
            "nonexistent/**/*.feature",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains("No feature files found"));
}

#[test]
fn base_url_with_json_format_fails() {
    piccali()
        .args([
            "--format",
            "json",
            "--dry-run",
            "--base-url",
            "/docs/",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--base-url is only supported with --format html",
        ));
}

#[test]
fn base_url_with_markdown_format_fails() {
    piccali()
        .args([
            "--format",
            "markdown",
            "--dry-run",
            "--base-url",
            "/docs/",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--base-url is only supported with --format html",
        ));
}

#[test]
fn base_url_without_format_fails() {
    piccali()
        .args(["--base-url", "/docs/", "--dry-run"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--base-url is only supported with --format html",
        ));
}

#[test]
fn lang_with_json_format_fails() {
    piccali()
        .args([
            "--format",
            "json",
            "--dry-run",
            "--lang",
            "fr",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--lang is only supported with --format html",
        ));
}

#[test]
fn lang_with_markdown_format_fails() {
    piccali()
        .args([
            "--format",
            "markdown",
            "--dry-run",
            "--lang",
            "fr",
        ])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--lang is only supported with --format html",
        ));
}

#[test]
fn lang_without_format_fails() {
    piccali()
        .args(["--lang", "fr", "--dry-run"])
        .assert()
        .failure()
        .stderr(predicate::str::contains(
            "--lang is only supported with --format html",
        ));
}
