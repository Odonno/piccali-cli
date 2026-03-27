use clap::{Parser, ValueEnum};
use globset::Glob;

/// Output format for generated documentation.
#[derive(Debug, Clone, ValueEnum)]
enum Formatter {
    Json,
    Html,
    /// Markdown (also accepted as "md")
    #[value(alias = "md")]
    Markdown,
}

/// Piccali CLI — generate living documentation from feature files.
#[derive(Parser, Debug)]
#[command(name = "piccali-cli", version, about)]
struct Cli {
    /// Glob pattern for input feature files.
    /// The pattern is validated at parse time.
    #[arg(short, long, default_value = "**/*.feature")]
    input: Glob,

    /// Output formatter to use.
    #[arg(short, long)]
    formatter: Formatter,

    /// Path to the output file/folder.
    #[arg(short, long)]
    output: String,

    /// Title of the generated document.
    #[arg(short, long)]
    title: Option<String>,

    /// Prefix used to identify tags (e.g. "feat:").
    #[arg(long)]
    tag_prefix: Option<String>,

    /// URL template for tags. Use {id} as a placeholder for the tag value.
    #[arg(long)]
    tag_url_template: Option<String>,
}

fn main() {
    let cli = Cli::parse();

    println!("Input:            {}", cli.input.glob());
    println!("Formatter:        {:?}", cli.formatter);
    println!("Output:           {}", cli.output);

    if let Some(ref title) = cli.title {
        println!("Title:            {title}");
    }
    if let Some(ref tag_prefix) = cli.tag_prefix {
        println!("Tag prefix:       {tag_prefix}");
    }
    if let Some(ref tag_url_template) = cli.tag_url_template {
        println!("Tag URL template: {tag_url_template}");
    }
}
