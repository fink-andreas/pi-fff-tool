#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { executeFileSearch, resetFinderRegistry, setFinderFactory } from '../index.js';

async function createFixtureTree() {
  const root = await mkdtemp(join(tmpdir(), 'pi-fff-tool-integration-'));
  await mkdir(join(root, 'src', 'nested'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });

  await writeFile(
    join(root, 'src', 'nested', 'omega-target-file.js'),
    [
      'export const omegaTarget = true;',
      'registerTool(omegaTarget);',
      'const omega_helper = omegaTarget;',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(root, 'src', 'other-helper.ts'),
    [
      'export const helper = 1;',
      'toolRegister(helper);',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(root, 'docs', 'omega-notes.md'),
    [
      '# omega notes',
      'register tool sequence',
      '',
    ].join('\n'),
    'utf8',
  );

  return root;
}

async function testActualRuntimePlainSearch() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'registerTool',
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  assert.ok(Array.isArray(result.details.results));
  assert.ok(result.details.results.length >= 1, 'expected at least one real grep result');
  assert.equal(result.details.results[0].path, 'src/nested/omega-target-file.js');
  assert.equal(result.details.results[0].lineNumber, 2);
  assert.match(result.details.results[0].lineContent, /registerTool\(omegaTarget\)/);
  assert.match(result.content[0].text, /src\/nested\/omega-target-file\.js:2:\d+/);
  assert.match(result.content[0].text, /\n2:registerTool\(omegaTarget\);/);
  assert.equal(result.details.meta.source, 'fff-node');
  assert.equal(result.details.meta.mode, 'plain');
  assert.equal(result.details.meta.cached, false);
}

async function testActualRuntimeRegexSearch() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'register.*tool',
    or: ['tool.*register'],
    regex: true,
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  assert.ok(result.details.results.length >= 1, 'expected regex grep results');
  assert.equal(result.details.meta.mode, 'regex');
  assert.ok(result.details.results.some((item) => item.path === 'docs/omega-notes.md'));
}

async function testActualRuntimeMultiPatternOrSearch() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'registerTool',
    or: ['toolRegister'],
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  const paths = result.details.results.map((item) => item.path);
  assert.equal(result.details.meta.mode, 'plain');
  assert.ok(paths.includes('src/nested/omega-target-file.js'));
  assert.ok(paths.includes('src/other-helper.ts'));
}

async function testActualRuntimeGlobFiltering() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'tool',
    glob: ['*.md'],
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  assert.ok(result.details.results.length >= 1, 'expected constrained grep results');
  assert.ok(result.details.results.every((item) => item.path.endsWith('.md')));
}

async function testActualRuntimeGlobOrFiltering() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'tool',
    glob: ['*.js', '*.md'],
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  const paths = result.details.results.map((item) => item.path);
  assert.ok(paths.includes('src/nested/omega-target-file.js'));
  assert.ok(paths.includes('docs/omega-notes.md'));
}

async function testActualRuntimeContextHydration() {
  const fixtureRoot = await createFixtureTree();

  const result = await executeFileSearch({
    query: 'registerTool',
    context: 1,
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  assert.deepEqual(result.details.results[0].contextBefore, ['export const omegaTarget = true;']);
  assert.deepEqual(result.details.results[0].contextAfter, ['const omega_helper = omegaTarget;']);
  assert.match(result.content[0].text, /src\/nested\/omega-target-file\.js:2:\d+/);
  assert.match(result.content[0].text, /\n1-export const omegaTarget = true;/);
  assert.match(result.content[0].text, /\n2:registerTool\(omegaTarget\);/);
  assert.match(result.content[0].text, /\n3-const omega_helper = omegaTarget;/);
}

async function testActualRuntimeCaching() {
  const fixtureRoot = await createFixtureTree();

  const first = await executeFileSearch({
    query: 'registerTool',
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });
  const second = await executeFileSearch({
    query: 'registerTool',
    cwd: fixtureRoot,
    useIndex: true,
    timeoutMs: 5_000,
  });

  assert.equal(first.details.meta.cached, false);
  assert.equal(second.details.meta.cached, true);
  assert.equal(second.details.results[0].path, 'src/nested/omega-target-file.js');
}

async function main() {
  setFinderFactory(undefined);
  await resetFinderRegistry();

  try {
    await testActualRuntimePlainSearch();
    await resetFinderRegistry();

    await testActualRuntimeRegexSearch();
    await resetFinderRegistry();

    await testActualRuntimeMultiPatternOrSearch();
    await resetFinderRegistry();

    await testActualRuntimeGlobFiltering();
    await resetFinderRegistry();

    await testActualRuntimeGlobOrFiltering();
    await resetFinderRegistry();

    await testActualRuntimeContextHydration();
    await resetFinderRegistry();

    await testActualRuntimeCaching();
    await resetFinderRegistry();

    console.log('✓ tests/test-file-search-integration.js passed');
  } finally {
    await resetFinderRegistry();
    setFinderFactory(undefined);
  }
}

main().catch(async (error) => {
  await resetFinderRegistry();
  setFinderFactory(undefined);
  console.error(error);
  process.exit(1);
});
