use std::path::Path;
use gherkin::GherkinEnv;

use crate::models;

/// Parse a single `.feature` file and convert it to our model.
pub fn parse_feature_file(path: &Path) -> Result<models::Feature, String> {
    let env = GherkinEnv::default();
    let parsed = gherkin::Feature::parse_path(path, env)
        .map_err(|error| format!("Failed to parse {}: {error}", path.display()))?;
    Ok(convert_feature(&parsed))
}

fn convert_feature(feature: &gherkin::Feature) -> models::Feature {
    models::Feature {
        keyword: feature.keyword.clone(),
        name: feature.name.clone(),
        description: feature.description.clone(),
        tags: feature.tags.clone(),
        background: feature.background.as_ref().map(convert_background),
        scenarios: feature.scenarios.iter().map(convert_scenario).collect(),
        rules: feature.rules.iter().map(convert_rule).collect(),
    }
}

fn convert_background(background: &gherkin::Background) -> models::Background {
    models::Background {
        keyword: background.keyword.clone(),
        steps: background.steps.iter().map(convert_step).collect(),
    }
}

fn convert_rule(rule: &gherkin::Rule) -> models::Rule {
    models::Rule {
        keyword: rule.keyword.clone(),
        name: rule.name.clone(),
        description: rule.description.clone(),
        tags: rule.tags.clone(),
        background: rule.background.as_ref().map(convert_background),
        scenarios: rule.scenarios.iter().map(convert_scenario).collect(),
    }
}

fn convert_scenario(scenario: &gherkin::Scenario) -> models::Scenario {
    models::Scenario {
        keyword: scenario.keyword.clone(),
        name: scenario.name.clone(),
        description: scenario.description.clone(),
        tags: scenario.tags.clone(),
        steps: scenario.steps.iter().map(convert_step).collect(),
        examples: scenario.examples.iter().map(convert_examples).collect(),
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

fn convert_examples(examples: &gherkin::Examples) -> models::Examples {
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
        tags: examples.tags.clone(),
        table,
    }
}

fn convert_table(table: &gherkin::Table) -> models::Table {
    let mut rows_iter = table.rows.iter();
    let header = rows_iter.next().cloned().unwrap_or_default();
    let rows: Vec<Vec<String>> = rows_iter.cloned().collect();
    models::Table { header, rows }
}
