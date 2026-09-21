mod common;

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

/// Run `piccali-cli fix <args>` with `dir` as the working directory.
fn run_fix(dir: &TempDir, args: &[&str]) -> assert_cmd::assert::Assert {
    piccali()
        .current_dir(dir.path())
        .arg("fix")
        .args(args)
        .assert()
}

const WITH_EXAMPLES: &str = "\
Feature: Warranty

  Scenario: Alert is shown
    Given a warranty is about to expire for <vin>

    Examples:
      | vin |
      | ABC |

  Rule: Alerts

    Scenario: In rule with data
      Given an alert for <level>

      Examples:
        | level |
        | low   |
";

const OUTLINE_WITHOUT_EXAMPLES: &str = "\
Feature: Warranty

  Scenario Outline: Alert is shown
    Given a warranty is about to expire

  Scenario Outline: Another one
    Given nothing happens
";

#[test]
fn scenario_with_examples_becomes_scenario_outline() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(&dir, "warranty.feature", WITH_EXAMPLES);

    run_fix(&dir, &["warranty.feature"]).success();

    insta::assert_snapshot!(fs::read_to_string(&path).unwrap());
}

#[test]
fn outline_without_examples_becomes_scenario() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(&dir, "warranty.feature", OUTLINE_WITHOUT_EXAMPLES);

    run_fix(&dir, &["warranty.feature"]).success();

    insta::assert_snapshot!(fs::read_to_string(&path).unwrap());
}

#[test]
fn correct_keywords_are_left_alone() {
    let dir = TempDir::new().unwrap();
    let original = "\
Feature: Correct

  Scenario: Plain
    Given nothing

  Scenario Outline: With data
    Given a <vin>

    Examples:
      | vin |
      | ABC |

  Scenario Template: Alias with data
    Given a <vin>

    Examples:
      | vin |
      | ABC |
";
    let path = feature_file(&dir, "correct.feature", original);

    run_fix(&dir, &["correct.feature"]).success();

    assert_eq!(fs::read_to_string(&path).unwrap(), original);
}

#[test]
fn french_dialect_keywords_are_fixed_in_french() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(
        &dir,
        "fume.feature",
        "\
# language: fr
Fonctionnalité: Fumée

  Scénario: Avec exemples
    Soit une <valeur>

    Exemples:
      | valeur |
      | 1      |

  Plan du scénario: Sans exemples
    Soit rien
",
    );

    run_fix(&dir, &["fume.feature"]).success();

    insta::assert_snapshot!(fs::read_to_string(&path).unwrap());
}

#[test]
fn dry_run_reports_but_writes_nothing() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(&dir, "warranty.feature", WITH_EXAMPLES);

    let assert = run_fix(&dir, &["warranty.feature", "--dry-run"]).success();

    // Report is deterministic (paths are CWD-relative).
    insta::assert_snapshot!(String::from_utf8_lossy(&assert.get_output().stdout));
    // Nothing written.
    assert_eq!(fs::read_to_string(&path).unwrap(), WITH_EXAMPLES);
}

#[test]
fn broken_file_blocks_all_fixes() {
    let dir = TempDir::new().unwrap();
    let good = feature_file(&dir, "good.feature", WITH_EXAMPLES);
    // Inconsistent table row sizes → parse error.
    feature_file(
        &dir,
        "bad.feature",
        "\
Feature: Broken
  Scenario: x
    Given a table:
      | a | b |
      | 1 |
",
    );

    run_fix(&dir, &[])
        .failure()
        .stderr(predicates::str::contains("bad.feature"))
        .stderr(predicates::str::contains("nothing was modified"));

    // All-or-nothing: the good file must be untouched.
    assert_eq!(fs::read_to_string(&good).unwrap(), WITH_EXAMPLES);
}

#[test]
fn directory_argument_is_expanded() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(&dir, "features/nested/warranty.feature", WITH_EXAMPLES);

    run_fix(&dir, &["features"]).success();

    insta::assert_snapshot!(fs::read_to_string(&path).unwrap());
}

#[test]
fn no_arguments_uses_default_glob() {
    let dir = TempDir::new().unwrap();
    let path = feature_file(&dir, "warranty.feature", OUTLINE_WITHOUT_EXAMPLES);

    run_fix(&dir, &[]).success();

    insta::assert_snapshot!(fs::read_to_string(&path).unwrap());
}
