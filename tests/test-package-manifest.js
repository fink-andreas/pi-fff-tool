#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));

  assert.equal(packageJson.name, '@fink-andreas/pi-fff-tool');
  assert.ok(packageJson.pi, 'package.json must contain a pi manifest');
  assert.ok(Array.isArray(packageJson.pi.extensions), 'pi.extensions must be an array');
  assert.ok(packageJson.pi.extensions.includes('./index.js'), 'pi.extensions must include ./index.js');
  assert.ok(Array.isArray(packageJson.pi.skills), 'pi.skills must be an array');
  assert.ok(packageJson.pi.skills.includes('./skills'), 'pi.skills must include ./skills');
  assert.ok(packageJson.files.includes('index.js'), 'published files must include index.js');
  assert.ok(packageJson.files.includes('skills/'), 'published files must include skills/');
  assert.ok(packageJson.keywords.includes('pi-package'), 'keywords must include pi-package');
  assert.ok(existsSync(resolve('index.js')), 'index.js must exist');
  assert.ok(existsSync(resolve('skills/fff-grep/SKILL.md')), 'skills/fff-grep/SKILL.md must exist');

  const source = await readFile(resolve('src/file-search-tool.js'), 'utf8');
  assert.match(source, /name: 'fff_grep'/, 'tool registration must define fff_grep');

  const skillSource = await readFile(resolve('skills/fff-grep/SKILL.md'), 'utf8');
  assert.match(skillSource, /^---\nname: fff-grep\ndescription: .+/m, 'skill must declare valid frontmatter');
  assert.match(skillSource, /`fff_grep`/, 'skill must document the fff_grep tool');

  console.log('✓ tests/test-package-manifest.js passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
