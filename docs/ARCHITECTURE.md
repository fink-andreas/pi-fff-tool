# Architecture

## Overview
`pi-fff-tool` is a standalone pi extension package exposing one tool: `fff_grep`.

## Main components
- `src/extension.js` registers tools and lifecycle hooks.
- `src/file-search-tool.js` implements the grep tool contract and mode selection.
- `src/finder-registry.js` caches `@ff-labs/fff-node` `FileFinder` instances by cwd.
- `src/results.js` formats grep matches into a stable text payload.
- `src/params.js` contains older file-search parameter normalization helpers retained for compatibility.

## Runtime flow
1. pi calls `fff_grep`.
2. Tool params are normalized and the effective grep mode is resolved.
3. A cached `FileFinder` is reused or created for the requested cwd.
4. The tool dispatches to one of the native APIs:
   - `finder.grep()` for single-pattern plain/regex/fuzzy grep
   - `finder.multiGrep()` for multi-pattern literal OR grep
   - `finder.grep()` with regex alternation for multi-pattern regex grep
5. Grep results are mapped into a stable JSON/text payload with path, line, column, content, and match ranges.

## Design notes
- The primary backend is `@ff-labs/fff-node`.
- Finder reuse keeps fff's index warm across tool calls.
- `auto` mode prefers plain text unless a single pattern looks regex-like.
- Multi-pattern plain search uses OR semantics via `multiGrep()`.
- Multi-pattern fuzzy search is handled as a single fuzzy expression by joining the patterns with spaces.
