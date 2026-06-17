mod common;

use common::piccali;

// ---------------------------------------------------------------------------
// Markdown dry-run snapshot tests
// ---------------------------------------------------------------------------

#[test]
fn markdown_dry_run_simple_feature() {
    let output = piccali()
        .args([
            "--format",
            "markdown",
            "--dry-run",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let stdout = String::from_utf8(output.stdout).expect("non-UTF8 output");
    insta::assert_snapshot!("dry_run_simple_feature", stdout);
}

#[test]
fn markdown_dry_run_complex_feature_with_rules_and_tags() {
    let output = piccali()
        .args([
            "--format",
            "markdown",
            "--dry-run",
            "--input",
            "features/SearchByDealer/Search.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let stdout = String::from_utf8(output.stdout).expect("non-UTF8 output");
    insta::assert_snapshot!("dry_run_complex_feature_rules_tags", stdout);
}

#[test]
fn markdown_dry_run_multiple_features_separated_by_divider() {
    let output = piccali()
        .args([
            "--format",
            "markdown",
            "--dry-run",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .output()
        .expect("failed to execute");

    assert!(output.status.success(), "command failed: {:?}", output);

    let stdout = String::from_utf8(output.stdout).expect("non-UTF8 output");

    // Output should start with a H1 heading
    assert!(
        stdout.trim_start().starts_with("# "),
        "expected H1 heading at the top of dry-run output"
    );
}

// ---------------------------------------------------------------------------
// Markdown file output snapshot tests
// ---------------------------------------------------------------------------

#[test]
fn markdown_simple_feature() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    // The file should be at <output>/features/WarrantyAlert/<slug>.md
    let md_path = output_dir
        .path()
        .join("features/WarrantyAlert/unconfigured-warranty-alert.md");

    assert!(md_path.exists(), "expected markdown file at {md_path:?}");

    let content = std::fs::read_to_string(&md_path).expect("failed to read markdown file");
    insta::assert_snapshot!("simple_feature", content);
}

#[test]
fn markdown_complex_feature_with_rules_and_tags() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--input",
            "features/SearchByDealer/Search.feature",
        ])
        .assert()
        .success();

    let md_path = output_dir
        .path()
        .join("features/SearchByDealer/search-by-dealer-name.md");

    assert!(md_path.exists(), "expected markdown file at {md_path:?}");

    let content = std::fs::read_to_string(&md_path).expect("failed to read markdown file");
    insta::assert_snapshot!("complex_feature_rules_tags", content);
}

#[test]
fn markdown_complex_feature_with_multi_tags() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--input",
            "features/SearchByDriver/DateOfBirth.feature",
        ])
        .assert()
        .success();

    // Find the generated .md file
    let md_dir = output_dir.path().join("features/SearchByDriver");
    let mut md_files: Vec<_> = std::fs::read_dir(&md_dir)
        .expect("failed to read output dir")
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "md"))
        .collect();

    assert_eq!(md_files.len(), 1, "expected exactly one .md file");

    let content =
        std::fs::read_to_string(md_files.pop().unwrap().path()).expect("failed to read markdown");
    insta::assert_snapshot!("complex_feature_multi_tags", content);
}

#[test]
fn markdown_all_features_creates_files_per_feature() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_dir.path().to_str().unwrap(),
        ])
        .assert()
        .success();

    // Collect all generated .md files recursively
    let mut md_files = Vec::new();
    collect_md_files(output_dir.path(), &mut md_files);

    assert!(
        md_files.len() >= 10,
        "expected at least 10 markdown files, got {}",
        md_files.len()
    );

    // Each file should start with a H1 heading
    for path in &md_files {
        let content = std::fs::read_to_string(path).expect("failed to read file");
        assert!(
            content.trim_start().starts_with("# "),
            "expected H1 heading at top of {path:?}"
        );
    }
}

// ---------------------------------------------------------------------------
// Markdown single-file output tests
// ---------------------------------------------------------------------------

#[test]
fn markdown_single_file_txt_extension() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");
    let output_file = output_dir.path().join("llms.txt");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_file.to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    assert!(
        output_file.exists(),
        "expected single file at {output_file:?}"
    );
    assert!(
        output_file.is_file(),
        "output should be a file, not a directory"
    );

    let content = std::fs::read_to_string(&output_file).expect("failed to read file");
    assert!(
        content.trim_start().starts_with("# "),
        "expected H1 at top of single-file output"
    );
}

#[test]
fn markdown_single_file_with_title() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");
    let output_file = output_dir.path().join("llms.txt");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_file.to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
            "--title",
            "My App",
        ])
        .assert()
        .success();

    assert!(
        output_file.exists(),
        "expected single file at {output_file:?}"
    );

    let content = std::fs::read_to_string(&output_file).expect("failed to read file");
    assert!(
        content.starts_with("# My App\n"),
        "expected file to start with '# My App\\n', got: {:?}",
        &content[..content.len().min(50)]
    );
}

#[test]
fn markdown_single_file_default_title_when_not_specified() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");
    let output_file = output_dir.path().join("output.md");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_file.to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    let content = std::fs::read_to_string(&output_file).expect("failed to read file");
    assert!(
        content.starts_with("# Cucumber docs\n"),
        "expected default title 'Cucumber docs', got: {:?}",
        &content[..content.len().min(50)]
    );
}

#[test]
fn markdown_single_file_snapshot() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");
    let output_file = output_dir.path().join("output.md");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_file.to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
            "--title",
            "Warranty Alert Docs",
        ])
        .assert()
        .success();

    let content = std::fs::read_to_string(&output_file).expect("failed to read file");
    insta::assert_snapshot!("single_file_simple_feature", content);
}

#[test]
fn markdown_single_file_all_features_concatenated() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");
    let output_file = output_dir.path().join("llms.txt");

    piccali()
        .args([
            "--format",
            "markdown",
            "--output",
            output_file.to_str().unwrap(),
            "--title",
            "All Features",
        ])
        .assert()
        .success();

    assert!(output_file.is_file(), "output should be a single file");

    let content = std::fs::read_to_string(&output_file).expect("failed to read file");
    insta::assert_snapshot!("single_file_all_features_concatenated", content);
}

fn collect_md_files(dir: &std::path::Path, acc: &mut Vec<std::path::PathBuf>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_dir() {
                collect_md_files(&path, acc);
            } else if path.extension().is_some_and(|ext| ext == "md") {
                acc.push(path);
            }
        }
    }
}
