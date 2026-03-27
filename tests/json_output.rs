use assert_cmd::Command;
use predicates::prelude::*;

/// Helper to build a Command for the piccali-cli binary.
fn piccali() -> Command {
    Command::cargo_bin("piccali-cli").expect("binary not found")
}

// ---------------------------------------------------------------------------
// CLI argument validation tests
// ---------------------------------------------------------------------------

#[test]
fn missing_output_and_dry_run_fails() {
    piccali()
        .args(["--formatter", "json"])
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

#[test]
fn unimplemented_formatter_fails() {
    piccali()
        .args(["--formatter", "html", "--dry-run"])
        .assert()
        .failure()
        .stderr(predicate::str::contains("not yet implemented"));
}

// ---------------------------------------------------------------------------
// JSON output snapshot tests
// ---------------------------------------------------------------------------

#[test]
fn json_simple_feature() {
    let output = piccali()
        .args([
            "--formatter",
            "json",
            "--dry-run",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("invalid JSON output");

    insta::assert_json_snapshot!("simple_feature", json);
}

#[test]
fn json_complex_feature_with_rules_and_tags() {
    let output = piccali()
        .args([
            "--formatter",
            "json",
            "--dry-run",
            "--input",
            "features/SearchByDealer/Search.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("invalid JSON output");

    insta::assert_json_snapshot!("complex_feature_rules_tags", json);
}

#[test]
fn json_all_features_default_glob() {
    // Use the default glob which matches all .feature files
    let output = piccali()
        .args(["--formatter", "json", "--dry-run"])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("invalid JSON output");

    // Verify structure: top-level has "folders" array
    assert!(json["folders"].is_array(), "expected 'folders' array");

    let folders = json["folders"].as_array().unwrap();
    assert!(
        !folders.is_empty(),
        "expected at least one top-level folder"
    );

    // Collect all features recursively and verify there are at least 10
    fn collect_features(node: &serde_json::Value, acc: &mut Vec<serde_json::Value>) {
        if let Some(features) = node["features"].as_array() {
            acc.extend(features.iter().cloned());
        }
        if let Some(sub_folders) = node["folders"].as_array() {
            for folder in sub_folders {
                collect_features(folder, acc);
            }
        }
    }

    let mut all_features = Vec::new();
    for folder in folders {
        collect_features(folder, &mut all_features);
    }

    assert!(
        all_features.len() >= 10,
        "expected at least 10 features, got {}",
        all_features.len()
    );

    // Each feature should have a keyword and name
    for feature in &all_features {
        assert_eq!(feature["keyword"], "Feature");
        assert!(feature["name"].is_string(), "feature missing 'name' field");
    }
}

#[test]
fn json_output_is_valid_and_pretty_printed() {
    let output = piccali()
        .args([
            "--formatter",
            "json",
            "--dry-run",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success());

    let stdout = String::from_utf8(output.stdout).expect("non-UTF8 output");

    // Pretty-printed JSON should contain indentation
    assert!(stdout.contains("  "), "expected indented JSON output");
    // Should start with opening brace
    assert!(
        stdout.trim().starts_with('{'),
        "expected JSON object at top level"
    );
}
