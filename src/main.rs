use clap::{Parser, ValueEnum};
use globset::Glob;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process;
use walkdir::WalkDir;

mod formatter;
mod models;
mod parser;

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
    #[arg(short, long, default_value = "**/*.feature")]
    input: Glob,

    /// Output formatter to use.
    #[arg(short, long)]
    formatter: Formatter,

    /// Path to the output file/folder.
    #[arg(short, long, conflicts_with = "dry_run")]
    output: Option<String>,

    /// Print formatted output to stdout instead of writing to a file.
    #[arg(long, conflicts_with = "output")]
    dry_run: bool,

    /// Title of the generated document.
    #[arg(short, long)]
    title: Option<String>,

    /// Tag prefix to match (e.g. "feat:"). Repeat for multiple prefixes.
    /// Each --tag-prefix must be paired with a corresponding --tag-url-template.
    #[arg(long, value_name = "PREFIX")]
    tag_prefix: Vec<String>,

    /// URL template for tagged links. Use {id} as placeholder for the part
    /// after the prefix (e.g. "https://jira.example.com/browse/{id}").
    /// Repeat to match each --tag-prefix in order.
    #[arg(long, value_name = "URL_TEMPLATE")]
    tag_url_template: Vec<String>,
}

fn main() {
    let cli = Cli::parse();

    // Require either --output or --dry-run
    if cli.output.is_none() && !cli.dry_run {
        eprintln!("Error: either --output or --dry-run must be specified.");
        process::exit(1);
    }

    // Validate that --tag-prefix and --tag-url-template are always paired
    if cli.tag_prefix.len() != cli.tag_url_template.len() {
        eprintln!(
            "Error: --tag-prefix and --tag-url-template must be provided in pairs \
             (got {} prefix(es) and {} template(s)).",
            cli.tag_prefix.len(),
            cli.tag_url_template.len()
        );
        process::exit(1);
    }

    // Build the prefix → url_template map
    let tag_links: HashMap<String, String> = cli
        .tag_prefix
        .into_iter()
        .zip(cli.tag_url_template)
        .collect();

    // Discover feature files matching the glob pattern
    let feature_files = discover_files(&cli.input);
    if feature_files.is_empty() {
        eprintln!(
            "No feature files found matching pattern: {}",
            cli.input.glob()
        );
        process::exit(1);
    }

    // Parse all feature files, keeping the path alongside each feature
    let mut entries: Vec<(std::path::PathBuf, models::Feature)> = Vec::new();
    for path in feature_files {
        match parser::parse_feature_file(&path, &tag_links) {
            Ok(feature) => entries.push((path, feature)),
            Err(error) => {
                eprintln!("{error}");
                process::exit(1);
            }
        }
    }

    let folders = parser::build_folder_tree(entries);
    let document = models::Document { folders };

    // Format the document
    let output = match cli.formatter {
        Formatter::Json => match formatter::format_json(&document) {
            Ok(json) => json,
            Err(error) => {
                eprintln!("{error}");
                process::exit(1);
            }
        },
        Formatter::Html | Formatter::Markdown => {
            eprintln!(
                "Error: {:?} formatter is not yet implemented.",
                cli.formatter
            );
            process::exit(1);
        }
    };

    // Output the result
    if cli.dry_run {
        println!("{output}");
    } else if let Some(ref output_path) = cli.output {
        if let Err(error) = std::fs::write(output_path, &output) {
            eprintln!("Failed to write output to {output_path}: {error}");
            process::exit(1);
        }
        eprintln!("Written to {output_path}");
    }
}

/// Walk the current directory and return all file paths matching the glob pattern.
fn discover_files(glob: &Glob) -> Vec<PathBuf> {
    let matcher = glob.compile_matcher();
    let mut files = Vec::new();

    let walker = WalkDir::new(".").into_iter().filter_entry(|entry| {
        // Skip common directories that should never contain feature files
        let name = entry.file_name().to_string_lossy();
        !matches!(name.as_ref(), "target" | "node_modules" | ".git")
    });

    for entry in walker.filter_map(Result::ok) {
        if entry.file_type().is_file() {
            let path = entry.into_path();
            // Strip the leading "./" or ".\" to get a clean relative path
            let relative = path.strip_prefix(".").unwrap_or(&path);
            // Normalize path separators to forward slashes for consistent glob matching
            let normalized = relative.to_string_lossy().replace('\\', "/");
            if matcher.is_match(&normalized) {
                files.push(path);
            }
        }
    }

    files.sort();
    files
}
