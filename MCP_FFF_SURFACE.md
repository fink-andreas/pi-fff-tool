# MCP fff Tools Surface Documentation

## Overview

The **fff** (Fast File Find) server provides 3 tools for searching files and code content.

---

## 1. fff_find_files

### Description

Fuzzy search by **file name** (not content).

**When to use:** Finding specific files when you know (part of) the filename.

**Key features:**
- Fuzzy matching on filenames
- Supports path prefixes (e.g., `src/`)
- Supports glob constraints (e.g., `**/src/*.{ts,tsx} !test/`)
- **Keep queries short** — 1-2 terms max
- Multiple words create a waterfall filter (each narrows results, NOT OR logic)

### Raw JSON Schema

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": ["string", "null"]
    },
    "maxResults": {
      "format": "uint",
      "minimum": 0,
      "type": ["integer", "null"]
    },
    "query": {
      "type": "string"
    }
  },
  "required": ["query"],
  "$schema": "https://json-schema.org/draft/2020-12/schema#",
  "title": "FindFilesParams"
}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Fuzzy search query. Supports path prefixes and glob constraints. |
| `maxResults` | integer \| null | No | Max results (default: 20). |
| `cursor` | string \| null | No | Cursor from previous result. Only use if previous results weren't sufficient. |

---

## 2. fff_grep

### Description

Search **file contents** for identifiers.

**When to use:** Finding code definitions, usage patterns, function names, etc.

**Key features:**
- Searches for bare identifiers (e.g., `MyComponent`, `ActorAuth`)
- **NOT code syntax or regex** — use literal terms
- Matches within single lines only
- Use ONE specific term, not multiple words
- Filter files with constraints (e.g., `*.ts query`, `src/ query`)

### Raw JSON Schema

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": ["string", "null"]
    },
    "maxResults": {
      "format": "uint",
      "minimum": 0,
      "type": ["integer", "null"]
    },
    "output_mode": {
      "type": ["string", "null"]
    },
    "query": {
      "type": "string"
    }
  },
  "required": ["query"],
  "$schema": "https://json-schema.org/draft/2020-12/schema#",
  "title": "GrepParams"
}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search text or regex query with optional constraint prefixes. Matches within single lines only — use ONE specific term, not multiple words. |
| `maxResults` | integer \| null | No | Max matching lines (default: 20). |
| `cursor` | string \| null | No | Cursor from previous result. Only use if previous results weren't sufficient. |
| `output_mode` | string \| null | No | Output format (default: 'content'). |

---

## 3. fff_multi_grep

### Description

Search file contents for **multiple patterns** (OR logic).

**When to use:** Finding files containing ANY of several related terms (e.g., different naming conventions).

**Key features:**
- Returns files where **ANY** pattern matches (NOT all patterns must match)
- Patterns are **literal text** — never escape special characters (no `\(`, `\.`, etc.)
- Faster than regex alternation for literal text
- Include all naming conventions: `snake_case`, `PascalCase`, `camelCase`
- Use `patterns` array instead of single query

### Raw JSON Schema

```json
{
  "type": "object",
  "properties": {
    "constraints": {
      "type": ["string", "null"]
    },
    "context": {
      "format": "uint",
      "minimum": 0,
      "type": ["integer", "null"]
    },
    "cursor": {
      "type": ["string", "null"]
    },
    "maxResults": {
      "format": "uint",
      "minimum": 0,
      "type": ["integer", "null"]
    },
    "output_mode": {
      "type": ["string", "null"]
    },
    "patterns": {
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": ["patterns"],
  "$schema": "https://json-schema.org/draft/2020-12/schema#",
  "title": "MultiGrepParams"
}
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `patterns` | array of strings | Yes | Patterns to match (OR logic). Include all naming conventions: snake_case, PascalCase, camelCase. |
| `constraints` | string \| null | No | File constraints (e.g., '*.{ts,tsx} !test/'). ALWAYS provide when possible. |
| `maxResults` | integer \| null | No | Max matching lines (default: 20). |
| `context` | integer \| null | No | Context lines before/after each match. |
| `cursor` | string \| null | No | Cursor from previous result. |
| `output_mode` | string \| null | No | Output format (default: 'content'). |

---

## Quick Reference

| Task | Tool | Example |
|------|------|---------|
| Find file by name | `fff_find_files` | query: `src/utils.tsx` |
| Find code identifier | `fff_grep` | query: `*.ts MyComponent` |
| Find multiple related terms | `fff_multi_grep` | patterns: `["MyComponent", "my_component", "myComponent"]` |

---

## Server Information

- **Server Name:** `fff`
- **Total Tools:** 3
- **Tool Names:** `fff_find_files`, `fff_grep`, `fff_multi_grep`