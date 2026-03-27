# `fff_grep` local tool vs MCP `fff_grep`

This project exposes a **local built-in tool** named `fff_grep` that is implemented on top of the same FFF search library used by the MCP server. The names overlap, but the tool surfaces are **not 1:1**.

## High-level summary

- **MCP `fff_grep`** is a server-oriented tool surface documented in `MCP_FFF_SURFACE.md`.
- **Local `fff_grep` tool** is a harness-friendly wrapper with a more structured parameter schema.
- Both target **content search**, but the local tool exposes controls directly as fields instead of encoding as much into the query string.

## Side-by-side comparison

| Area | MCP `fff_grep` | Local built-in `fff_grep` |
|---|---|---|
| Main purpose | Search file contents for identifiers | Search file contents with grep-style options |
| Required field | `query` | `query` |
| OR patterns | Separate tool: `fff_multi_grep` | Built into same tool via `or: string[]` |
| File filtering | Constraint prefixes inside `query` | Explicit `glob: string[]` |
| Regex toggle | Ambiguous in docs; query may support regex | Explicit `regex: boolean` |
| Whole-word | Not exposed | `word: boolean` |
| Case sensitivity | Not exposed | `caseSensitive: boolean` |
| Context lines | Not on `fff_grep` itself | `context: number` |
| Pagination | `cursor` | Not exposed |
| Output shaping | `output_mode` | Not exposed; grep-style output with context instead |
| Search tuning | Minimal exposed knobs | `timeoutMs`, `useIndex` |

## Parameter surface

### MCP `fff_grep`
Documented in `MCP_FFF_SURFACE.md`:

- `query` (required)
- `maxResults`
- `cursor`
- `output_mode`

The MCP docs recommend using:
- one specific term
- identifier-oriented searches
- optional file constraints embedded into the query text

Example style:
- `*.ts MyComponent`
- `src/ ActorAuth`

## Local built-in `fff_grep`
The local tool available in this harness exposes:

- `query` (required)
- `or`
- `glob`
- `regex`
- `word`
- `caseSensitive`
- `maxResults`
- `context`
- `timeoutMs`
- `useIndex`

Example style:

```json
{
  "query": "MyComponent",
  "glob": ["*.ts", "src/"],
  "or": ["myComponent"],
  "regex": false,
  "context": 2
}
```

## Main differences

### 1. Structured API vs query-encoded constraints
The MCP surface expects more syntax to be embedded directly into `query`.

The local tool separates concerns:
- search term in `query`
- file filters in `glob`
- alternates in `or`
- behavior toggles in booleans

This makes the local tool easier for an agent or wrapper to call correctly.

### 2. Multi-pattern search
In MCP, multi-pattern OR search is split into a separate tool:
- `fff_multi_grep`

In the local tool, OR behavior is folded into `fff_grep` itself:
- `or: string[]`

So the local surface is more compact.

### 3. Regex support clarity
The MCP docs are slightly mixed:
- description says not to use regex / code syntax
- parameter text says `query` can be text or regex

The local tool makes regex intent explicit:
- `regex: true | false`

### 4. Additional grep controls
The local tool adds developer-facing options not present in the documented MCP `fff_grep`:
- `word`
- `caseSensitive`
- `context`
- `timeoutMs`
- `useIndex`

These are wrapper-level usability features layered on top of the underlying FFF engine.

### 5. Pagination vs direct search helper
The MCP tool includes:
- `cursor`

That fits an MCP/server protocol model.

The local tool omits pagination and instead emphasizes a bounded direct search via:
- `maxResults`

## Relationship between the two

The local tool should be thought of as:

> a higher-level wrapper around the same underlying FFF search capability, not a strict re-export of the MCP server contract.

So even though both use the same library/backend, they intentionally differ in:
- parameter naming
- shape of the public API
- how filtering and OR logic are expressed
- how much protocol detail is exposed

## Practical conclusion

If the goal is to compare surfaces:

- **MCP `fff_grep`** = protocol/server-facing API
- **Local `fff_grep`** = harness-facing convenience API built on the same search engine

They overlap in purpose, but the local tool is **broader and more structured**, while the MCP version is **narrower and more protocol-oriented**.
