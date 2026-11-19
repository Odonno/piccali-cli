//! `piccali-cli fix` — correct scenario keywords against Examples presence.
//!
//! A scenario line must use an outline keyword ("Scenario Outline") when it has Examples blocks,
//! and a plain scenario keyword ("Scenario") when it does not.
//! Keywords are read/written in the file's own `# language:` dialect.

use color_eyre::eyre::{Context, Report, Result, bail, eyre};
use std::path::{Path, PathBuf};

use crate::{dialects, parser};

/// One planned keyword rewrite on a single line (1-based).
struct Edit {
    line: usize,
    from: String,
    to: String,
}

/// All planned edits for one file, plus the file's current contents.
struct Plan {
    path: PathBuf,
    raw: String,
    had_bom: bool,
    edits: Vec<Edit>,
}

/// Entry point for the `fix` subcommand.
///
/// Transactional: every file is parsed and planned first; if any file fails,
/// nothing is written. With `dry_run`, the plan is printed but never applied.
pub fn run(paths: &[String], dry_run: bool) -> Result<()> {
    let files = parser::resolve_files(paths)?;
    if files.is_empty() {
        bail!("No feature files found for: {}", paths.join(", "));
    }

    // Phase 1: parse and plan everything before touching any file.
    let mut plans = Vec::new();
    let mut failures: Vec<(PathBuf, Report)> = Vec::new();
    for path in &files {
        match plan_file(path) {
            Ok(plan) => plans.push(plan),
            Err(err) => failures.push((path.clone(), err)),
        }
    }
    if !failures.is_empty() {
        for (path, err) in &failures {
            eprintln!("error: {}: {err:#}", path.display());
        }
        bail!(
            "{} of {} file(s) could not be parsed; nothing was modified.",
            failures.len(),
            files.len()
        );
    }

    let mut fixed = 0;
    let mut touched = 0;
    for plan in &plans {
        if plan.edits.is_empty() {
            continue;
        }
        touched += 1;
        fixed += plan.edits.len();
        for edit in &plan.edits {
            println!(
                "{}: line {}: {} → {}",
                plan.path.display(),
                edit.line,
                edit.from,
                edit.to
            );
        }
        if !dry_run {
            apply(plan)?;
        }
    }

    if dry_run {
        println!("Dry run: {fixed} fix(es) in {touched} file(s); nothing was written.");
    } else {
        println!(
            "Fixed {fixed} scenario keyword(s) in {touched} of {} file(s).",
            files.len()
        );
    }
    Ok(())
}

/// Parse one feature file and plan keyword edits for every scenario whose keyword does not match its Examples presence.
fn plan_file(path: &Path) -> Result<Plan> {
    let raw = std::fs::read_to_string(path)
        .wrap_err_with(|| format!("Could not read path: {}", path.display()))?;
    let had_bom = raw.starts_with('\u{FEFF}');
    let raw = raw.strip_prefix('\u{FEFF}').unwrap_or(&raw).to_string();

    let feature = parser::parse_raw_feature_text(&raw, path)?;

    let lang = dialects::detect_language(&raw);
    let dialect = dialects::dialect(&lang)
        .ok_or_else(|| eyre!("{} uses unsupported language '{lang}'", path.display()))?;

    let scenarios = feature
        .scenarios
        .iter()
        .chain(feature.rules.iter().flat_map(|r| r.scenarios.iter()));

    let mut edits = Vec::new();
    for scenario in scenarios {
        let has_examples = !scenario.examples.is_empty();
        let is_outline = dialect
            .scenario_outline
            .contains(&scenario.keyword.as_str());
        let is_scenario = dialect.scenario.contains(&scenario.keyword.as_str());

        // Keyword lists never overlap (verified against the dialects table),
        // so each scenario matches at most one family. Correct keywords —
        // including non-canonical but valid aliases like "Scenario Template" with Examples — are left untouched.
        let to = if is_outline && !has_examples {
            dialect.scenario_canonical
        } else if is_scenario && has_examples {
            dialect.outline_canonical
        } else {
            continue;
        };

        let line = scenario.position.line;
        edits.push(Edit {
            line,
            from: scenario.keyword.clone(),
            to: to.to_string(),
        });
    }

    Ok(Plan {
        path: path.to_path_buf(),
        raw,
        had_bom,
        edits,
    })
}

/// Apply a plan's edits to the file on disk, preserving everything else (indentation, line endings, comments, trailing newline, BOM).
fn apply(plan: &Plan) -> Result<()> {
    let mut lines: Vec<String> = plan.raw.lines().map(str::to_owned).collect();
    for edit in &plan.edits {
        let line = lines.get_mut(edit.line - 1).ok_or_else(|| {
            eyre!(
                "{}: line {} is out of range",
                plan.path.display(),
                edit.line
            )
        })?;
        let indent_len = line.len() - line.trim_start().len();
        if !line[indent_len..].starts_with(&edit.from) {
            bail!(
                "{}: line {} does not start with '{}'",
                plan.path.display(),
                edit.line,
                edit.from
            );
        }
        line.replace_range(indent_len..indent_len + edit.from.len(), &edit.to);
    }

    let mut out = lines.join("\n");
    if plan.raw.ends_with('\n') {
        out.push('\n');
    }
    if plan.had_bom {
        out.insert(0, '\u{FEFF}');
    }

    std::fs::write(&plan.path, out)
        .wrap_err_with(|| format!("Could not write {}", plan.path.display()))?;
    Ok(())
}
