use clap::{Parser, Subcommand, ValueEnum};
use globset::Glob;

/// Feature flags that can be enabled in the generated viewer via `--features`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum FeatureFlag {
    /// Highlight regular scenarios that could join an existing Scenario Outline or be grouped into a new one.
    ScenarioOutlineImprovements,
}

/// Output format for generated documentation.
#[derive(Debug, Clone, ValueEnum)]
pub enum Format {
    Json,
    Html,
    /// Markdown (also accepted as "md")
    #[value(alias = "md")]
    Markdown,
}

/// Available subcommands. When omitted, the default behavior (generate documentation from feature files) applies.
#[derive(Debug, Subcommand)]
pub enum Command {
    /// Fix scenario keywords in Gherkin feature files so they match the presence of Examples blocks (in the file's `# language:` dialect).
    /// All files are parsed first; if any fails to parse, nothing is written.
    Fix {
        /// Feature files to fix: a file, a directory, or a glob pattern.
        /// Defaults to the same glob as the default command: `**/*.feature`.
        #[arg(default_values_t = vec!["**/*.feature".to_string()])]
        paths: Vec<String>,

        /// Print the planned fixes without writing anything.
        #[arg(long)]
        dry_run: bool,
    },
}

/// Piccali CLI — generate living documentation from feature files.
#[derive(Parser, Debug)]
#[command(name = "piccali-cli", version, about)]
pub struct Cli {
    /// Glob pattern for input feature files.
    #[arg(short, long, default_value = "**/*.feature")]
    pub input: Glob,

    /// Output format to use. If omitted (along with --output and --dry-run),
    /// starts a local web server to browse the documentation interactively.
    #[arg(short, long)]
    pub format: Option<Format>,

    /// Path to the output file/folder.
    #[arg(short, long, conflicts_with = "dry_run")]
    pub output: Option<String>,

    /// Print formatted output to stdout instead of writing to a file.
    #[arg(long, conflicts_with = "output")]
    pub dry_run: bool,

    /// Title of the generated document.
    #[arg(short, long)]
    pub title: Option<String>,

    /// Port for the web server (only used when no formatter is specified).
    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,

    /// Glob pattern for additional asset files to include in the output.
    /// Only supported with --format html or the built-in HTTP server.
    /// Files are served/copied with the glob base directory stripped
    /// (e.g. --assets "static/**/*" copies static/icons/logo.png as icons/logo.png).
    /// Can be specified multiple times to include assets from multiple patterns.
    #[arg(long)]
    pub assets: Vec<Glob>,

    /// Base URL to embed as a `<base href="...">` tag in the generated `index.html`.
    /// Only supported with --format html.
    #[arg(long)]
    pub base_url: Option<String>,

    /// Language code to set as the `lang` attribute on the `<html>` element
    /// (e.g. "en", "fr"). Only supported with --format html.
    #[arg(long)]
    pub lang: Option<String>,

    /// Tag prefix to match (e.g. "feat:"). Repeat for multiple prefixes.
    /// Each --tag-prefix must be paired with a corresponding --tag-url-template.
    #[arg(long, value_name = "PREFIX")]
    pub tag_prefix: Vec<String>,

    /// URL template for tagged links. Use {id} as placeholder for the part
    /// after the prefix (e.g. "https://jira.example.com/browse/{id}").
    /// Repeat to match each --tag-prefix in order.
    #[arg(long, value_name = "URL_TEMPLATE")]
    pub tag_url_template: Vec<String>,

    /// Feature flag to enable in the viewer
    /// (e.g. "scenario-outline-improvements"). Written to metadata.json.
    /// Repeat for multiple features. Off by default.
    #[arg(long, value_name = "FEATURE", value_enum)]
    pub features: Vec<FeatureFlag>,

    /// Subcommand to run. When omitted, the default behavior (generate documentation) applies.
    #[command(subcommand)]
    pub command: Option<Command>,
}
