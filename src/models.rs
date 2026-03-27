use serde::Serialize;

/// A tag with an optional URL link.
#[derive(Debug, Serialize, Clone)]
pub struct Tag {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Top-level document containing a folder tree of parsed features.
#[derive(Debug, Serialize)]
pub struct Document {
    pub folders: Vec<FolderNode>,
}

/// A node in the folder tree. Folders can be nested and each holds zero or
/// more feature files directly inside it.
#[derive(Debug, Serialize)]
pub struct FolderNode {
    pub name: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub folders: Vec<FolderNode>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub features: Vec<Feature>,
}

/// A Gherkin Feature.
#[derive(Debug, Serialize)]
pub struct Feature {
    pub keyword: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub scenarios: Vec<Scenario>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub rules: Vec<Rule>,
}

/// A Gherkin Rule (Gherkin 6+).
#[derive(Debug, Serialize)]
pub struct Rule {
    pub keyword: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<Tag>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<Background>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub scenarios: Vec<Scenario>,
}

/// A Background section (shared steps before each scenario).
#[derive(Debug, Serialize)]
pub struct Background {
    pub keyword: String,
    pub steps: Vec<Step>,
}

/// A Scenario or Scenario Outline.
#[derive(Debug, Serialize)]
pub struct Scenario {
    pub keyword: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<Tag>,
    pub steps: Vec<Step>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub examples: Vec<Examples>,
}

/// An Examples table attached to a Scenario Outline.
#[derive(Debug, Serialize)]
pub struct Examples {
    pub keyword: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<Tag>,
    pub table: Table,
}

/// A single step in a scenario or background.
#[derive(Debug, Serialize)]
pub struct Step {
    pub keyword: String,
    #[serde(rename = "type")]
    pub step_type: StepType,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc_string: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table: Option<Table>,
}

/// The resolved step type (And/But are resolved to their parent type).
#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub enum StepType {
    Given,
    When,
    Then,
}

/// A data table (used in steps and examples).
#[derive(Debug, Serialize)]
pub struct Table {
    pub header: Vec<String>,
    pub rows: Vec<Vec<String>>,
}
