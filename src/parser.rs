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
) -> Result<models::Feature, String> {
    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse_path(path, env)
        .map_err(|error| format!("Failed to parse {}: {error}", path.display()))?;
    Ok(convert_feature(&parsed, tag_links))
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
