use clap::{Parser, ValueEnum};
use globset::Glob;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process;
use walkdir::WalkDir;

mod formatter;
mod models;
mod parser;
mod server;

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

    /// Output formatter to use. If omitted (along with --output and --dry-run),
    /// starts a local web server to browse the documentation interactively.
    #[arg(short, long)]
    formatter: Option<Formatter>,

    /// Path to the output file/folder.
    #[arg(short, long, conflicts_with = "dry_run")]
    output: Option<String>,

    /// Print formatted output to stdout instead of writing to a file.
    #[arg(long, conflicts_with = "output")]
    dry_run: bool,

    /// Title of the generated document.
    #[arg(short, long)]
    title: Option<String>,

    /// Port for the web server (only used when no formatter is specified).
    #[arg(short, long, default_value_t = 3000)]
    port: u16,

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

    let serve_mode = cli.formatter.is_none() && cli.output.is_none() && !cli.dry_run;

    // When a formatter is explicitly given, require --output or --dry-run
    if cli.formatter.is_some() && cli.output.is_none() && !cli.dry_run {
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

    // ── Serve mode ─────────────────────────────────────────────────────────────
    if serve_mode {
        let title = cli.title.unwrap_or_else(|| "Cucumber docs".to_string());

        if let Err(error) = server::serve(cli.port, document, title) {
            eprintln!("{error}");
            process::exit(1);
        }
        return;
    }

    // ── HTML formatter ──────────────────────────────────────────────────────────
    if matches!(cli.formatter, Some(Formatter::Html)) {
        if cli.dry_run {
            eprintln!("Error: --dry-run is not supported for the html formatter.");
            process::exit(1);
        }
        let output_path = cli.output.as_deref().unwrap_or(".");
        let output_dir = std::path::Path::new(output_path);
        let title = cli.title.as_deref().unwrap_or("Cucumber docs");
        if let Err(error) = formatter::format_html(&document, output_dir, title) {
            eprintln!("{error}");
            process::exit(1);
        }
        eprintln!("HTML site written to {output_path}");
        return;
    }

    // ── String-based formatters (JSON, Markdown) ────────────────────────────────
    let output = match cli.formatter {
        Some(Formatter::Json) => match formatter::format_json(&document) {
            Ok(json) => json,
            Err(error) => {
                eprintln!("{error}");
                process::exit(1);
            }
        },
        Some(Formatter::Markdown) => {
            eprintln!("Error: Markdown formatter is not yet implemented.");
            process::exit(1);
        }
        Some(Formatter::Html) => unreachable!(),
        None => unreachable!(),
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
