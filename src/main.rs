use clap::Parser;
use cli::{Cli, Format};
use color_eyre::eyre::{Result, bail, eyre};
use std::collections::HashMap;

mod assets;
mod cli;
mod format;
mod models;
mod parser;
mod server;

fn main() {
    color_eyre::install().expect("failed to install color-eyre");

    if let Err(error) = run() {
        eprintln!("{error:?}");
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();

    let serve_mode = cli.format.is_none() && cli.output.is_none() && !cli.dry_run;

    // When a format is explicitly given, require --output or --dry-run
    if cli.format.is_some() && cli.output.is_none() && !cli.dry_run {
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
    let feature_files = parser::discover_files(&cli.input);
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
    let image_refs = parser::collect_and_rewrite_images(&mut entries);

    let folders = parser::build_folder_tree(entries);
    let document = models::Document { folders };

    // ── Serve mode ─────────────────────────────────────────────────────────────
    if serve_mode {
        let title = cli.title.unwrap_or_else(|| "Cucumber docs".to_string());
        server::serve(cli.port, document, title, image_refs)?;
        return Ok(());
    }

    // ── HTML formatter ──────────────────────────────────────────────────────────
    if matches!(cli.format, Some(Format::Html)) {
        if cli.dry_run {
            bail!("--dry-run is not supported for the html formatter.");
        }
        let output_path = cli.output.as_deref().unwrap_or(".");
        let output_dir = std::path::Path::new(output_path);
        let title = cli.title.as_deref().unwrap_or("Cucumber docs");
        format::format_html(&document, output_dir, title, &image_refs)?;
        eprintln!("HTML site written to {output_path}");
        return Ok(());
    }

    // ── Markdown formatter ──────────────────────────────────────────────────────
    if matches!(cli.format, Some(Format::Markdown)) {
        if cli.dry_run {
            let output = format::format_markdown_dry_run(&document);
            println!("{output}");
            return Ok(());
        }
        let output_path = cli.output.as_deref().unwrap_or(".");
        let output_dir = std::path::Path::new(output_path);
        format::format_markdown(&document, output_dir)?;
        eprintln!("Markdown files written to {output_path}");
        return Ok(());
    }

    // ── String-based formatters (JSON) ──────────────────────────────────────────
    let output = match cli.format {
        Some(Format::Json) => format::format_json(&document)?,
        Some(Format::Markdown) => unreachable!(),
        Some(Format::Html) => unreachable!(),
        None => return Err(eyre!("no format specified")),
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
