//! `piccali-cli format` — normalize feature-file layout.
//!
//! Indentation ladder (+1 unit per nesting level), blank-line placement, and data-table pipe alignment.
//! Layout only: keywords, comments, description text and docstring contents are never modified, and the formatted file parses to the exact same document.
//! Idempotent.
//!
//! Lines are classified from the `gherkin` AST's recorded positions rather than by matching keywords, so prose inside descriptions
//! (e.g. a line starting with `Scenario:`) is never mistaken for structure.
//! Table rows are found by walking from each table's first row; anything the AST does not claim (comments, descriptions, docstrings) passes through verbatim.
//!
//! Style comes from `.editorconfig` (`[*.feature]` sections): `indent_style`, `indent_size`/`tab_width`, and the custom `piccali_table_cell_right_align_numeric_content` (default `true`, Reqnroll-style).
//! Without an `.editorconfig`, files get the house style: 2-space indentation.

use color_eyre::eyre::{Context, Result, bail};
use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};

use crate::parser;

/// Style knobs for one file, resolved from `.editorconfig`.
struct Style {
    /// One ladder step, e.g. `"  "` or `"\t"`.
    unit: String,
    /// Right-align numeric cell content within the padded column.
    right_align_numeric: bool,
}

fn style_for(path: &Path) -> Style {
    // editorconfig lookup walks up from the file's directory; a bare file
    // name has none, so resolve it against the working directory first.
    let path = std::path::absolute(path).unwrap_or_else(|_| path.to_path_buf());
    // A malformed .editorconfig is not fatal: warn and use the house style.
    let props = match editorconfig_core::properties(&path) {
        Ok(props) => props,
        Err(err) => {
            eprintln!(
                "warning: could not read editorconfig for {}: {err:?}",
                path.display()
            );
            HashMap::new()
        }
    };
    style_from_props(&props)
}

fn style_from_props(props: &HashMap<String, String>) -> Style {
    let unit = match props.get("indent_style").map(String::as_str) {
        Some("tab") => "\t".to_string(),
        _ => match props
            .get("indent_size")
            .filter(|v| *v != "tab")
            .or_else(|| props.get("tab_width"))
            .and_then(|v| v.parse::<usize>().ok())
        {
            Some(n) if n > 0 => " ".repeat(n),
            _ => "  ".to_string(),
        },
    };
    let right_align_numeric = props
        .get("piccali_table_cell_right_align_numeric_content")
        .map(|v| v == "true")
        .unwrap_or(true);
    Style {
        unit,
        right_align_numeric,
    }
}

/// Format one in-memory buffer (the LSP server's `textDocument/formatting`).
/// Style comes from the file's `.editorconfig`, exactly as on the command line.
pub(crate) fn format_buffer(raw: &str, path: &Path) -> Result<String> {
    format_text(raw, path, &style_for(path))
}

/// Read one buffer from stdin, format it, print it to stdout.
/// `path` names the buffer: `.editorconfig` lookup and error messages only.
fn format_stdin(path: &str) -> Result<()> {
    use std::io::Read;
    let mut raw = String::new();
    std::io::stdin()
        .read_to_string(&mut raw)
        .wrap_err("Could not read from stdin")?;
    let stripped = raw.strip_prefix('\u{FEFF}').unwrap_or(&raw);

    let formatted = format_buffer(stripped, Path::new(path))?;
    print!("{formatted}");
    Ok(())
}

/// A file whose formatted text differs from its current contents.
struct Plan {
    path: PathBuf,
    old: String,
    new: String,
    had_bom: bool,
}

impl Plan {
    fn new_text(&self) -> String {
        if self.had_bom {
            format!("\u{FEFF}{}", self.new)
        } else {
            self.new.clone()
        }
    }
}

/// Entry point for the `format` subcommand.
///
/// Readonly by default: prints a unified diff per unformatted file and exits non-zero when any file would change.
/// With `fix`, files are rewritten in place.
/// Transactional like `fix`: every file is parsed and formatted first; if any fails to parse, nothing is written.
///
/// With `stdin_file_path`, reads stdin instead of files and prints the
/// formatted buffer to stdout (exit 0) — the editor-integration mode used by
/// external formatters such as Zed's.
pub fn run(paths: &[String], fix: bool, stdin_file_path: Option<&str>) -> Result<()> {
    if let Some(path) = stdin_file_path {
        return format_stdin(path);
    }

    let files = parser::resolve_files(paths)?;
    if files.is_empty() {
        bail!("No feature files found for: {}", paths.join(", "));
    }

    // Phase 1: parse and format everything before touching any file.
    let mut plans = Vec::new();
    let mut failures: Vec<(PathBuf, color_eyre::Report)> = Vec::new();
    for path in &files {
        match plan_file(path) {
            Ok(Some(plan)) => plans.push(plan),
            Ok(None) => {}
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

    if plans.is_empty() {
        println!("All {} file(s) are already formatted.", files.len());
        return Ok(());
    }

    if fix {
        for plan in &plans {
            std::fs::write(&plan.path, plan.new_text())
                .wrap_err_with(|| format!("Could not write {}", plan.path.display()))?;
            println!("{}: reformatted", plan.path.display());
        }
        println!("Reformatted {} of {} file(s).", plans.len(), files.len());
    } else {
        for plan in &plans {
            print!("{}", unified_diff(&plan.old, &plan.new, &plan.path));
        }
        bail!(
            "{} of {} file(s) would be reformatted.",
            plans.len(),
            files.len()
        );
    }
    Ok(())
}

/// Read and format one file; `Ok(None)` when already formatted.
fn plan_file(path: &Path) -> Result<Option<Plan>> {
    let raw = std::fs::read_to_string(path)
        .wrap_err_with(|| format!("Could not read path: {}", path.display()))?;
    let had_bom = raw.starts_with('\u{FEFF}');
    let stripped = raw.strip_prefix('\u{FEFF}').unwrap_or(&raw).to_string();

    let new = format_text(&stripped, path, &style_for(path))?;

    if new == stripped {
        Ok(None)
    } else {
        Ok(Some(Plan {
            path: path.to_path_buf(),
            old: stripped,
            new,
            had_bom,
        }))
    }
}

fn unified_diff(old: &str, new: &str, path: &Path) -> String {
    let name = path.display().to_string();
    similar::TextDiff::from_lines(old, new)
        .unified_diff()
        .context_radius(3)
        .header(&name, &name)
        .to_string()
}

/// What a line is, for blank-line placement.
/// Only structural kinds carry a ladder level in [`Classification::levels`].
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Kind {
    /// Header line of a block unit (feature, rule, background, scenario, examples) or the topmost tag line above one:
    /// exactly one blank line before it unless it opens the file.
    UnitStart,
    /// Header line whose tags above already started the unit: glued to them.
    UnitHead,
    /// Tag line continuing the unit above: no blank between tags.
    Tag,
    /// Step keyword line: no blank around it.
    Step,
    /// Data-table row: no blank around it; realigned with its table.
    TableRow,
    /// Docstring opening/closing fence: no blank around it.
    Fence,
    /// Inside a docstring: passed through untouched, blanks included.
    Docstring,
    /// Comments and description text: verbatim; blank runs only collapsed.
    Verbatim,
}

/// AST-derived classification of every line (index = line number - 1).
struct Classification {
    kinds: Vec<Kind>,
    levels: Vec<Option<usize>>,
    /// Row line numbers (1-based) per table, in file order.
    tables: Vec<Vec<usize>>,
    /// (line, level) of steps that carry a docstring.
    docstring_steps: Vec<(usize, usize)>,
}

fn classify(feature: &gherkin::Feature, lines: &[String]) -> Classification {
    let mut c = Classification {
        kinds: vec![Kind::Verbatim; lines.len()],
        levels: vec![None; lines.len()],
        tables: Vec::new(),
        docstring_steps: Vec::new(),
    };

    // Pass 1: structural nodes (everything except docstring interiors).
    c.mark_unit(feature.position.line, 0, lines);
    if let Some(bg) = &feature.background {
        c.mark_steps(2, &bg.steps, lines);
    }
    for sc in &feature.scenarios {
        c.mark_scenario(sc, 1, lines);
    }
    for rule in &feature.rules {
        c.mark_unit(rule.position.line, 1, lines);
        if let Some(bg) = &rule.background {
            c.mark_steps(3, &bg.steps, lines);
        }
        for sc in &rule.scenarios {
            c.mark_scenario(sc, 2, lines);
        }
    }

    // Pass 2: docstrings, now that every structural anchor is known.
    let anchors: BTreeSet<usize> = c
        .kinds
        .iter()
        .enumerate()
        .filter(|(_, k)| **k != Kind::Verbatim)
        .map(|(i, _)| i + 1)
        .collect();
    let docstring_steps = c.docstring_steps.clone();
    for &(step_line, level) in &docstring_steps {
        let next = anchors
            .range(step_line + 1..)
            .next()
            .copied()
            .unwrap_or(lines.len() + 1);
        c.mark_docstring(step_line + 1..next, level, lines);
    }
    c
}

impl Classification {
    fn mark_line(&mut self, line: usize, kind: Kind, level: Option<usize>) {
        if line >= 1 && line <= self.kinds.len() {
            self.kinds[line - 1] = kind;
            self.levels[line - 1] = level;
        }
    }

    /// Mark a unit header plus the tag lines directly above it.
    /// The topmost  tag line starts the unit; tags closer to the header and the header itself (when tags exist) are glued continuations.
    fn mark_unit(&mut self, line: usize, level: usize, lines: &[String]) {
        let mut tags = Vec::new();
        let mut i = line.saturating_sub(1);
        while i >= 1 && lines[i - 1].trim_start().starts_with('@') {
            tags.push(i);
            i -= 1;
        }
        let header_kind = if tags.is_empty() {
            Kind::UnitStart
        } else {
            Kind::UnitHead
        };
        self.mark_line(line, header_kind, Some(level));
        for (n, &tag) in tags.iter().enumerate() {
            let kind = if n + 1 == tags.len() {
                Kind::UnitStart
            } else {
                Kind::Tag
            };
            self.mark_line(tag, kind, Some(level));
        }
    }

    fn mark_scenario(&mut self, sc: &gherkin::Scenario, level: usize, lines: &[String]) {
        self.mark_unit(sc.position.line, level, lines);
        self.mark_steps(level + 1, &sc.steps, lines);
        for ex in &sc.examples {
            self.mark_unit(ex.position.line, level + 1, lines);
            if let Some(table) = &ex.table {
                self.mark_table(table.position.line, level + 2, lines);
            }
        }
    }

    fn mark_steps(&mut self, level: usize, steps: &[gherkin::Step], lines: &[String]) {
        for step in steps {
            self.mark_line(step.position.line, Kind::Step, Some(level));
            if let Some(table) = &step.table {
                self.mark_table(table.position.line, level + 1, lines);
            }
            if step.docstring.is_some() {
                self.docstring_steps.push((step.position.line, level));
            }
        }
    }

    /// Walk the contiguous `|`-prefixed rows starting at `first_row_line`.
    fn mark_table(&mut self, first_row_line: usize, level: usize, lines: &[String]) {
        let mut rows = Vec::new();
        let mut i = first_row_line;
        while i <= lines.len() && lines[i - 1].trim_start().starts_with('|') {
            self.mark_line(i, Kind::TableRow, Some(level));
            rows.push(i);
            i += 1;
        }
        if !rows.is_empty() {
            self.tables.push(rows);
        }
    }

    /// Mark fences and interior of one docstring inside `region` (exclusive of the step line and the next structural anchor).
    /// Interior lines are untouched; lines outside the fence pair stay verbatim.
    fn mark_docstring(&mut self, region: std::ops::Range<usize>, level: usize, lines: &[String]) {
        let mut opened: Option<&'static str> = None;
        for line in region {
            let t = lines[line - 1].trim_start();
            match opened {
                None => {
                    if let Some(delim) = fence_delimiter(t) {
                        opened = Some(delim);
                        self.mark_line(line, Kind::Fence, Some(level + 1));
                    }
                }
                Some(delim) => {
                    if t.starts_with(delim) {
                        self.mark_line(line, Kind::Fence, Some(level + 1));
                        return;
                    }
                    self.mark_line(line, Kind::Docstring, None);
                }
            }
        }
    }
}

fn fence_delimiter(trimmed: &str) -> Option<&'static str> {
    if trimmed.starts_with("\"\"\"") {
        Some("\"\"\"")
    } else if trimmed.starts_with("```") {
        Some("```")
    } else {
        None
    }
}

/// Format raw (BOM-stripped) feature text. `path` is used for error messages.
fn format_text(raw: &str, path: &Path, style: &Style) -> Result<String> {
    let feature = parser::parse_raw_feature_text(raw, path)?;
    let mut lines: Vec<String> = raw.split('\n').map(str::to_string).collect();
    // A final newline yields a trailing empty piece; re-added at the end.
    if lines.last().is_some_and(|l| l.is_empty()) {
        lines.pop();
    }

    let c = classify(&feature, &lines);
    align_tables(&mut lines, &c.tables, style);
    let mut out = emit(&lines, &c, &style.unit, raw.contains("\r\n"));
    // Exactly one trailing newline, no trailing blank lines.
    while out.last().is_some_and(|l| l.trim().is_empty()) {
        out.pop();
    }
    out.push(String::new());
    Ok(out.join("\n"))
}

/// Blank-line placement and indentation, in one pass over the classified lines.
/// Table rows must already be realigned.
fn emit(lines: &[String], c: &Classification, unit: &str, crlf: bool) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut pending_blank = false;
    let last_blank = |out: &Vec<String>| out.last().is_some_and(|l| l.trim().is_empty());

    for i in 0..lines.len() {
        let kind = c.kinds[i];
        let line = &lines[i];

        if kind == Kind::Docstring {
            // Docstring content is untouchable, blanks included.
            out.push(line.clone());
            continue;
        }

        if line.trim().is_empty() {
            pending_blank = true;
            continue;
        }

        match kind {
            Kind::UnitStart => {
                // Exactly one blank line before a new unit, whether the source had none, one, or several.
                if !out.is_empty() && !last_blank(&out) {
                    blank_line(&mut out, crlf);
                }
                pending_blank = false;
                push_indented(&mut out, line, c.levels[i], unit);
            }
            Kind::UnitHead | Kind::Tag | Kind::Step | Kind::TableRow | Kind::Fence => {
                // Glued to their unit: drop any blank in front.
                pending_blank = false;
                push_indented(&mut out, line, c.levels[i], unit);
            }
            Kind::Verbatim => {
                if pending_blank && !out.is_empty() && !last_blank(&out) {
                    blank_line(&mut out, crlf);
                }
                pending_blank = false;
                out.push(line.clone());
            }
            Kind::Docstring => unreachable!(),
        }
        // One blank after a header, but only when prose follows:
        // another unit already forces its own blank, and steps, tables and fences are glued to their parent.
        if matches!(kind, Kind::UnitStart | Kind::UnitHead)
            && !line.trim_start().starts_with('@')
            && next_kind(lines, c, i) == Kind::Verbatim
        {
            blank_line(&mut out, crlf);
        }
    }
    out
}

/// An emitted blank line keeps the file's line ending.
fn blank_line(out: &mut Vec<String>, crlf: bool) {
    if crlf {
        out.push("\r".to_string());
    } else {
        out.push(String::new());
    }
}

/// Kind of the next non-blank line after `i`, or `Verbatim` at end of file.
fn next_kind(lines: &[String], c: &Classification, i: usize) -> Kind {
    for (j, l) in lines.iter().enumerate().skip(i + 1) {
        if !l.trim().is_empty() {
            return c.kinds[j];
        }
    }
    Kind::Verbatim
}

fn push_indented(out: &mut Vec<String>, line: &str, level: Option<usize>, unit: &str) {
    let indent = unit.repeat(level.unwrap_or(0));
    out.push(format!("{indent}{}", line.trim_start()));
}

/// Realign every table: one space of padding per cell side, pipes aligned, numeric cell content right-aligned when the style asks for it.
fn align_tables(lines: &mut [String], tables: &[Vec<usize>], style: &Style) {
    for rows in tables {
        let parsed: Vec<(Vec<String>, Option<String>, bool)> =
            rows.iter().map(|&i| split_row(&lines[i - 1])).collect();
        let cols = parsed
            .iter()
            .map(|(cells, _, _)| cells.len())
            .max()
            .unwrap_or(0);
        let mut widths = vec![0usize; cols];
        for (cells, _, _) in &parsed {
            for (col, cell) in cells.iter().enumerate() {
                widths[col] = widths[col].max(cell.chars().count());
            }
        }
        for ((cells, comment, had_cr), &line_no) in parsed.iter().zip(rows) {
            let mut out = String::from("|");
            for (col, cell) in cells.iter().enumerate() {
                let w = widths.get(col).copied().unwrap_or(0);
                out.push(' ');
                if style.right_align_numeric && is_numeric(cell) {
                    out.push_str(&format!("{cell:>w$}"));
                } else {
                    out.push_str(&format!("{cell:<w$}"));
                }
                out.push_str(" |");
            }
            if let Some(comment) = comment {
                out.push(' ');
                out.push_str(comment);
            }
            if *had_cr {
                out.push('\r');
            }
            lines[line_no - 1] = out;
        }
    }
}

/// Split a table row into cells, its trailing comment (if any), and whether the line ended in `\r` (preserved on rebuild).
/// Escaped `\|` stays part of the cell content.
fn split_row(line: &str) -> (Vec<String>, Option<String>, bool) {
    let had_cr = line.ends_with('\r');
    let line = line.strip_suffix('\r').unwrap_or(line);
    let row = parser::strip_table_row_comment(line);
    let comment = if row.len() < line.len() {
        let c = line[row.len()..].trim_start();
        (!c.is_empty()).then(|| c.to_string())
    } else {
        None
    };
    (split_cells(row), comment, had_cr)
}

/// Split a `|`-delimited row on unescaped pipes.
/// The leading pipe opens the row; the trailing pipe's tail is dropped (the comment is kept separately).
fn split_cells(row: &str) -> Vec<String> {
    let mut cells = Vec::new();
    let mut cur = String::new();
    let mut escaped = false;
    let mut seen_open = false;
    for ch in row.chars() {
        if escaped {
            cur.push('\\');
            cur.push(ch);
            escaped = false;
        } else if ch == '\\' {
            escaped = true;
        } else if ch == '|' {
            if seen_open {
                cells.push(cur.trim().to_string());
            } else {
                seen_open = true;
            }
            cur.clear();
        } else {
            cur.push(ch);
        }
    }
    cells
}

/// Numeric-looking cell content (digits with sign/decimal separators).
fn is_numeric(cell: &str) -> bool {
    let mut saw_digit = false;
    for ch in cell.chars() {
        match ch {
            '0'..='9' => saw_digit = true,
            '+' | '-' | '.' | ',' | ' ' => {}
            _ => return false,
        }
    }
    saw_digit
}

#[cfg(test)]
mod tests {
    use super::*;

    const MESSY: &str = "\
# language: en
Feature: Kitchen sink
   As a user
      I want formatting

    @smoke @wip
  Scenario: Tables
      Given a table
          | name | qty |
         | car | 1 |
          | plane | 250 |
      When a docstring
        \"\"\"
        ## Heading

          body stays
        \"\"\"
      Then done


  Rule: Nested

        Scenario: In rule
            Given nothing
";

    fn format_with(raw: &str, style: &Style) -> String {
        format_text(raw, Path::new("test.feature"), style).unwrap()
    }

    fn house_style() -> Style {
        Style {
            unit: "  ".to_string(),
            right_align_numeric: true,
        }
    }

    #[test]
    fn formats_indentation_blanks_and_tables() {
        insta::assert_snapshot!(format_with(MESSY, &house_style()));
    }

    #[test]
    fn formatting_is_idempotent() {
        let once = format_with(MESSY, &house_style());
        assert_eq!(once, format_with(&once, &house_style()));
    }

    #[test]
    fn formatting_preserves_the_parsed_document() {
        // The formatted file must parse to the same document — the safety
        // net against content loss.
        use std::collections::HashMap as TagLinks;
        let dir = tempfile::tempdir().unwrap();
        let before_path = dir.path().join("before.feature");
        let after_path = dir.path().join("after.feature");
        std::fs::write(&before_path, MESSY).unwrap();
        let formatted = format_with(MESSY, &house_style());
        std::fs::write(&after_path, formatted).unwrap();

        let before = crate::parser::parse_feature_file(&before_path, &TagLinks::new()).unwrap();
        let after = crate::parser::parse_feature_file(&after_path, &TagLinks::new()).unwrap();
        assert_eq!(
            serde_json::to_string(&before).unwrap(),
            serde_json::to_string(&after).unwrap()
        );
    }

    #[test]
    fn docstring_content_and_comments_are_untouched() {
        let formatted = format_with(MESSY, &house_style());
        assert!(formatted.contains("        ## Heading\n"));
        assert!(formatted.contains("          body stays"));
        assert!(formatted.contains("# language: en"));
    }

    #[test]
    fn editorconfig_props_drive_the_style() {
        let mut props = HashMap::new();
        props.insert("indent_style".to_string(), "space".to_string());
        props.insert("indent_size".to_string(), "4".to_string());
        props.insert(
            "piccali_table_cell_right_align_numeric_content".to_string(),
            "false".to_string(),
        );
        let style = style_from_props(&props);
        assert_eq!(style.unit, "    ");
        assert!(!style.right_align_numeric);
        let formatted = format_with(MESSY, &style);
        assert!(formatted.contains("    Scenario: Tables"));
    }

    #[test]
    fn tab_style_uses_one_tab_per_level() {
        let style = Style {
            unit: "\t".to_string(),
            right_align_numeric: true,
        };
        let formatted = format_with(MESSY, &style);
        assert!(formatted.contains("\tScenario: Tables"));
        assert!(formatted.contains("\t\tGiven a table"));
    }

    #[test]
    fn crlf_line_endings_survive_table_rows() {
        let raw = "Feature: CR\r\n\r\n  Scenario: Table\r\n    Given rows\r\n      | a | b |\r\n      | 1 | 22 |\r\n";
        let formatted = format_with(raw, &house_style());

        assert!(formatted.contains("| a | b  |\r\n"));
        assert!(formatted.contains("| 1 | 22 |\r\n"));
    }
}
