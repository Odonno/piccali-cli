use color_eyre::eyre::{Result, WrapErr};
use gherkin::GherkinEnv;
use std::collections::HashMap;
use std::path::Path;

use crate::models;

/// Resolve a raw tag string into a `models::Tag`, optionally expanding a URL
/// using the provided prefix→url_template map.
///
/// For a tag `"us:DATADIGIT-123"` and entry `("us:", "https://my-docs/{id}")`,
/// the `{id}` placeholder is replaced with `"DATADIGIT-123"` (the part after
/// the prefix).
fn resolve_tag(raw: &str, tag_links: &HashMap<String, String>) -> models::Tag {
    let url = tag_links.iter().find_map(|(prefix, template)| {
        raw.strip_prefix(prefix.as_str())
            .map(|id| template.replace("{id}", id))
    });
    models::Tag {
        name: raw.to_owned(),
        url,
    }
}

fn resolve_tags(raw: &[String], tag_links: &HashMap<String, String>) -> Vec<models::Tag> {
    raw.iter().map(|t| resolve_tag(t, tag_links)).collect()
}

/// Parse a single `.feature` file and convert it to our model.
///
/// `tag_links` maps tag prefixes (e.g. `"us:"`) to URL templates
/// (e.g. `"https://my-docs/{id}"`).
pub fn parse_feature_file(
    path: &Path,
    tag_links: &HashMap<String, String>,
) -> Result<models::Feature> {
    let raw = std::fs::read_to_string(path)
        .wrap_err_with(|| format!("Could not read path: {}", path.display()))
        .wrap_err_with(|| format!("Failed to parse {}", path.display()))?;

    let preprocessed = escape_backslashes_in_table_cells(&raw);

    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse(&preprocessed, env)
        .wrap_err_with(|| format!("Could not parse feature file: {}", path.display()))
        .wrap_err_with(|| format!("Failed to parse {}", path.display()))?;
    Ok(convert_feature(&parsed, tag_links))
}

/// Pre-process raw Gherkin text to escape backslashes inside table cells that
/// are not part of a recognised Gherkin escape sequence (`\n`, `\|`, `\\`).
///
/// The Gherkin table-cell parser only recognises those three escape sequences;
/// any other `\X` causes a parse error.  Real-world feature files often contain
/// regex patterns such as `\(\d+\)` in table cells, which would otherwise fail
/// to parse.  By doubling unrecognised backslashes (`\(` → `\\(`) before
/// handing the source to the Gherkin library we preserve the intended literal
/// value while staying within the library's grammar.
fn escape_backslashes_in_table_cells(source: &str) -> String {
    let mut result = String::with_capacity(source.len());

    for line in source.split('\n') {
        let trimmed = line.trim_start();
        if trimmed.starts_with('|') {
            result.push_str(&escape_table_row(line));
        } else {
            result.push_str(line);
        }
        result.push('\n');
    }

    // Remove the trailing newline we unconditionally added if the original
    // source did not end with one.
    if !source.ends_with('\n') {
        result.pop();
    }

    result
}

/// Escape unrecognised backslash sequences inside a single table row line.
///
/// Gherkin recognises `\n`, `\|`, and `\\` as escape sequences inside table
/// cells.  Any other `\X` is left as-is by doubling the backslash so that the
/// Gherkin parser ultimately delivers the original single `\` in the cell
/// value.
fn escape_table_row(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\\' {
            match chars.peek() {
                // Recognised Gherkin escape sequences — leave unchanged.
                Some('n') | Some('|') | Some('\\') => {
                    out.push(ch);
                }
                // Any other character after `\`: double the backslash so that
                // the Gherkin parser interprets `\\` as a literal `\`.
                _ => {
                    out.push('\\');
                    out.push(ch);
                }
            }
        } else {
            out.push(ch);
        }
    }

    out
}

/// Build a nested folder tree from a list of `(path, feature)` pairs.
///
/// The path components between the working directory and the feature file
/// become the folder hierarchy. Files in the same directory are grouped
/// under the same `FolderNode`.
///
/// Example: given paths `features/A/Foo.feature` and `features/A/Bar.feature`
/// and `features/B/Baz.feature`, the result is:
/// ```
/// [ FolderNode("features", folders=[
///     FolderNode("A", features=[Foo, Bar]),
///     FolderNode("B", features=[Baz]),
/// ]) ]
/// ```
pub fn build_folder_tree(
    entries: Vec<(std::path::PathBuf, models::Feature)>,
) -> Vec<models::FolderNode> {
    // We build the tree by inserting each entry into a root vec of FolderNodes.
    let mut root: Vec<models::FolderNode> = Vec::new();

    for (path, feature) in entries {
        // Strip the leading "./" if present
        let relative = path.strip_prefix(".").unwrap_or(&path);

        // Collect path components, excluding the filename itself
        let dir_components: Vec<String> = relative
            .parent()
            .map(|p| {
                p.components()
                    .filter_map(|c| match c {
                        std::path::Component::Normal(s) => Some(s.to_string_lossy().into_owned()),
                        _ => None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Navigate / create the folder hierarchy, then push the feature
        insert_into_tree(&mut root, &dir_components, feature);
    }

    root
}

/// Recursively insert a `feature` at the location described by `path_parts`
/// within the given `nodes` vec, creating `FolderNode`s as needed.
fn insert_into_tree(
    nodes: &mut Vec<models::FolderNode>,
    path_parts: &[String],
    feature: models::Feature,
) {
    if path_parts.is_empty() {
        // Features with no parent directory go into a synthetic root folder
        // named "" — callers should handle this case if desired.
        // For now, push to the last node or create an anonymous one.
        if let Some(node) = nodes.last_mut() {
            node.features.push(feature);
        } else {
            nodes.push(models::FolderNode {
                name: String::new(),
                folders: Vec::new(),
                features: vec![feature],
            });
        }
        return;
    }

    let folder_name = &path_parts[0];
    let rest = &path_parts[1..];

    // Find or create the folder node at this level
    let idx = nodes.iter().position(|n| &n.name == folder_name);
    let idx = match idx {
        Some(i) => i,
        None => {
            nodes.push(models::FolderNode {
                name: folder_name.clone(),
                folders: Vec::new(),
                features: Vec::new(),
            });
            nodes.len() - 1
        }
    };

    if rest.is_empty() {
        // Leaf: place the feature directly in this folder
        nodes[idx].features.push(feature);
    } else {
        // Recurse into sub-folders
        let sub = &mut nodes[idx].folders;
        insert_into_tree(sub, rest, feature);
    }
}

fn convert_feature(
    feature: &gherkin::Feature,
    tag_links: &HashMap<String, String>,
) -> models::Feature {
    models::Feature {
        keyword: feature.keyword.clone(),
        name: feature.name.clone(),
        description: feature.description.clone(),
        tags: resolve_tags(&feature.tags, tag_links),
        background: feature.background.as_ref().map(convert_background),
        scenarios: feature
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
        rules: feature
            .rules
            .iter()
            .map(|r| convert_rule(r, tag_links))
            .collect(),
    }
}

fn convert_background(background: &gherkin::Background) -> models::Background {
    models::Background {
        keyword: background.keyword.clone(),
        steps: background.steps.iter().map(convert_step).collect(),
    }
}

fn convert_rule(rule: &gherkin::Rule, tag_links: &HashMap<String, String>) -> models::Rule {
    models::Rule {
        keyword: rule.keyword.clone(),
        name: rule.name.clone(),
        description: rule.description.clone(),
        tags: resolve_tags(&rule.tags, tag_links),
        background: rule.background.as_ref().map(convert_background),
        scenarios: rule
            .scenarios
            .iter()
            .map(|s| convert_scenario(s, tag_links))
            .collect(),
    }
}

fn convert_scenario(
    scenario: &gherkin::Scenario,
    tag_links: &HashMap<String, String>,
) -> models::Scenario {
    models::Scenario {
        keyword: scenario.keyword.clone(),
        name: scenario.name.clone(),
        description: scenario.description.clone(),
        tags: resolve_tags(&scenario.tags, tag_links),
        steps: scenario.steps.iter().map(convert_step).collect(),
        examples: scenario
            .examples
            .iter()
            .map(|e| convert_examples(e, tag_links))
            .collect(),
    }
}

fn convert_step(step: &gherkin::Step) -> models::Step {
    models::Step {
        keyword: step.keyword.clone(),
        step_type: convert_step_type(step.ty),
        text: step.value.clone(),
        doc_string: step.docstring.clone(),
        table: step.table.as_ref().map(convert_table),
    }
}

fn convert_step_type(step_type: gherkin::StepType) -> models::StepType {
    match step_type {
        gherkin::StepType::Given => models::StepType::Given,
        gherkin::StepType::When => models::StepType::When,
        gherkin::StepType::Then => models::StepType::Then,
    }
}

fn convert_examples(
    examples: &gherkin::Examples,
    tag_links: &HashMap<String, String>,
) -> models::Examples {
    let table = examples
        .table
        .as_ref()
        .map(convert_table)
        .unwrap_or_else(|| models::Table {
            header: vec![],
            rows: vec![],
        });
    models::Examples {
        keyword: examples.keyword.clone(),
        name: examples.name.clone(),
        tags: resolve_tags(&examples.tags, tag_links),
        table,
    }
}

fn convert_table(table: &gherkin::Table) -> models::Table {
    let mut rows_iter = table.rows.iter();
    let header = rows_iter.next().cloned().unwrap_or_default();
    let rows: Vec<Vec<String>> = rows_iter.cloned().collect();
    models::Table { header, rows }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    // --- helpers ---

    /// Write Gherkin content to a temporary `.feature` file and return it.
    fn write_feature(content: &str) -> NamedTempFile {
        let mut tmp = NamedTempFile::with_suffix(".feature").unwrap();
        write!(tmp, "{content}").unwrap();
        tmp
    }

    /// Collect the full eyre error chain as a `Vec<String>`.
    fn error_chain(err: &color_eyre::eyre::Error) -> Vec<String> {
        err.chain().map(|c| c.to_string()).collect()
    }

    // --- parse_feature_file: success cases ---

    #[test]
    fn parse_valid_feature_file_succeeds() {
        let tmp = write_feature(
            "Feature: Warranty alert\n\
             \n\
               Scenario: Alert is shown\n\
             \n\
                 Given a warranty is about to expire\n\
             \n\
                 Then an alert is displayed\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Warranty alert",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Alert is shown",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "a warranty is about to expire"
                },
                {
                  "keyword": "Then ",
                  "type": "Then",
                  "text": "an alert is displayed"
                }
              ]
            }
          ]
        }
        "#);
    }

    #[test]
    fn parse_feature_file_with_tag_links_resolves_url() {
        let tmp = write_feature(
            "@us:TICKET-42\n\
             Feature: Tagged feature\n\
             \n\
               Scenario: A scenario\n\
             \n\
                 Given something\n",
        );

        let mut tag_links = HashMap::new();
        tag_links.insert(
            "us:".to_string(),
            "https://tracker.example.com/browse/{id}".to_string(),
        );

        let feature = parse_feature_file(tmp.path(), &tag_links).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Tagged feature",
          "tags": [
            {
              "name": "us:TICKET-42",
              "url": "https://tracker.example.com/browse/TICKET-42"
            }
          ],
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "A scenario",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "something"
                }
              ]
            }
          ]
        }
        "#);
    }

    // --- parse_feature_file: regex text ---

    #[test]
    fn parse_feature_file_with_regex_in_step_text_succeeds() {
        let tmp = write_feature(
            "Feature: Regex in step text\n\
             \n\
               Scenario: Validate with regex\n\
             \n\
                 Given a field matching pattern \"\\(\\d+\\)\"\n\
                 When I validate input \"(123)\"\n\
                 Then the value matches regex \"^\\d{3}$\"\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Regex in step text",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Validate with regex",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "a field matching pattern \"\\(\\d+\\)\""
                },
                {
                  "keyword": "When ",
                  "type": "When",
                  "text": "I validate input \"(123)\""
                },
                {
                  "keyword": "Then ",
                  "type": "Then",
                  "text": "the value matches regex \"^\\d{3}$\""
                }
              ]
            }
          ]
        }
        "#);
    }

    #[test]
    fn parse_feature_file_with_regex_in_table_cell_succeeds() {
        let tmp = write_feature(
            "Feature: Regex in table\n\
             \n\
               Scenario: Validate patterns from table\n\
             \n\
                 Given the following patterns:\n\
                   | pattern    | valid  |\n\
                   | \\(\\d+\\) | true   |\n\
                   | ^\\d{3}$   | false  |\n",
        );

        let feature = parse_feature_file(tmp.path(), &HashMap::new()).unwrap();

        insta::assert_json_snapshot!(feature, @r#"
        {
          "keyword": "Feature",
          "name": "Regex in table",
          "scenarios": [
            {
              "keyword": "Scenario",
              "name": "Validate patterns from table",
              "steps": [
                {
                  "keyword": "Given ",
                  "type": "Given",
                  "text": "the following patterns:",
                  "table": {
                    "header": [
                      "pattern",
                      "valid"
                    ],
                    "rows": [
                      [
                        "\\(\\d+\\)",
                        "true"
                      ],
                      [
                        "^\\d{3}$",
                        "false"
                      ]
                    ]
                  }
                }
              ]
            }
          ]
        }
        "#);
    }

    // --- parse_feature_file: error cases ---

    #[test]
    fn parse_missing_feature_file_returns_error() {
        let path = std::path::Path::new("nonexistent_path/does_not_exist.feature");
        let err = parse_feature_file(path, &HashMap::new()).unwrap_err();
        let chain = error_chain(&err);

        // Top-level context wraps the gherkin error with our path message
        insta::assert_snapshot!(chain[0], @"Failed to parse nonexistent_path/does_not_exist.feature");

        // Gherkin surface error
        insta::assert_snapshot!(chain[1], @"Could not read path: nonexistent_path/does_not_exist.feature");

        // Root cause: OS error
        insta::assert_snapshot!(chain[2], @"No such file or directory (os error 2)");
    }

    #[test]
    fn parse_invalid_gherkin_reports_line_and_column() {
        // The invalid keyword starts at line 4, column 5 (4 spaces of indent).
        // gherkin's ParseError records the exact position where parsing failed.
        let tmp = write_feature(
            "Feature: Broken feature\n\
               Scenario: A scenario\n\
                 Given a valid step\n\
                 INVALID_KEYWORD this line causes a parse error\n",
        );

        let err = parse_feature_file(tmp.path(), &HashMap::new()).unwrap_err();
        let chain = error_chain(&err);

        // Top-level context — redact the non-deterministic temp path
        let path_str = tmp.path().display().to_string();
        let top = chain[0].replace(&path_str, "[PATH]");
        insta::assert_snapshot!(top, @"Failed to parse [PATH]");

        // Gherkin's own surface error — path also varies
        let mid = chain[1].replace(&path_str, "[PATH]");
        insta::assert_snapshot!(mid, @"Could not parse feature file: [PATH]");

        // ParseError with line/column — stable, no path involved
        insta::assert_snapshot!(chain[2], @r#"Error at 4:18: {"unknown keyword"}"#);
    }
}
