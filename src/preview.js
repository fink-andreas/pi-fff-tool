import { readFile } from 'node:fs/promises';

const MAX_PREVIEW_BYTES = 8 * 1024;

export async function buildPreview(filePath, previewLines) {
  if (!previewLines || previewLines <= 0) return undefined;

  try {
    const content = await readFile(filePath, 'utf8');
    const truncated = content.slice(0, MAX_PREVIEW_BYTES);
    const lines = truncated.split(/\r?\n/).slice(0, previewLines);
    return lines.join('\n');
  } catch {
    return undefined;
  }
}
