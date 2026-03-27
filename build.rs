use std::path::{Path, PathBuf};
use chrono::Utc;
use gherkin::GherkinEnv;
use globset::Glob;
use serde::Serialize;
use walkdir::WalkDir;

// ---------------------------------------------------------------------------
// Models (mirrors src/models.rs)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct Document {
    features: Vec<Feature>,
}

#[derive(Debug, Serialize)]
struct Feature {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    scenarios: Vec<Scenario>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    rules: Vec<Rule>,
}

#[derive(Debug, Serialize)]
struct Rule {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    scenarios: Vec<Scenario>,
}

#[derive(Debug, Serialize)]
struct Background {
    keyword: String,
    steps: Vec<Step>,
}

#[derive(Debug, Serialize)]
struct Scenario {
    keyword: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    steps: Vec<Step>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    examples: Vec<Examples>,
}

#[derive(Debug, Serialize)]
struct Examples {
    keyword: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    table: Table,
}

#[derive(Debug, Serialize)]
struct Step {
    keyword: String,
    #[serde(rename = "type")]
    step_type: StepType,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    doc_string: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    table: Option<Table>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
enum StepType {
    Given,
    When,
    Then,
}

#[derive(Debug, Serialize)]
struct Table {
    header: Vec<String>,
    rows: Vec<Vec<String>>,
}

// ---------------------------------------------------------------------------
// Parser (mirrors src/parser.rs)
// ---------------------------------------------------------------------------

fn parse_feature_file(path: &Path) -> Result<Feature, String> {
    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse_path(path, env)
        .map_err(|e| format!("Failed to parse {}: {e}", path.display()))?;
    Ok(convert_feature(&parsed))
}

fn convert_feature(f: &gherkin::Feature) -> Feature {
    Feature {
        keyword: f.keyword.clone(),
        name: f.name.clone(),
        description: f.description.clone(),
        tags: f.tags.clone(),
        background: f.background.as_ref().map(convert_background),
        scenarios: f.scenarios.iter().map(convert_scenario).collect(),
        rules: f.rules.iter().map(convert_rule).collect(),
    }
}

fn convert_background(b: &gherkin::Background) -> Background {
    Background {
        keyword: b.keyword.clone(),
        steps: b.steps.iter().map(convert_step).collect(),
    }
}

fn convert_rule(r: &gherkin::Rule) -> Rule {
    Rule {
        keyword: r.keyword.clone(),
        name: r.name.clone(),
        description: r.description.clone(),
        tags: r.tags.clone(),
        background: r.background.as_ref().map(convert_background),
        scenarios: r.scenarios.iter().map(convert_scenario).collect(),
    }
}

fn convert_scenario(s: &gherkin::Scenario) -> Scenario {
    Scenario {
        keyword: s.keyword.clone(),
        name: s.name.clone(),
        description: s.description.clone(),
        tags: s.tags.clone(),
        steps: s.steps.iter().map(convert_step).collect(),
        examples: s.examples.iter().map(convert_examples).collect(),
    }
}

fn convert_step(s: &gherkin::Step) -> Step {
    Step {
        keyword: s.keyword.clone(),
        step_type: match s.ty {
            gherkin::StepType::Given => StepType::Given,
            gherkin::StepType::When => StepType::When,
            gherkin::StepType::Then => StepType::Then,
        },
        text: s.value.clone(),
        doc_string: s.docstring.clone(),
        table: s.table.as_ref().map(convert_table),
    }
}

fn convert_examples(e: &gherkin::Examples) -> Examples {
    let table = e.table.as_ref().map(convert_table).unwrap_or(Table {
        header: vec![],
        rows: vec![],
    });
    Examples {
        keyword: e.keyword.clone(),
        name: e.name.clone(),
        tags: e.tags.clone(),
        table,
    }
}

fn convert_table(t: &gherkin::Table) -> Table {
    let mut rows_iter = t.rows.iter();
    let header = rows_iter.next().cloned().unwrap_or_default();
    let rows: Vec<Vec<String>> = rows_iter.cloned().collect();
    Table { header, rows }
}

// ---------------------------------------------------------------------------
// File discovery (mirrors src/main.rs discover_files)
// ---------------------------------------------------------------------------

fn discover_files(glob: &Glob) -> Vec<PathBuf> {
    let matcher = glob.compile_matcher();
    let mut files = Vec::new();

    let walker = WalkDir::new(".").into_iter().filter_entry(|entry| {
        let name = entry.file_name().to_string_lossy();
        !matches!(name.as_ref(), "target" | "node_modules" | ".git")
    });

    for entry in walker.filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.into_path();
            let relative = path.strip_prefix(".").unwrap_or(&path);
            let normalized = relative.to_string_lossy().replace('\\', "/");
            if matcher.is_match(&normalized) {
                files.push(path);
            }
        }
    }

    files.sort();
    files
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata {
    title: String,
    created_at: String,
}

// ---------------------------------------------------------------------------
// Build entry point
// ---------------------------------------------------------------------------

fn main() {
    // Re-run whenever any .feature file changes
    println!("cargo:rerun-if-changed=features/");

    // Ensure the output directory exists
    std::fs::create_dir_all("template/public").expect("Failed to create template/public directory");

    // Discover all .feature files (default glob: **/*.feature)
    let glob = Glob::new("**/*.feature").expect("Invalid glob pattern");
    let feature_files = discover_files(&glob);

    if feature_files.is_empty() {
        panic!("No feature files found matching pattern: **/*.feature");
    }

    // Parse all feature files
    let mut features = Vec::new();
    for path in &feature_files {
        match parse_feature_file(path) {
            Ok(feature) => features.push(feature),
            Err(e) => panic!("{e}"),
        }
    }

    let document = Document { features };

    // Serialize to JSON
    let json = serde_json::to_string_pretty(&document).expect("JSON serialization failed");

    // Write to template/public/data.json
    std::fs::write("template/public/data.json", json)
        .expect("Failed to write template/public/data.json");

    // Build and write metadata.json
    let metadata = Metadata {
        title: "Cucumber docs".to_string(),
        created_at: Utc::now().to_rfc3339(),
    };
    let metadata_json =
        serde_json::to_string_pretty(&metadata).expect("Metadata JSON serialization failed");
    std::fs::write("template/public/metadata.json", metadata_json)
        .expect("Failed to write template/public/metadata.json");
}
