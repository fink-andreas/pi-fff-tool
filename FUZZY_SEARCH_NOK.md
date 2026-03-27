# FFF grep Tool Experiments

## Experiment Results

### Test 1: Regex patterns with OR
```json
["register.*tool", "tool.*register"]
```
**Result:** No files found

### Test 2: Single keyword "register"
```json
["register"]
```
**Result:** Found 2 files
- tests/test-extension-registration.js
- src/finder-registry.js

### Test 3: Single keyword "tool"
```json
["tool"]
```
**Result:** Found 9 files
- src/file-search-tool.js
- tests/test-file-search-tool.js
- extensions/pi-fff-tool.js
- TODO.md
- tests/test-file-search-integration.js
- scripts/dev-sync-local-extension.mjs
- docs/RELEASE.md
- src/extension.js
- .gitignore

### Test 4: Multiple patterns (AND search)
```json
["register", "tool"]
```
**Result:** No files found
**Note:** This appears to be an AND condition that requires both patterns to be present

### Test 5: Wildcard pattern
```json
["*register*"]
```
**Result:** No files found
**Note:** Wildcard patterns don't work as expected

### Test 6: Exact function name
```json
["registerTool"]
```
**Result:** Found 3 files
- tests/test-extension-registration.js
- tests/test-file-search-tool.js
- src/file-search-tool.js

## Findings

1. **Regex patterns don't work** - Using `register.*tool` or `tool.*register` returned no results
2. **Array of patterns may use AND logic** - Searching for `["register", "tool"]` returned no results despite files containing both terms separately
3. **Wildcard patterns don't work** - `*register*` returned no results
4. **Simple exact matching works best** - Searching for exact terms like `registerTool` returns expected results
5. **Single pattern searches work reliably** - `["register"]` and `["tool"]` both returned correct results