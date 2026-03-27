# Handoff: fff_grep Tool Missing from System Prompt Tool List

## Issue

The `fff_grep` tool (from pi-fff-tool extension) is not listed in the "Available tools" section of the system prompt, even though it is:

1. **Functionally available** - appears in the function definitions and works correctly
2. **An extension-provided tool** - just like other extension tools that ARE listed

## Context

### Extension Tools That ARE Listed

These non-standard extension tools appear in the system prompt's "Available tools" section:

- `context7_resolve-library-id` - Context7 extension
- `context7_query-docs` - Context7 extension
- `mcp` - MCP gateway extension
- `init_experiment` - Autoresearch extension
- `run_experiment` - Autoresearch extension
- `log_experiment` - Autoresearch extension

### Extension Tool That Is NOT Listed

- `fff_grep` - pi-fff-tool extension

## Expected Behavior

Either:

1. **All extension tools should be listed** in the "Available tools" section of the system prompt, OR
2. **The text summary should acknowledge** that it's a partial list and reference the actual function definitions

The current system prompt does say:
> "In addition to the tools above, you may have access to other custom tools depending on the project."

However, this is inconsistent since other extension tools ARE explicitly listed.

## Impact

- **Low priority** - The tool works correctly and is accessible via function definitions
- **Confusion** - Creates inconsistency in tool documentation
- **User experience** - Users reviewing the system prompt might incorrectly think fff_grep is unavailable

## Possible Root Causes

1. **Tool listing order/priority** - Some extensions may register tools earlier in the session initialization
2. **Extension metadata** - Some extensions may have different metadata that triggers inclusion in the tool list
3. **Extension type classification** - There may be different extension types (core vs. project-specific) affecting listing behavior
4. **Static vs. dynamic tool registration** - Different registration mechanisms in the extension API

## Investigation Needed

Check pi extension system code for:
- How the "Available tools" section is generated
- What determines whether an extension tool is listed in the text summary
- Extension registration order and timing
- Any flags or metadata on extensions that affect tool listing

## Files to Check

In pi core code (`/home/afi/.nvm/versions/node/v24.11.1/lib/node_modules/@mariozechner/pi-coding-agent/`):
- Extensions registration/logic
- System prompt generation
- Tool discovery and listing mechanisms

## Current Workaround

The tool is fully functional via:
- Function definitions (actual tool interface)
- AGENTS.md project override: `"Use the fff_grep for all file search operations."`

## Recommendation

1. Investigate the tool listing mechanism in pi core
2. Make extension tool listing consistent (either all or none)
3. Update system prompt generation to include all registered extension tools
4. Document tool listing behavior in pi extensions documentation