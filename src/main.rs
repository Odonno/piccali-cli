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

fn main() -> Result<()> {
    color_eyre::install()?;
    run()?;

    Ok(())
}

fn run() -> Result<()> {
    let cli = Cli::parse();

    // When a format is explicitly given, require --output or --dry-run
    if cli.format.is_some() && cli.output.is_none() && !cli.dry_run {
        bail!("either --output or --dry-run must be specified.");
    }

    // --assets is only supported for HTML output and the HTTP server
    if !cli.assets.is_empty() {
        match &cli.format {
            Some(Format::Json) => bail!("--assets is not supported for the json formatter."),
            Some(Format::Markdown) => bail!("--assets is not supported for the markdown formatter."),
            Some(Format::Html) | None => {}
        }
    }

    // --base-url is only supported for HTML output
    if cli.base_url.is_some() {
        match &cli.format {
            Some(Format::Html) => {}
            _ => bail!("--base-url is only supported with --format html."),
        }
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

    // Discover additional asset files if --assets was provided.
    let asset_refs: Vec<parser::AssetRef> = cli
        .assets
        .iter()
        .flat_map(parser::discover_assets)
        .collect();

    // Collect local image references from all feature descriptions, then
    // rewrite the description strings to use the canonical `/images/` URL.
    // Image paths that match an asset from --assets are rewritten to `/assets/`.
    let image_refs = parser::collect_and_rewrite_images(&mut entries, &asset_refs);

    let folders = parser::build_folder_tree(entries);
    let document = models::Document { folders };

    let default_title = "Cucumber docs";
    let title = cli.title.as_deref().unwrap_or(default_title);

    match cli.format {
        None => {
            server::serve(
                cli.port,
                document,
                title.to_string(),
                image_refs,
                asset_refs,
            )?;
        }
        Some(Format::Html) => {
            if cli.dry_run {
                bail!("--dry-run is not supported for the html formatter.");
            }
            let output_path = cli.output.as_deref().unwrap_or(".");
            let output_dir = std::path::Path::new(output_path);
            format::format_html(&document, output_dir, title, &image_refs, &asset_refs, cli.base_url.as_deref())?;
            println!("HTML site written to {output_path}");
        }
        Some(Format::Markdown) => {
            if cli.dry_run {
                let output = format::format_markdown_dry_run(&document);
                println!("{output}");
            } else {
                let output_path_str = cli.output.as_deref().unwrap_or(".");
                let output_path = std::path::Path::new(output_path_str);

                if output_path.extension().is_some() {
                    // Output has a file extension → write single concatenated file
                    format::format_markdown_single_file(&document, title, output_path)?;
                    println!("Markdown written to {output_path_str}");
                } else {
                    // No extension → treat as directory, one file per feature
                    format::format_markdown(&document, output_path)?;
                    println!("Markdown files written to {output_path_str}");
                }
            }
        }
        Some(Format::Json) => {
            let output = format::format_json(&document)?;
            if cli.dry_run {
                println!("{output}");
            } else if let Some(ref output_path) = cli.output {
                std::fs::write(output_path, &output)
                    .map_err(|e| eyre!("Failed to write output to {output_path}: {e}"))?;
                println!("Written to {output_path}");
            }
        }
    }

    Ok(())
}
