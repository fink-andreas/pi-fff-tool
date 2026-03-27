# PLAN.md

## Goal
Build a standalone pi extension that adds a `file_search` tool backed by `fff.nvim`'s native search engine for fast file discovery in pi.

## Exploration summary

### Current project (`/home/afi/dvl/pi-fff-tool`)
- Minimal repo right now:
  - `README.md`
  - `LICENSE`
- No project-specific `AGENTS.md` in this repo root.
- New project scaffolding, packaging, docs, and tests still need to be created.

### Reference repo: `pi-mono` (`/tmp/pi-mono`)
Relevant findings:
- pi supports extensions registered via `pi.registerTool()` / `pi.registerCommand()`.
- Example extensions live under `packages/coding-agent/examples/extensions`.
- Important examples:
  - `hello.ts` — smallest custom tool example.
  - `dynamic-tools.ts` — runtime tool registration patterns.
  - `with-deps/` — extension with its own `package.json` and dependencies.
  - `README.md` in that folder documents expected extension shape.
- Extension packaging pattern supports a `package.json` with:
  - `type: module`
  - `pi.extensions: ["./index.js" | "./index.ts"]`
- Tools return `{ content, details }` and can expose JSON-schema-like parameters.

### Reference repo: `fff.nvim` (`/tmp/fff.nvim`)
Relevant findings:
- This repo is not just a Neovim plugin; it includes reusable runtime packages and native crates.
- The best integration target is `packages/fff-node`.
- `@ff-labs/fff-node` already exists and is publishable.
- `FileFinder` API supports:
  - `FileFinder.create({ basePath, frecencyDbPath?, historyDbPath?, warmupMmapCache?, aiMode? })`
  - `fileSearch(query, { pageSize, pageIndex, ... })`
  - `grep(query, { mode, timeBudgetMs, beforeContext, afterContext, ... })`
  - `multiGrep(...)`
  - scan lifecycle helpers like `waitForScan`, `scanFiles`, `restartIndex`, `refreshGitStatus`
- Search results already include:
  - relative/absolute paths
  - score objects
  - grep matches with line numbers and context
- Packaging model includes optional platform-specific binary packages, which is promising for npm distribution.
- There is also `crates/fff-mcp`, but for this project a pi-native extension is simpler than wrapping FFF's MCP server.

### Reference repo: `pi-linear-tools` (`/tmp/pi-linear-tools`)
Useful structure and release patterns:
- Standalone pi extension package with:
  - `package.json`
  - top-level `index.js` extension entrypoint
  - optional `extensions/` wrapper for local testing
  - `bin/` CLI entrypoint when needed
  - `scripts/dev-sync-local-extension.mjs`
  - `tests/` with package manifest and extension-registration tests
  - release docs/checklist
- `package.json` uses:
  - package name
  - `pi.extensions`
  - published files whitelist
  - `release:check` script (`npm test && npm pack --dry-run`)
- Tests verify:
  - manifest correctness
  - tool/command registration
  - local behaviors with mocks

## Architecture decision

### Recommended integration path
Use `@ff-labs/fff-node` directly from the extension.

Why:
- Already provides a Node API with typed `FileFinder` abstraction.
- Avoids brittle headless Neovim orchestration.
- Avoids shelling out to a CLI unless packaging/runtime issues force a fallback.
- Best fit for a JS/TS pi extension package.

### Fallback path
If runtime packaging with `ffi-rs` or optional binary packages becomes unreliable in pi environments:
- add a subprocess adapter that invokes a packaged `fff` binary or MCP-compatible executable,
- keep the extension’s external tool contract unchanged.

## Proposed repository structure

```text
.
├── PLAN.md
├── TODO.md
├── README.md
├── LICENSE
├── package.json
├── index.js / index.ts
├── src/
│   ├── extension.ts
│   ├── file-search-tool.ts
│   ├── finder-registry.ts
│   ├── params.ts
│   ├── results.ts
│   ├── settings.ts
│   └── preview.ts
├── extensions/
│   └── pi-file-search.js
├── scripts/
│   └── dev-sync-local-extension.mjs
├── tests/
│   ├── test-package-manifest.js
│   ├── test-extension-registration.js
│   ├── test-file-search-tool.js
│   └── fixtures/
└── docs/
    ├── ARCHITECTURE.md
    └── RELEASE.md
```

## Tool contract proposal

### Tool name
- `file_search`

### Suggested initial scope
Implement file-name fuzzy search first, then optionally extend with content search modes.

### Input
```json
{
  "query": "string",
  "cwd": "string?",
  "includeGlobs": ["string"],
  "excludeGlobs": ["string"],
  "maxResults": 50,
  "timeoutMs": 10000,
  "includeScore": false,
  "previewLines": 0,
  "useIndex": true
}
```

### Output
```json
{
  "results": [
    {
      "path": "string",
      "score": 123,
      "line": 10,
      "preview": "snippet"
    }
  ],
  "meta": {
    "elapsedMs": 12,
    "source": "fff-node"
  },
  "error": "string?"
}
```

## Mapping design: pi tool -> fff-node

### V1 behavior
- `query` -> `finder.fileSearch(query, { pageSize: maxResults })`
- `cwd` -> `FileFinder.create({ basePath: cwd, aiMode: true })`
- `includeScore` -> map `SearchResult.scores[i].total`
- `useIndex` -> choose cached finder instance per cwd when true
- `timeoutMs` -> bound initialization and optional `waitForScan()` period; also cap any preview generation
- `previewLines` -> if > 0, read matched files directly and include first N lines or query-adjacent snippets

### Include/exclude globs
FFF file search favors inline query constraints rather than separate arrays.
Need a translation layer:
- include globs -> prepend constraint tokens where compatible
- exclude globs -> prepend negated constraints where compatible
- if exact parity is not possible, document supported subset clearly

### Preview strategy
Options:
1. No preview in V1 for pure file search.
2. Lightweight preview by reading first N lines of returned files.
3. If later expanding into grep mode, use `finder.grep()` for content-based previews.

Recommended:
- V1: preview only for returned files via direct file reads, capped hard.
- V2: optional content-search mode using `grep()`.

## State and lifecycle design

### Finder registry
Keep one `FileFinder` instance per normalized cwd.
Responsibilities:
- lazy create on first use
- reuse across tool calls for warm index and frecency/history value
- optional idle cleanup / destroy on session shutdown
- support cache invalidation if cwd disappears or changes

### On extension/session lifecycle
- register tool on extension load
- optionally destroy all cached finders on `session_shutdown`
- add a helper command later if needed:
  - `/file-search-reload`
  - `/file-search-health`

## Packaging decisions
- Build as standalone npm package, similar to `pi-linear-tools`.
- Depend on `@ff-labs/fff-node`.
- Publish with `pi.extensions` manifest.
- Add local dev wrapper script under `.pi/extensions/` for live testing.

## Testing plan

### Unit/integration tests
1. package manifest test
2. extension registration test
3. mocked tool execution test
4. real fixture search test against a small fixture tree
5. cache reuse test for same cwd
6. invalid cwd / timeout / missing binary error tests

### Manual validation
- install locally into pi
- restart pi if source install/remove changed
- verify tool appears in tool list
- run queries in a medium repo
- verify output stays concise and deterministic

## Risks
- `ffi-rs` native loading may be sensitive across Node/platform combinations.
- Optional binary package resolution must work inside pi’s extension loading environment.
- FFF query constraint syntax may not map cleanly to `includeGlobs` / `excludeGlobs` arrays.
- Background indexing lifecycle must not leak resources across sessions.

## Implementation phases
1. Scaffold standalone extension package.
2. Add `file_search` tool using `@ff-labs/fff-node` file search only.
3. Add finder cache and cleanup.
4. Add tests and local sync script.
5. Add README, architecture notes, release checklist.
6. Optionally add content-search/preview enhancements.

## Immediate recommendation
Start with a narrow, stable MVP:
- standalone pi extension
- dependency on `@ff-labs/fff-node`
- one `file_search` tool for fuzzy file-name search
- cached `FileFinder` instances by cwd
- concise JSON/text result formatting
- tests modeled after `pi-linear-tools`

That gives a usable first release with the lowest integration risk.

## Follow-up fix: make `fff_grep` appear in pi's `Available tools` prompt section

### Problem summary
`fff_grep` is registered and callable, but it is omitted from the short textual tool list shown in pi's default system prompt.

### Root cause
pi only includes custom extension tools in that `Available tools` summary when the tool definition provides `promptSnippet`.
The extension docs explicitly state that custom tools are left out when `promptSnippet` is omitted.

### Planned fix
- add `promptSnippet` to the `fff_grep` tool registration
- add a matching `promptGuidelines` bullet so the default prompt also nudges the model to use `fff_grep` for file search
- add a regression assertion in extension registration tests

## Follow-up feature: real grep modes for `fff_grep`

### Problem summary
The current `fff_grep` tool is implemented on top of `finder.fileSearch()`, so it only performs fuzzy file/path search. This makes the current contract misleading because it claims support for string/regex pattern grep behavior.

### Goal
Rework `fff_grep` so it performs actual content search using `@ff-labs/fff-node` grep APIs.

### Proposed implementation
- Keep the tool name `fff_grep`.
- Extend the tool parameters with an optional `mode` field:
  - `plain`
  - `regex`
  - `fuzzy`
  - `auto` (default)
- Execution strategy:
  - single pattern + `plain|regex|fuzzy` -> `finder.grep(pattern, { mode })`
  - multiple patterns + `plain|auto` -> `finder.multiGrep({ patterns })` for OR semantics
  - multiple patterns + `regex` -> combine into a regex alternation and call `finder.grep(..., { mode: 'regex' })`
  - multiple patterns + `fuzzy` -> run `finder.grep(patterns.join(' '), { mode: 'fuzzy' })` and document that fuzzy mode treats the full query as one fuzzy expression
  - single pattern + `auto` -> infer `regex` when the pattern looks regex-like, otherwise use `plain`
- Return grep-style results with file path, line number, line content, match ranges, and optional context.
- Update help text, README, architecture notes, and tests to match the real grep behavior.

### Validation
- unit coverage for mode selection and parameter normalization
- integration coverage for:
  - plain grep
  - regex grep
  - multi-pattern OR grep
  - cached finder reuse

## Follow-up redesign: grep-like `fff_grep` tool surface

### Goal
Keep a single `fff_grep` tool, but make its public API feel closer to `grep` / `ripgrep`.

### Proposed clean-break contract
- `query` (required string) — main text or regex to search for
- `or` (optional string[]) — additional OR patterns without introducing a second tool
- `glob` (optional string[]) — include/exclude constraints like `*.rs`, `src/`, `!tests/`
- `regex` (optional boolean) — enable regex search; otherwise use plain text search
- `word` (optional boolean) — request whole-word matching when supported
- `caseSensitive` (optional boolean) — request case-sensitive matching when supported
- `maxResults` (optional number) — total matches to return
- `context` (optional number) — symmetric context before/after each match
- `timeoutMs` / `useIndex` kept as operational controls

### Execution mapping
- plain search: `finder.grep(query, { mode: 'plain' })`
- OR literals: `finder.multiGrep({ patterns: [query, ...or] })`
- regex search: `finder.grep(query, { mode: 'regex' })`
- regex + `or`: combine `[query, ...or]` into a regex alternation
- `glob` constraints are prepended to the query string before grep execution

### Scope
- clean break: remove `patterns`, `mode`, `beforeContext`, `afterContext`, and `maxMatchesPerFile`
- update command help, tests, and README examples to use the new schema
- keep the tool name `fff_grep`

## New feature: package-provided skill for `fff_grep`

### Goal
Expose a package skill so pi discovers `pi-fff-tool` guidance the same way it discovers skills from packages like `pi-autoresearch`.

### Reference analysis: `pi-autoresearch`
Cloned reference repo: `/tmp/pi-autoresearch`

Observed package-level skill integration:
- `package.json` declares `pi.skills: ["./skills"]`
- the repo has a top-level `skills/` directory
- each skill lives in a subdirectory whose name matches the frontmatter `name`
- each skill contains a `SKILL.md` file with frontmatter and concise operational guidance
- no extension-side registration code is required for discovery; packaging is enough

### Planned implementation
1. Add `"./skills"` to `package.json -> pi.skills`.
2. Publish the `skills/` directory in the npm package via `files`.
3. Add a new skill directory with a valid Agent Skills name, likely `skills/fff-grep/SKILL.md`.
4. Keep the skill short, but make it complete enough to cover:
   - what `fff_grep` is for
   - parameter meanings
   - plain / regex / OR / glob usage
   - practical examples and usage rules
5. Update README to mention that the package now ships a skill.
6. Add tests asserting the package manifest exposes skills and the skill file exists with valid metadata.

### Risks / notes
- Skill name must match the parent directory and use lowercase + hyphens only.
- Missing `pi.skills` or omitting `skills/` from published files would make the skill undiscoverable after install.
- The skill should complement, not duplicate excessively, the README and slash-command help.
