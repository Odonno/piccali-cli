mod common;

use common::piccali;

#[test]
fn html_base_url_injected_in_index() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "html",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--base-url",
            "/docs/",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    let index_html = std::fs::read_to_string(output_dir.path().join("index.html"))
        .expect("index.html not found");

    assert!(
        index_html.contains("<base href=\"/docs/\" />"),
        "expected <base href=\"/docs/\" /> in index.html, got:\n{index_html}"
    );
}

#[test]
fn html_lang_injected_in_index() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "html",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--lang",
            "fr",
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    let index_html = std::fs::read_to_string(output_dir.path().join("index.html"))
        .expect("index.html not found");

    assert!(
        index_html.contains("lang=\"fr\""),
        "expected lang=\"fr\" in index.html, got:\n{index_html}"
    );
}

#[test]
fn html_without_lang_has_default_en() {
    let output_dir = tempfile::tempdir().expect("failed to create temp dir");

    piccali()
        .args([
            "--format",
            "html",
            "--output",
            output_dir.path().to_str().unwrap(),
            "--input",
            "features/WarrantyAlert/*.feature",
        ])
        .assert()
        .success();

    let index_html = std::fs::read_to_string(output_dir.path().join("index.html"))
        .expect("index.html not found");

    assert!(
        index_html.contains("lang=\"en\""),
        "expected default lang=\"en\" in index.html without --lang"
    );
}
