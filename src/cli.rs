use clap::{Parser, ValueEnum};
use globset::Glob;

/// Output format for generated documentation.
#[derive(Debug, Clone, ValueEnum)]
pub enum Format {
    Json,
    Html,
    /// Markdown (also accepted as "md")
    #[value(alias = "md")]
    Markdown,
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

    /// Tag prefix to match (e.g. "feat:"). Repeat for multiple prefixes.
    /// Each --tag-prefix must be paired with a corresponding --tag-url-template.
    #[arg(long, value_name = "PREFIX")]
    pub tag_prefix: Vec<String>,

    /// URL template for tagged links. Use {id} as placeholder for the part
    /// after the prefix (e.g. "https://jira.example.com/browse/{id}").
    /// Repeat to match each --tag-prefix in order.
    #[arg(long, value_name = "URL_TEMPLATE")]
    pub tag_url_template: Vec<String>,
}
