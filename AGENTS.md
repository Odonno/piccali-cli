# AGENTS.md — piccali-cli

Guidance for agentic coding agents operating in this repository.

---

## Project Overview

`piccali-cli` is a Rust CLI tool that parses Gherkin `.feature` files and outputs structured data (JSON, HTML). It embeds a React + Vite frontend viewer and can serve it via a built-in HTTP server. The frontend lives in `template/` and reads `data.json` + `metadata.json` at runtime.

**Languages:**

- Rust (CLI, `src/`, `tests/`, `build.rs`) — edition 2024
- TypeScript + TSX (frontend, `template/`) — React 19, Vite 8, TanStack Router, shadcn/ui
- Gherkin examples (input artifacts, `features/`)

---

## Repository Structure

```
piccali-cli/
├── build.rs              # Cargo build script: parses features/ → template/public/data.json,
│                         # then runs `bun run build` in template/
├── Cargo.toml
├── src/
│   ├── main.rs           # CLI entry (clap), file discovery, orchestration, serve mode
│   ├── models.rs         # Serde-annotated data model structs/enums
│   ├── parser.rs         # Gherkin .feature parser + folder tree builder
│   ├── formatter.rs      # JSON/HTML output formatters + metadata
│   └── server.rs         # Embedded tiny_http server with rust-embed frontend assets
├── tests/
│   ├── json_output.rs    # Integration tests (assert_cmd + insta snapshots)
│   └── snapshots/        # Insta snapshot files (.snap)
├── features/             # Input Gherkin .feature files (examples)
└── template/             # Embedded React frontend viewer
    ├── package.json      # bun-managed; scripts: start, build, lint, format, lint:fix, format:fix
    ├── biome.json        # Biome linter/formatter config (tabs, double quotes)
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── routes/       # TanStack Router file-based routes
        ├── components/
        ├── context/
        ├── hooks/
        ├── functions/
        ├── lib/
        └── types/
```

---

## Build, Lint, Test, Format Commands

### Rust CLI (run from repo root)

| Task                      | Command                                   |
| ------------------------- | ----------------------------------------- |
| Build (debug)             | `cargo build`                             |
| Build (release)           | `cargo build --release`                   |
| Run CLI                   | `cargo run -- --formatter json --dry-run` |
| Run all tests             | `cargo test`                              |
| Run all tests with stdout | `cargo test -- --nocapture`               |
| Run a single test         | `cargo test <test_name_substring>`        |
| Run all tests in a file   | `cargo test --test json_output`           |
| Lint                      | `cargo clippy`                            |
| Format                    | `cargo fmt`                               |
| Check formatting          | `cargo fmt --check`                       |

### Running a Single Test

```bash
# Match by substring of the test function name
cargo test missing_output_and_dry_run_fails
cargo test json_simple_feature -- --nocapture

# Run all tests in a specific integration test file
cargo test --test json_output
```

### Insta Snapshot Tests

```bash
# Auto-accept all new/changed snapshots
INSTA_UPDATE=always cargo test

# Auto-accept only new (unseen) snapshots
INSTA_UPDATE=unseen cargo test

# Interactively review and approve snapshots
cargo insta review
```

Snapshots live in `tests/snapshots/` as `<test_file>__<snapshot_name>.snap`. Always commit updated snapshots when intentional behavior changes.

### Frontend Template (run from `template/`)

| Task              | Command              |
| ----------------- | -------------------- |
| Dev server        | `bun run start`      |
| Build             | `bun run build`      |
| Lint              | `bun run lint`       |
| Lint (auto-fix)   | `bun run lint:fix`   |
| Format (check)    | `bun run format`     |
| Format (auto-fix) | `bun run format:fix` |
| Preview built app | `bun run preview`    |

---

## Rust Code Style

### File & Module Naming

- Files: `snake_case` (`models.rs`, `parser.rs`, `formatter.rs`, `server.rs`)
- Modules declared in `main.rs` with `mod <name>;`, used via `crate::<name>` or direct `use`

### Naming Conventions

- Functions/methods/variables: `snake_case`
- Structs/Enums/Traits: `PascalCase`
- Enum variants: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Imports

- Group order: standard library → external crates → local `crate::` imports
- Use explicit `use` paths; avoid glob imports (`use foo::*`) unless in tests
- Prefer `use crate::models::Foo` over long inline paths

### Error Handling

- Functions that can fail return `Result<T, String>` — `String` is the error carrier throughout (no custom error types)
- Convert library errors with `.map_err(|e| format!("context: {e}"))`
- Propagate with `?` inside functions returning `Result`
- In `main.rs`: match on `Result`, print errors with `eprintln!("{error}")`, exit with `process::exit(1)`
- In `build.rs`: use `.expect("message")` — build failures should be hard panics
- Never use bare `.unwrap()` in `src/`; prefer `.unwrap_or_default()` or `.unwrap_or_else(|| ...)`

### Types & Data Modeling

- Use `serde` derive macros (`Serialize`, `Deserialize`) on all model structs/enums in `models.rs`
- Use `#[serde(skip_serializing_if = "Option::is_none")]` on optional fields
- Use `#[serde(skip_serializing_if = "Vec::is_empty")]` on Vec fields
- Use `#[serde(rename_all = "camelCase")]` on structs or field-level `#[serde(rename = "...")]` for JSON shape
- Prefer owned types (`String`, `Vec<T>`) in structs; use `&str` only in short-lived functions
- Use `Option<T>` for optional fields

### Clippy

- Code must pass `cargo clippy` without warnings
- Do not `#[allow(clippy::...)]` unless there is a strong reason; prefer fixing the warning

---

## TypeScript / React Code Style (template/)

### Compiler & Strictness

- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `verbatimModuleSyntax: true` — always use `import type` or inline `type` for type-only imports
- `erasableSyntaxOnly: true` — no `enum`, no `namespace`; use `const` objects or union types instead

### Naming Conventions

- React component files: `PascalCase` with `.tsx` extension (`AppSidebar.tsx`)
- Utility/logic files: `camelCase` with `.ts` extension (`utils.ts`, `feature.ts`)
- Functions and variables: `camelCase`

### Imports

- Use named imports: `import { useState } from "react"`
- Use `type` keyword inline for type-only imports: `import { clsx, type ClassValue } from "clsx"`
- Use the `@/` path alias for cross-directory imports within `src/`: `import { cn } from "@/lib/utils"`

### Linting & Formatting

- **Biome** (`@biomejs/biome`) — not ESLint. Config lives in `template/biome.json`
- Indent style: **tabs**; Quote style: **double quotes**
- `bun run lint` — `biome lint .` (report only)
- `bun run lint:fix` — auto-fix lint issues
- `bun run format` — `biome format .` (check only)
- `bun run format:fix` — auto-fix formatting
- Excludes: `dist/`, `src/index.css`, `src/routeTree.gen.ts`

### Routing

- TanStack Router v1 with file-based routing (`src/routes/`)
- `src/routeTree.gen.ts` is **auto-generated** by the Vite plugin — do not edit manually
- Route file naming conventions: `__root.tsx`, `index.tsx`, `features.$.tsx` (splat route)

---

## Testing Guidelines

### Integration Tests (Rust)

- Live in `tests/` as separate files (e.g., `tests/json_output.rs`)
- Use `assert_cmd::Command` to invoke the compiled binary via `piccali()` helper
- Use `predicates` crate for stdout/stderr assertions
- Use `insta::assert_json_snapshot!("snapshot_name", value)` for snapshot tests
- Group tests with comment dividers: `// --- Section name ---`
- Name test functions descriptively in `snake_case`

### Unit Tests (Rust)

- Place unit tests in `#[cfg(test)]` modules at the bottom of the relevant `src/` file
- Name test functions descriptively in `snake_case`

### Adding New Snapshot Tests

1. Write the test calling `insta::assert_json_snapshot!("name", &actual)`
2. Run `INSTA_UPDATE=unseen cargo test` to generate the initial snapshot
3. Verify the snapshot content in `tests/snapshots/`
4. Commit the `.snap` file alongside the test code

---

## Build Script Notes

`build.rs` runs automatically on every `cargo build` when files in `features/` change. It:

1. Discovers all `.feature` files recursively under `features/`
2. Parses them with the same logic as the CLI
3. Writes the result to `template/public/data.json`
4. Runs `bun run build` in `template/` to rebuild the frontend

`template/public/data.json` and `template/public/metadata.json` are **not committed** to git. Do not manually edit it.

---

## Key Dependencies

### Rust

- `clap` — CLI argument parsing (derive feature)
- `gherkin` — Gherkin `.feature` file parsing
- `serde` + `serde_json` — serialization
- `globset` + `walkdir` — file discovery
- `chrono` — UTC timestamps for metadata
- `rust-embed` — embeds `template/dist/` into the binary at compile time
- `tiny_http` — lightweight embedded HTTP server
- `assert_cmd`, `predicates`, `insta` — test utilities

### Frontend

- React 19, Vite 8
- TanStack Router (file-based routing)
- shadcn/ui + Radix UI primitives
- Tailwind CSS v4
- TypeScript 5
- Biome 2 (linter + formatter)
