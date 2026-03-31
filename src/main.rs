use clap::{Parser, ValueEnum};
use color_eyre::eyre::{Result, bail, eyre};
use globset::Glob;
use std::collections::HashMap;
use std::path::PathBuf;
use walkdir::WalkDir;

mod assets;
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
    color_eyre::install().expect("failed to install color-eyre");

    if let Err(error) = run() {
        eprintln!("{error:?}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();

    let serve_mode = cli.formatter.is_none() && cli.output.is_none() && !cli.dry_run;

    // When a formatter is explicitly given, require --output or --dry-run
    if cli.formatter.is_some() && cli.output.is_none() && !cli.dry_run {
        bail!("either --output or --dry-run must be specified.");
    }

    // Validate that --tag-prefix and --tag-url-template are always paired
    if cli.tag_prefix.len() != cli.tag_url_template.len() {
        bail!(
            "--tag-prefix and --tag-url-template must be provided in pairs \
             (got {} prefix(es) and {} template(s)).",
            cli.tag_prefix.len(),
            cli.tag_url_template.len()
        );
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
        bail!(
            "No feature files found matching pattern: {}",
            cli.input.glob()
        );
    }

    // Parse all feature files, keeping the path alongside each feature
    let mut entries: Vec<(std::path::PathBuf, models::Feature)> = Vec::new();
    for path in feature_files {
        let feature = parser::parse_feature_file(&path, &tag_links)?;
        entries.push((path, feature));
    }

    // Collect local image references from all feature descriptions, then
    // rewrite the description strings to use the canonical `/images/` URL.
    let image_refs = collect_and_rewrite_images(&mut entries);

    let folders = parser::build_folder_tree(entries);
    let document = models::Document { folders };

    // ── Serve mode ─────────────────────────────────────────────────────────────
    if serve_mode {
        let title = cli.title.unwrap_or_else(|| "Cucumber docs".to_string());
        server::serve(cli.port, document, title, image_refs)?;
        return Ok(());
    }

    // ── HTML formatter ──────────────────────────────────────────────────────────
    if matches!(cli.formatter, Some(Formatter::Html)) {
        if cli.dry_run {
            bail!("--dry-run is not supported for the html formatter.");
        }
        let output_path = cli.output.as_deref().unwrap_or(".");
        let output_dir = std::path::Path::new(output_path);
        let title = cli.title.as_deref().unwrap_or("Cucumber docs");
        formatter::format_html(&document, output_dir, title, &image_refs)?;
        eprintln!("HTML site written to {output_path}");
        return Ok(());
    }

    // ── Markdown formatter ──────────────────────────────────────────────────────
    if matches!(cli.formatter, Some(Formatter::Markdown)) {
        if cli.dry_run {
            let output = formatter::format_markdown_dry_run(&document);
            println!("{output}");
            return Ok(());
        }
        let output_path = cli.output.as_deref().unwrap_or(".");
        let output_dir = std::path::Path::new(output_path);
        formatter::format_markdown(&document, output_dir)?;
        eprintln!("Markdown files written to {output_path}");
        return Ok(());
    }

    // ── String-based formatters (JSON) ──────────────────────────────────────────
    let output = match cli.formatter {
        Some(Formatter::Json) => formatter::format_json(&document)?,
        Some(Formatter::Markdown) => unreachable!(),
        Some(Formatter::Html) => unreachable!(),
        None => return Err(eyre!("no formatter specified")),
    };

    // Output the result
    if cli.dry_run {
        println!("{output}");
    } else if let Some(ref output_path) = cli.output {
        std::fs::write(output_path, &output)
            .map_err(|e| eyre!("Failed to write output to {output_path}: {e}"))?;
        eprintln!("Written to {output_path}");
    }

    Ok(())
}

/// For every `(path, feature)` entry, scan all description fields for local
/// image references, build a deduplicated list of [`parser::ImageRef`]s, and
/// rewrite the descriptions in-place to use `/images/{output_name}` URLs.
///
/// Returns the deduplicated list of image references (keyed on `output_name`).
fn collect_and_rewrite_images(
    entries: &mut [(std::path::PathBuf, models::Feature)],
) -> Vec<parser::ImageRef> {
    // Pass 1 — collect all image refs across every description field.
    // We keep them in insertion order and deduplicate by `output_name`.
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut all_refs: Vec<parser::ImageRef> = Vec::new();

    for (path, feature) in entries.iter() {
        let feature_dir = path.parent().unwrap_or(std::path::Path::new("."));

        // Use the immediate parent folder name as the collision-avoidance prefix.
        let folder_prefix = feature_dir
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        // Collect from the feature description and all nested descriptions.
        let descs = description_strings(feature);
        for desc in descs {
            let refs =
                parser::extract_local_image_refs(Some(desc), feature_dir, &folder_prefix);
            for r in refs {
                if seen.insert(r.output_name.clone()) {
                    all_refs.push(r);
                }
            }
        }
    }

    // Pass 2 — rewrite description strings in-place.
    // Build a per-feature lookup: raw relative path → output_name.
    for (path, feature) in entries.iter_mut() {
        let feature_dir = path.parent().unwrap_or(std::path::Path::new("."));

        let folder_prefix = feature_dir
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        // Build a map for this feature: raw_path → output_name.
        let image_map: HashMap<String, String> = {
            let mut m = HashMap::new();
            // We re-extract so we get the raw_path strings for this feature.
            let descs = description_strings_owned(feature);
            for desc in &descs {
                let refs = parser::extract_local_image_refs(Some(desc), feature_dir, &folder_prefix);
                for r in refs {
                    // raw_path is the filename (or relative path) as it appears in the markdown.
                    // We need to recover the original raw path from the description.
                    // Since extract_local_image_refs resolved feature_dir.join(raw_path),
                    // we can get the raw path by stripping the feature_dir prefix from src_path.
                    if let Ok(rel) = r.src_path.strip_prefix(feature_dir) {
                        let raw = rel.to_string_lossy().replace('\\', "/");
                        m.insert(raw, r.output_name);
                    }
                }
            }
            m
        };

        if image_map.is_empty() {
            continue;
        }

        rewrite_feature_descriptions(feature, &image_map);
    }

    all_refs
}

/// Collect all description string references from a feature (borrowed).
fn description_strings(feature: &models::Feature) -> Vec<&str> {
    let mut descs = Vec::new();
    if let Some(d) = &feature.description {
        descs.push(d.as_str());
    }
    for scenario in &feature.scenarios {
        if let Some(d) = &scenario.description {
            descs.push(d.as_str());
        }
    }
    for rule in &feature.rules {
        if let Some(d) = &rule.description {
            descs.push(d.as_str());
        }
        for scenario in &rule.scenarios {
            if let Some(d) = &scenario.description {
                descs.push(d.as_str());
            }
        }
    }
    descs
}

/// Collect all description strings from a feature (owned clones).
fn description_strings_owned(feature: &models::Feature) -> Vec<String> {
    description_strings(feature)
        .into_iter()
        .map(str::to_owned)
        .collect()
}

/// Rewrite all description fields in a feature using the given raw→output_name map.
fn rewrite_feature_descriptions(
    feature: &mut models::Feature,
    image_map: &HashMap<String, String>,
) {
    if let Some(d) = &feature.description {
        feature.description = Some(parser::rewrite_local_image_refs(d, image_map));
    }
    for scenario in &mut feature.scenarios {
        if let Some(d) = &scenario.description {
            scenario.description = Some(parser::rewrite_local_image_refs(d, image_map));
        }
    }
    for rule in &mut feature.rules {
        if let Some(d) = &rule.description {
            rule.description = Some(parser::rewrite_local_image_refs(d, image_map));
        }
        for scenario in &mut rule.scenarios {
            if let Some(d) = &scenario.description {
                scenario.description = Some(parser::rewrite_local_image_refs(d, image_map));
            }
        }
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
