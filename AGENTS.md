# AGENTS.md — piccali-cli

## Project Summary

`piccali-cli` Rust CLI parse Gherkin `.feature` files, output JSON, Markdown, or HTML.
Embed React/Vite viewer, serve via built-in HTTP server.

- Rust code: `src/`, `tests/`
- Frontend code: `template/` (React 19, Vite 8, TanStack Router, shadcn/ui)
- Gherkin samples: `features/`

## Repo Layout

```text
piccali-cli/
├── src/
│   ├── main.rs
│   ├── cli.rs
│   ├── format.rs
│   ├── parser.rs
│   ├── models.rs
│   └── server.rs
├── tests/
│   ├── json_format.rs
│   ├── markdown_format.rs
│   ├── validation.rs
│   ├── common/
│   └── snapshots/
├── features/
└── template/
    ├── package.json
    ├── biome.json
    ├── tsconfig*.json
    └── src/
```

## Build, Lint, Test Commands

### Rust (run from repo root)

- Build debug: `cargo build`
- Build release: `cargo build --release`
- Run CLI (dry-run JSON): `cargo run -- --format json --dry-run`
- Run all tests: `cargo test`
- Run tests with captured output shown: `cargo test -- --nocapture`
- Lint: `cargo clippy`
- Format: `cargo fmt`
- Check format only: `cargo fmt --check`

### Rust: Running a Single Test (important)

- By test name substring: `cargo test missing_output_and_dry_run_fails`
- One integration test file: `cargo test --test json_format`
- One test in one integration file: `cargo test --test json_format json_simple_feature`
- Single test with stdout/stderr: `cargo test --test json_format json_simple_feature -- --nocapture`

### Snapshot workflow (Insta)

- Accept all snapshot changes: `INSTA_UPDATE=always cargo test`
- Accept only new snapshots: `INSTA_UPDATE=unseen cargo test`
- Review snapshots interactively: `cargo insta review`

Snapshots stored in `tests/snapshots/`. Commit updated `.snap` files when behavior change is intentional.

### Frontend (run from `template/`)

- Install deps: `bun install`
- Dev server: `bun run start`
- Build: `bun run build`
- Type-check: `bun run check:types`
- Lint: `bun run lint`
- Lint fix: `bun run lint:fix`
- Format check: `bun run format`
- Format fix: `bun run format:fix`
- Test once: `bun run test`
- Test watch: `bun run test:watch`

## Code Style Guidelines

### General

- Keep changes minimal + targeted; preserve structure and naming.
- Do not edit generated files unless required.
- Follow existing patterns before new abstractions.

### Rust Style

#### Imports

- Group imports.
- Prefer explicit imports; avoid wildcard imports (`*`) outside test conveniences.

#### Error handling

- Project uses `color_eyre::eyre::Result` broadly in runtime code.
- Use `?` for propagation.
- Add context with `eyre!(...)` or `bail!(...)` and clear messages.
- In libraries/helpers, return rich errors, not panics.
- Avoid `.unwrap()` in non-test code; use safe fallbacks or propagated errors.

#### Types and serialization

- Models use `serde` derives (`Serialize`, `Deserialize`).
- JSON field shape often uses camelCase (`#[serde(rename_all = "camelCase")]`).
- Use `Option<T>` for optional data and `Vec<T>` for repeated fields.
- Prefer owned data (`String`, `Vec<T>`) in persisted structs.

#### Formatting/linting

- Pass `cargo fmt --check` and `cargo clippy` before finalizing.
- Do not suppress Clippy warnings without strong documented reason.

### TypeScript/React Style (`template/`)

#### Compiler constraints

- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- `verbatimModuleSyntax: true`: use type-only imports where appropriate.
- `erasableSyntaxOnly: true`: avoid `enum`/`namespace`; use unions/const objects.

#### Naming

- Components: `PascalCase.tsx`.
- Non-component modules: `camelCase.ts`.
- Variables/functions/hooks: `camelCase`.

#### Imports and paths

- Use named imports.
- Use inline `type` modifiers for type-only imports.
- Prefer `@/` alias for cross-folder imports in `template/src/`.

#### Formatting/linting

- Biome is the source of truth (`template/biome.json`).
- Use tabs for indentation and double quotes.
- Respect Biome excludes (`dist`, `src/index.css`, `src/routeTree.gen.ts`).

#### Routing

- TanStack Router file-based routes live in `template/src/routes/`.
- `template/src/routeTree.gen.ts` is generated; do not hand-edit.

## Testing Guidelines

- Integration tests are in `tests/*.rs` and use `assert_cmd`.
- Use `predicates` for stderr/stdout checks.
- Snapshot-heavy tests use `insta`.
- Test names should describe behavior, not implementation detail.
