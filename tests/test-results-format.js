#!/usr/bin/env node

import assert from 'node:assert/strict';

import { formatToolText } from '../src/results.js';

function main() {
  const text = formatToolText({
    results: [
      {
        path: 'src/example.ts',
        lineNumber: 12,
        column: 4,
        lineContent: 'const registerTool = createTool();',
        contextBefore: ['export function setup() {', '  const helper = true;'],
        contextAfter: ['  return registerTool;', '}'],
      },
      {
        path: 'tests/example.test.ts',
        lineNumber: 3,
        column: 2,
        lineContent: 'expect(registerTool).toBeDefined();',
      },
    ],
    meta: {
      mode: 'plain',
      query: 'registerTool',
      or: [],
      glob: ['src/', 'tests/'],
    },
  });

  assert.match(text, /^Found 2 matches\./);
  assert.match(text, /src\/example\.ts:12:4\n10-export function setup\(\) \{/);
  assert.match(text, /\n12:const registerTool = createTool\(\);/);
  assert.match(text, /\n13-  return registerTool;/);
  assert.match(text, /\n\ntests\/example\.test\.ts:3:2\n3:expect\(registerTool\)\.toBeDefined\(\);/);
  assert.doesNotMatch(text, /matchRanges:/);
  assert.doesNotMatch(text, /--/);
  assert.match(text, /\n\nMode: plain\nQuery: registerTool\nGlob: src\/, tests\//);

  console.log('✓ tests/test-results-format.js passed');
}

main();
