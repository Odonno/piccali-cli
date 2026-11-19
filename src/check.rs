//! `piccali-cli check` — lint feature files for silently-swallowed Gherkin mistakes.
//!
//! The Gherkin grammar treats any non-keyword line after `Feature:`/`Rule:` as description text,
//! so a typo like `Senario:` makes the whole block vanish into the description with exit code 0.
//! The parser is right per the spec — this command is the reporter for that silence.
//!
//! Two checks, run on the description regions of every parseable file:
//! 1. a step keyword (`Given`, `When`, … in the file's dialect) starting a description line — legal Gherkin, but almost always a swallowed step;
//! 2. a keyword-shaped line (`Word:` / `Two Words:`) whose prefix is within Levenshtein distance 2 of exactly one keyword — a misspelled keyword.
//!
//! Unparseable files are reported alongside lint findings, one run shows every problem;
//! exit code is 1 if anything was found.

use color_eyre::eyre::{Context, Report, Result, bail, eyre};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use crate::{dialects, keywords::lang_keywords, parser};

/// One lint hit: file, 1-based line, human message.
struct Finding {
    path: PathBuf,
    line: usize,
    message: String,
}

/// Entry point for the `check` subcommand.
pub fn run(paths: &[String]) -> Result<()> {
    let files = parser::resolve_files(paths)?;
    if files.is_empty() {
        bail!("No feature files found for: {}", paths.join(", "));
    }

    let mut findings = Vec::new();
    let mut failures: Vec<(PathBuf, Report)> = Vec::new();
    for path in &files {
        match lint_file(path) {
            Ok(mut file_findings) => findings.append(&mut file_findings),
            Err(err) => failures.push((path.clone(), err)),
        }
    }

    for (path, err) in &failures {
        eprintln!("error: {}: {err:#}", path.display());
    }
    for finding in &findings {
        println!(
            "warning: {}: line {}: {}",
            finding.path.display(),
            finding.line,
            finding.message
        );
    }

    let problem_files: BTreeSet<&Path> = failures
        .iter()
        .map(|(path, _)| path.as_path())
        .chain(findings.iter().map(|f| f.path.as_path()))
        .collect();
    if !problem_files.is_empty() {
        bail!(
            "{} problem(s) found in {} of {} file(s).",
            failures.len() + findings.len(),
            problem_files.len(),
            files.len()
        );
    }

    println!("OK: {} file(s) checked.", files.len());
    Ok(())
}

/// Read, parse and lint one feature file.
fn lint_file(path: &Path) -> Result<Vec<Finding>> {
    let raw = std::fs::read_to_string(path)
        .wrap_err_with(|| format!("Could not read path: {}", path.display()))?;
    let raw = raw.strip_prefix('\u{FEFF}').unwrap_or(&raw).to_string();

    let feature = parser::parse_raw_feature_text(&raw, path)?;

    let lang = dialects::detect_language(&raw);
    let keywords = lang_keywords(&lang)
        .ok_or_else(|| eyre!("{} uses unsupported language '{lang}'", path.display()))?;

    let lines: Vec<&str> = raw.lines().collect();
    let mut findings = Vec::new();
    for (block, start, end) in description_regions(&feature, lines.len()) {
        // `start` is the Feature:/Rule: line itself; description lines follow.
        for (index, line) in lines[start..end].iter().enumerate() {
            lint_line(
                path,
                start + index + 1,
                line,
                block,
                keywords,
                &mut findings,
            );
        }
    }
    Ok(findings)
}

/// Description regions as 1-based line ranges (exclusive end):
/// the feature's owndescription, plus each rule's.
/// Steps swallowed by scenario/background descriptions cannot happen — the grammar excludes step keywords there.
fn description_regions(
    feature: &gherkin::Feature,
    total_lines: usize,
) -> Vec<(&'static str, usize, usize)> {
    let mut block_starts: Vec<usize> = Vec::new();
    if let Some(background) = &feature.background {
        block_starts.push(background.position.line);
    }
    block_starts.extend(feature.scenarios.iter().map(|s| s.position.line));
    block_starts.extend(feature.rules.iter().map(|r| r.position.line));
    let end = block_starts.iter().min().copied().unwrap_or(total_lines);

    let mut regions = vec![("Feature", feature.position.line, end)];
    for rule in &feature.rules {
        let mut ends: Vec<usize> = Vec::new();
        if let Some(background) = &rule.background {
            ends.push(background.position.line);
        }
        ends.extend(rule.scenarios.iter().map(|s| s.position.line));
        let end = ends.into_iter().min().unwrap_or(total_lines);
        regions.push(("Rule", rule.position.line, end));
    }
    regions
}

/// Lint one description-region line. Blank, comment and tag lines are ignored.
fn lint_line(
    path: &Path,
    line_no: usize,
    line: &str,
    block: &'static str,
    keywords: &crate::keywords::LangKeywords,
    findings: &mut Vec<Finding>,
) {
    let trimmed = line.trim_start();
    if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('@') {
        return;
    }

    // Check 1: a step keyword starting the line. Longest variant first so
    // "Étant donné que x" reports the full keyword, not "Étant donné".
    let mut steps: Vec<&str> = keywords.steps.to_vec();
    steps.sort_by_key(|kw| std::cmp::Reverse(kw.len()));
    for step in steps {
        if trimmed
            .strip_prefix(step)
            .is_some_and(|rest| rest.is_empty() || rest.starts_with(char::is_whitespace))
        {
            findings.push(Finding {
                path: path.to_path_buf(),
                line: line_no,
                message: format!(
                    "step '{step}' sits in the {block} description and is silently treated as text — move it inside a Scenario or Background"
                ),
            });
            break;
        }
    }

    // Check 2: keyword-shaped prefix (≤2 words before the first ':') close to exactly one keyword of the dialect.
    // Exact keywords are distance 0 and never suggested; ties between two keywords are skipped.
    if let Some(colon) = trimmed.find(':') {
        let candidate = trimmed[..colon].trim_end();
        let word_count = candidate.split_whitespace().count();
        if word_count == 0 || word_count > 2 || candidate.chars().count() < 4 {
            return;
        }
        let mut best: Option<(&str, usize)> = None;
        let mut second_best = usize::MAX;
        for keyword in keywords.blocks.iter().chain(keywords.steps.iter()) {
            let distance = levenshtein(candidate, keyword);
            match best {
                Some((_, best_d)) if distance < best_d => {
                    second_best = best_d;
                    best = Some((keyword, distance));
                }
                Some((_, best_d)) => second_best = second_best.min(distance.max(best_d)),
                None => best = Some((keyword, distance)),
            }
        }
        if let Some((keyword, _)) = best.filter(|(_, d)| (1..=2).contains(d) && *d < second_best) {
            findings.push(Finding {
                path: path.to_path_buf(),
                line: line_no,
                message: format!(
                    "'{candidate}' is not a {block} keyword — did you mean '{keyword}'?"
                ),
            });
        }
    }
}

/// Classic two-row Levenshtein distance over chars.
fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.is_empty() {
        return b.len();
    }
    let mut previous: Vec<usize> = (0..=b.len()).collect();
    let mut current = vec![0usize; b.len() + 1];
    for (i, ca) in a.iter().enumerate() {
        current[0] = i + 1;
        for (j, cb) in b.iter().enumerate() {
            let cost = usize::from(ca != cb);
            current[j + 1] = (previous[j + 1] + 1)
                .min(current[j] + 1)
                .min(previous[j] + cost);
        }
        std::mem::swap(&mut previous, &mut current);
    }
    previous[b.len()]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn findings_for(content: &str) -> Vec<(usize, String)> {
        let mut tmp = tempfile::NamedTempFile::with_suffix(".feature").unwrap();
        std::io::Write::write_all(&mut tmp, content.as_bytes()).unwrap();
        lint_file(tmp.path())
            .unwrap()
            .into_iter()
            .map(|f| (f.line, f.message))
            .collect()
    }

    #[test]
    fn levenshtein_distances() {
        assert_eq!(levenshtein("Senario", "Scenario"), 1);
        assert_eq!(levenshtein("Scenario", "Scenario"), 0);
        assert_eq!(levenshtein("Scenaro Outlne", "Scenario Outline"), 2);
        assert_eq!(levenshtein("", "Rule"), 4);
    }

    #[test]
    fn issue_example_is_reported() {
        // The exact file from the issue: typo'd keyword swallows the scenario.
        let findings = findings_for(
            "Feature: Error2\n\
             \n\
             \x20 Senario: Successful login\n\
             \x20   Given a user \"alice\"\n\
             \x20   Then I see the home page\n",
        );
        assert_eq!(findings.len(), 3, "{findings:?}");
        assert!(
            findings[0].1.contains("did you mean 'Scenario'"),
            "{findings:?}"
        );
        assert!(findings[1].1.contains("step 'Given'"), "{findings:?}");
        assert!(findings[2].1.contains("step 'Then'"), "{findings:?}");
        assert_eq!(findings[0].0, 3);
        assert_eq!(findings[1].0, 4);
    }

    #[test]
    fn clean_feature_has_no_findings() {
        assert!(
            findings_for(
                "Feature: Fine\n\
             \n\
             \x20 Scenario: All good\n\
             \x20   Given a user\n",
            )
            .is_empty()
        );
    }

    #[test]
    fn prose_description_starting_with_given_is_flagged_by_design() {
        // Legal Gherkin, but reads like a swallowed step — reported, not fatal.
        let findings = findings_for(
            "Feature: Docs\n\
             \x20 Given the complexity of the domain, this prose is legal\n\
             \n\
             \x20 Scenario: Fine\n\
             \x20   Given a user\n",
        );
        assert_eq!(findings.len(), 1, "{findings:?}");
        assert!(findings[0].1.contains("step 'Given'"), "{findings:?}");
    }

    #[test]
    fn ambiguous_and_far_words_are_not_suggested() {
        // Distance ≥3 or tied between two keywords → silence, no false "did you mean".
        assert!(
            findings_for(
                "Feature: X\n\
             \n\
             \x20 Somethinglongword: nope\n\
             \n\
             \x20 Scenario: s\n\
             \x20   Given a\n",
            )
            .is_empty()
        );
    }

    #[test]
    fn rule_description_is_linted() {
        let findings = findings_for(
            "Feature: X\n\
             \n\
             \x20 Rule: R\n\
             \x20   When nothing runs\n\
             \n\
             \x20   Scenario: s\n\
             \x20     Given a\n",
        );
        assert_eq!(findings.len(), 1, "{findings:?}");
        assert!(
            findings[0].1.contains("'When' sits in the Rule"),
            "{findings:?}"
        );
    }

    #[test]
    fn french_dialect_typos_are_matched() {
        let findings = findings_for(
            "# language: fr\n\
             Fonctionnalité: Test\n\
             \n\
             \x20 Scenaro: Connexion\n\
             \x20   Soit un utilisateur \"alice\"\n",
        );
        assert!(
            findings
                .iter()
                .any(|(_, m)| m.contains("did you mean 'Scénario'")),
            "{findings:?}"
        );
    }

    #[test]
    fn unparseable_file_is_an_error() {
        let mut tmp = tempfile::NamedTempFile::with_suffix(".feature").unwrap();
        std::io::Write::write_all(
            &mut tmp,
            b"Feature: Broken\n  Scenario: A\n    Given a step\n    INVALID_KEYWORD after a step\n",
        )
        .unwrap();
        assert!(lint_file(tmp.path()).is_err());
    }
}
