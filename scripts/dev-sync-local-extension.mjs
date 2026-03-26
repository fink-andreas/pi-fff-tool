#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const targetDir = join(process.cwd(), '.pi', 'extensions');
const targetFile = join(targetDir, 'pi-fff-tool.js');
const content = "export { default } from '../../extensions/pi-fff-tool.js';\n";

await mkdir(targetDir, { recursive: true });
await writeFile(targetFile, content, 'utf-8');

console.log(`✓ Synced local extension wrapper: ${targetFile}`);
console.log('Next: install/reload the extension in pi and validate file_search.');
