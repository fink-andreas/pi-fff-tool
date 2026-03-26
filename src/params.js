export const FILE_SEARCH_PARAMETERS = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Fuzzy file search query.',
    },
    cwd: {
      type: 'string',
      description: 'Directory to search. Defaults to the session working directory.',
    },
    includeGlobs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional include globs translated into fff query constraints.',
    },
    excludeGlobs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional exclude globs translated into negated fff query constraints.',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results to return. Default: 50.',
    },
    timeoutMs: {
      type: 'number',
      description: 'How long to wait for initial indexing before searching. Default: 10000.',
    },
    includeScore: {
      type: 'boolean',
      description: 'Include fff score totals in the response.',
    },
    previewLines: {
      type: 'number',
      description: 'Include the first N lines of each result as a lightweight preview.',
    },
    useIndex: {
      type: 'boolean',
      description: 'Reuse a cached fff index per cwd. Default: true.',
    },
  },
  required: ['query'],
  additionalProperties: false,
};

export function normalizeParams(rawParams = {}, defaultCwd = process.cwd()) {
  const params = rawParams && typeof rawParams === 'object' ? rawParams : {};
  const query = typeof params.query === 'string' ? params.query.trim() : '';
  if (!query) {
    throw new Error('query must be a non-empty string');
  }

  const cwd = typeof params.cwd === 'string' && params.cwd.trim() ? params.cwd.trim() : defaultCwd;
  const includeGlobs = Array.isArray(params.includeGlobs)
    ? params.includeGlobs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
    : [];
  const excludeGlobs = Array.isArray(params.excludeGlobs)
    ? params.excludeGlobs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
    : [];

  return {
    query,
    cwd,
    includeGlobs,
    excludeGlobs,
    maxResults: clampNumber(params.maxResults, 50, 1, 200),
    timeoutMs: clampNumber(params.timeoutMs, 10_000, 100, 60_000),
    includeScore: Boolean(params.includeScore),
    previewLines: clampNumber(params.previewLines, 0, 0, 20),
    useIndex: params.useIndex !== false,
  };
}

function clampNumber(value, fallback, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
