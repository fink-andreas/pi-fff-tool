export function formatToolText(payload) {
  const { results, meta } = payload;
  const searchSummary = [
    `Mode: ${meta.mode}`,
    `Query: ${meta.query}`,
    ...(Array.isArray(meta.or) && meta.or.length > 0 ? [`OR: ${meta.or.join(', ')}`] : []),
    ...(Array.isArray(meta.glob) && meta.glob.length > 0 ? [`Glob: ${meta.glob.join(', ')}`] : []),
  ];

  if (!Array.isArray(results) || results.length === 0) {
    return ['No matches found.', '', ...searchSummary].join('\n');
  }

  const lines = [`Found ${results.length} match${results.length === 1 ? '' : 'es'}.`, ''];

  // Human-readable output intentionally mirrors a mixed ripgrep style:
  // heading + context, similar to `rg --heading -C1`, but with a full
  // `path:line:column` header per match block and compact ripgrep-style
  // line markers (`-` for context, `:` for the matching line).

  results.forEach((item, index) => {
    const before = Array.isArray(item.contextBefore) ? item.contextBefore : [];
    const after = Array.isArray(item.contextAfter) ? item.contextAfter : [];
    const startLine = item.lineNumber - before.length;

    lines.push(`${item.path}:${item.lineNumber}:${item.column}`);

    before.forEach((line, offset) => {
      lines.push(`${startLine + offset}-${escapeLine(line)}`);
    });

    lines.push(`${item.lineNumber}:${escapeLine(item.lineContent)}`);

    after.forEach((line, offset) => {
      lines.push(`${item.lineNumber + offset + 1}-${escapeLine(line)}`);
    });

    if (typeof item.fuzzyScore === 'number') {
      lines.push(`fuzzyScore=${item.fuzzyScore}`);
    }

    if (index < results.length - 1) {
      lines.push('');
    }
  });

  lines.push('', ...searchSummary);
  return lines.join('\n');
}

function escapeLine(line) {
  return String(line).replace(/\n/g, '\\n');
}
