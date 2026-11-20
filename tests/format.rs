mod common;

use std::fs;
use tempfile::TempDir;

use common::piccali;

/// Write a file inside `dir` and return its path.
fn file(dir: &TempDir, name: &str, content: &str) -> std::path::PathBuf {
    let path = dir.path().join(name);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, content).unwrap();
    path
}

/// Run `piccali-cli format <args>` with `dir` as the working directory.
fn run_format(dir: &TempDir, args: &[&str]) -> assert_cmd::assert::Assert {
    piccali()
        .current_dir(dir.path())
        .arg("format")
        .args(args)
        .assert()
}

const MESSY: &str = "\
Feature: Warranty

  Scenario: Alert is shown
      Given a warranty is about to expire
          | state    | days |
         | critical | 3 |
    When I am on the main page
    Then an alert is displayed

      Scenario: No alert
        Given no unconfigured warranties
";

#[test]
fn readonly_prints_diff_and_exits_nonzero_without_writing() {
    let dir = TempDir::new().unwrap();
    let path = file(&dir, "warranty.feature", MESSY);

    run_format(&dir, &["warranty.feature"])
        .failure()
        .stdout(predicates::str::contains("--- ./warranty.feature"))
        .stdout(predicates::str::contains("-      Given a warranty"))
        .stdout(predicates::str::contains("+    Given a warranty"));

    // Readonly: nothing was written.
    assert_eq!(fs::read_to_string(&path).unwrap(), MESSY);
}

#[test]
fn already_formatted_file_passes() {
    let dir = TempDir::new().unwrap();
    file(
        &dir,
        "clean.feature",
        "\
Feature: Clean

  Scenario: Aligned
    Given a table
      | state    | days |
      | critical |    3 |
",
    );

    run_format(&dir, &["clean.feature"])
        .success()
        .stdout(predicates::str::contains("1 file(s) are already formatted"));
}

#[test]
fn fix_rewrites_file_and_second_run_is_clean() {
    let dir = TempDir::new().unwrap();
    file(&dir, "warranty.feature", MESSY);

    run_format(&dir, &["warranty.feature", "--fix"])
        .success()
        .stdout(predicates::str::contains("Reformatted 1 of 1 file(s)"));

    insta::assert_snapshot!(fs::read_to_string(dir.path().join("warranty.feature")).unwrap());

    // Idempotent: the formatted file passes a readonly run.
    run_format(&dir, &["warranty.feature"])
        .success()
        .stdout(predicates::str::contains("already formatted"));
}

#[test]
fn write_alias_applies_changes() {
    let dir = TempDir::new().unwrap();
    file(&dir, "warranty.feature", MESSY);

    run_format(&dir, &["warranty.feature", "--write"])
        .success()
        .stdout(predicates::str::contains("Reformatted 1 of 1 file(s)"));
}

#[test]
fn parse_failure_blocks_every_file() {
    let dir = TempDir::new().unwrap();
    let good = file(&dir, "good.feature", MESSY);

    // An unknown keyword inside a scenario is a hard parse error (the same line under `Feature:` would just be description text).
    file(
        &dir,
        "bad.feature",
        "Feature: Broken\n\n  Scenario: A\n    Given valid\n    INVALID this fails\n",
    );

    run_format(&dir, &["good.feature", "bad.feature", "--fix"])
        .failure()
        .stderr(predicates::str::contains(
            "could not be parsed; nothing was modified",
        ));

    // Transactional: the parseable file was left untouched.
    assert_eq!(fs::read_to_string(&good).unwrap(), MESSY);
}

#[test]
fn editorconfig_indent_size_is_honored() {
    let dir = TempDir::new().unwrap();
    file(
        &dir,
        ".editorconfig",
        "[*.feature]\nindent_style = space\nindent_size = 4\n",
    );
    file(&dir, "warranty.feature", MESSY);

    run_format(&dir, &["warranty.feature", "--fix"]).success();

    insta::assert_snapshot!(fs::read_to_string(dir.path().join("warranty.feature")).unwrap());
}

#[test]
fn editorconfig_numeric_alignment_can_be_disabled() {
    let dir = TempDir::new().unwrap();
    file(
        &dir,
        ".editorconfig",
        "[*.feature]\npiccali_table_cell_right_align_numeric_content = false\n",
    );
    file(
        &dir,
        "table.feature",
        "Feature: Table\n\n  Scenario: Numbers\n    Given days\n      | state    | days |\n      | critical | 3    |\n",
    );

    run_format(&dir, &["table.feature", "--fix"]).success();

    // With right-alignment off, a formatted file keeps `3` left-aligned.
    assert!(
        fs::read_to_string(dir.path().join("table.feature"))
            .unwrap()
            .contains("| critical | 3    |")
    );
}
