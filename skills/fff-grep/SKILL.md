---
name: fff-grep
description: Quick reference for the pi-fff-tool `fff_grep` search tool. Use when you need the tool's parameters, examples, or best practices for plain text, regex, OR-pattern, glob-filtered, whole-word, or case-sensitive searches.
---

# `fff_grep` quick guide

Use `fff_grep` to search **file contents** with a grep-like interface backed by FFF indexing.

## When to use it

Use `fff_grep` for:
- finding identifiers, strings, and usage sites in code
- regex searches across a repo
- searching multiple related names with OR logic
- narrowing searches with file globs or directory constraints

## Parameters

- `query` **required** — main search text or regex
- `or` optional `string[]` — additional OR patterns
- `glob` optional `string[]` — include/exclude filters like `*.ts`, `src/`, `!tests/`
- `regex` optional `boolean` — treat `query` and `or` as regex
- `word` optional `boolean` — match whole words only
- `caseSensitive` optional `boolean` — request case-sensitive matching
- `maxResults` optional `number` — cap total matches returned
- `context` optional `number` — context lines before and after each match
- `timeoutMs` optional `number` — wait budget for initial indexing
- `useIndex` optional `boolean` — reuse cached index for the cwd

## Usage rules

- Prefer **plain text** search unless regex is really needed.
- Use `or` for multiple literal alternatives instead of cramming them into one query.
- Use `glob` to reduce noise and cost.
- Use `word: true` for identifier boundaries.
- Leave `caseSensitive` false unless exact case matters.
- Increase `context` when you need surrounding lines, not just the hit line.

## Examples

### Plain text search

```json
{
  "query": "registerTool"
}
```

### Plain text OR search

```json
{
  "query": "PrepareUpload",
  "or": ["prepare_upload", "prepareUpload"]
}
```

### Restrict to files/directories

```json
{
  "query": "registerTool",
  "glob": ["*.js", "src/", "!tests/"]
}
```

### Regex search

```json
{
  "query": "register.*tool",
  "regex": true,
  "context": 1
}
```

### Whole-word identifier search

```json
{
  "query": "ActorAuth",
  "word": true,
  "glob": ["*.ts", "*.tsx"]
}
```

### Case-sensitive search

```json
{
  "query": "HTTPServer",
  "caseSensitive": true
}
```

## Notes

- `glob` positive entries are treated as **OR** constraints.
- `glob` entries beginning with `!` are exclusions.
- `regex: true` with `or` combines the patterns into a regex alternation.
- Output includes readable grep-style matches plus structured details.
