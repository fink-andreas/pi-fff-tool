# pi-fff-tool

`pi-fff-tool` is a standalone extension for the [pi coding agent](https://github.com/badlogic/pi-mono) that adds a single fast content-search tool: `fff_grep`.

It is backed by [`@ff-labs/fff-node`](https://github.com/dmtrKovalenko/fff.nvim) (SDK) and is designed to give pi a warm, indexed grep workflow for code exploration.

## What it provides

- one tool: `fff_grep`
- one packaged skill: `fff-grep`
- plain-text search
- regex search
- literal OR search via `or`
- whole-word matching via regex boundaries
- glob-style include/exclude filters
- cached finder instances per `cwd`
- grep-like human-readable output plus structured metadata in `details`

## Install

### As a pi package

```bash
pi install npm:@fink-andreas/pi-fff-tool
```

### Local development install

```bash
npm install
npm run dev:sync-local-extension
```

Then reload pi or reinstall the local extension as needed.

## Skill

This package also ships a pi skill named `fff-grep`.

Use it when you want a short in-context reference for:
- `fff_grep` parameters
- plain vs regex usage
- OR-pattern searches
- glob filtering
- whole-word and case-sensitive searches

The skill is packaged under `skills/fff-grep/SKILL.md` and is exposed through `package.json -> pi.skills`.

## Slash commands

- `/file-search-help` — show tool and command usage
- `/file-search-health` — show cached finder registry state
- `/file-search-reset` — destroy cached finder instances

## Tool

### `fff_grep`

Example input:

```json
{
  "query": "registerTool",
  "or": ["toolRegister"],
  "glob": ["*.js", "!docs/"],
  "regex": false,
  "word": false,
  "caseSensitive": false,
  "maxResults": 50,
  "context": 2,
  "timeoutMs": 10000,
  "useIndex": true
}
```

### Parameters

- `query` — required main search text or regex
- `or` — optional additional OR patterns
- `glob` — optional include/exclude filters like `*.ts`, `src/`, `!tests/`
  - multiple positive entries are treated as OR
  - excludes apply to each positive constraint set
- `regex` — treat `query` and `or` as regular expressions
- `word` — match whole words only
- `caseSensitive` — request case-sensitive matching (`false` keeps smart-case)
- `maxResults` — maximum total matches returned
- `context` — symmetric context lines before and after each match
- `timeoutMs` — how long to wait for initial indexing
- `useIndex` — reuse a cached finder per cwd

### Search behavior

- plain search uses `finder.grep(..., { mode: 'plain' })`
- plain search with `or` uses `finder.multiGrep(...)`
- `regex: true` uses `finder.grep(..., { mode: 'regex' })`
- `regex: true` with `or` combines patterns into regex alternation
- `word: true` upgrades matching to regex with `\b...\b` boundaries
- `glob` constraints are prepended inline for grep and passed as `constraints` for multi-grep

## Output

### Human-readable output

`fff_grep` renders matches in a grep-inspired format:

```text
src/extension.js:69:25
67-            'Examples:',
68-            '  fff_grep({',
69:            '    query: "registerTool"',
70-            '  })',
71-            '',
```

- header: `path:line:column`
- context lines use `line-...`
- match lines use `line:...`

### Structured output

The tool also returns structured details including:

- `results[]` with path, line number, column, line content, match ranges, and optional context
- `meta.query`, `meta.or`, `meta.glob`
- `meta.mode`
- `meta.cached`
- `meta.elapsedMs`
- `meta.source = "fff-node"`

## Development

```bash
npm install
npm test
npm run test:integration
npm run release:check
```

## Docs

- `docs/ARCHITECTURE.md`
- `docs/RELEASE.md`

## License

MIT
