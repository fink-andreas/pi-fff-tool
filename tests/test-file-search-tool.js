#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildRegexAlternation,
  executeFileSearch,
  normalizeGrepParams,
  resetFinderRegistry,
  setFinderFactory,
} from '../index.js';

class MockFinder {
  constructor(cwd) {
    this.cwd = cwd;
    this.calls = [];
  }

  grep(query, options) {
    this.calls.push({ method: 'grep', query, options });
    return {
      ok: true,
      value: {
        items: [
          {
            path: join(this.cwd, 'src', 'alpha.js'),
            relativePath: 'src/alpha.js',
            lineNumber: 7,
            col: 2,
            lineContent: 'registerTool(alpha);',
            matchRanges: [[0, 12]],
          },
        ],
        totalMatched: 1,
        totalFilesSearched: 2,
        totalFiles: 5,
        filteredFileCount: 5,
        nextCursor: null,
      },
    };
  }

  multiGrep(options) {
    this.calls.push({ method: 'multiGrep', options });
    return {
      ok: true,
      value: {
        items: [
          {
            path: join(this.cwd, 'src', 'alpha.js'),
            relativePath: 'src/alpha.js',
            lineNumber: 7,
            col: 2,
            lineContent: 'registerTool(alpha);',
            matchRanges: [[0, 8]],
          },
        ],
        totalMatched: 1,
        totalFilesSearched: 2,
        totalFiles: 5,
        filteredFileCount: 5,
        nextCursor: null,
      },
    };
  }

  async waitForScan() {
    return { ok: true, value: true };
  }

  destroy() {}
}

async function main() {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'pi-fff-tool-'));

  let created = 0;
  let lastFinder;
  setFinderFactory(async ({ cwd }) => {
    created += 1;
    lastFinder = new MockFinder(cwd);
    return lastFinder;
  });

  const normalized = normalizeGrepParams({
    query: 'registerTool',
    or: ['toolRegister'],
    glob: ['*.js', '!docs/'],
    context: 2,
    cwd: fixtureRoot,
  });

  assert.equal(normalized.query, 'registerTool');
  assert.deepEqual(normalized.or, ['toolRegister']);
  assert.deepEqual(normalized.glob, ['*.js', '!docs/']);
  assert.equal(normalized.beforeContext, 2);
  assert.equal(normalized.afterContext, 2);
  assert.equal(buildRegexAlternation(['foo', 'bar']), '(?:foo)|(?:bar)');

  const plain = await executeFileSearch({
    query: 'registerTool',
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(plain.details.meta.mode, 'plain');
  assert.equal(lastFinder.calls[0].method, 'grep');
  assert.equal(lastFinder.calls[0].query, 'registerTool');
  assert.equal(lastFinder.calls[0].options.mode, 'plain');
  assert.match(plain.content[0].text, /src\/alpha\.js:7:2/);
  assert.match(plain.content[0].text, /\n7:registerTool\(alpha\);/);
  assert.match(plain.content[0].text, /Query: registerTool/);
  assert.equal(plain.details.meta.cached, false);

  const regex = await executeFileSearch({
    query: 'register.*tool',
    regex: true,
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(regex.details.meta.mode, 'regex');
  assert.equal(lastFinder.calls[1].method, 'grep');
  assert.equal(lastFinder.calls[1].query, 'register.*tool');
  assert.equal(lastFinder.calls[1].options.mode, 'regex');

  const multi = await executeFileSearch({
    query: 'registerTool',
    or: ['toolRegister'],
    glob: ['*.js', '!docs/'],
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(multi.details.meta.mode, 'plain');
  assert.equal(lastFinder.calls[2].method, 'multiGrep');
  assert.deepEqual(lastFinder.calls[2].options.patterns, ['registerTool', 'toolRegister']);
  assert.equal(lastFinder.calls[2].options.constraints, '*.js !docs/');
  assert.equal(multi.details.meta.cached, true);
  assert.equal(created, 1, 'finder should be reused for cached lookups');

  const regexMulti = await executeFileSearch({
    query: 'register.*tool',
    or: ['tool.*register'],
    regex: true,
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(regexMulti.details.meta.mode, 'regex');
  assert.equal(lastFinder.calls[3].method, 'grep');
  assert.equal(lastFinder.calls[3].query, '(?:register.*tool)|(?:tool.*register)');

  const word = await executeFileSearch({
    query: 'registerTool',
    word: true,
    glob: ['*.js'],
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(word.details.meta.mode, 'regex');
  assert.equal(lastFinder.calls[4].method, 'grep');
  assert.equal(lastFinder.calls[4].query, '*.js \\b(?:registerTool)\\b');

  const globOr = await executeFileSearch({
    query: 'registerTool',
    glob: ['src/', 'tests/', '!docs/'],
    cwd: fixtureRoot,
    useIndex: true,
  });

  assert.equal(globOr.details.meta.mode, 'plain');
  assert.equal(lastFinder.calls[5].method, 'grep');
  assert.equal(lastFinder.calls[5].query, 'src/ !docs/ registerTool');
  assert.equal(lastFinder.calls[6].method, 'grep');
  assert.equal(lastFinder.calls[6].query, 'tests/ !docs/ registerTool');

  const uncached = await executeFileSearch({
    query: 'registerTool',
    cwd: fixtureRoot,
    useIndex: false,
  });

  assert.equal(uncached.details.meta.cached, false);
  assert.equal(created, 2, 'useIndex=false should create a new finder');

  await resetFinderRegistry();
  setFinderFactory(undefined);

  console.log('✓ tests/test-file-search-tool.js passed');
}

main().catch(async (error) => {
  await resetFinderRegistry();
  setFinderFactory(undefined);
  console.error(error);
  process.exit(1);
});
