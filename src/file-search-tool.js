import { readFile } from 'node:fs/promises';

import { getOrCreateFinder } from './finder-registry.js';
import { formatToolText } from './results.js';

const FFF_GREP_PARAMETERS = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Text or regex to search for.',
    },
    or: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: "Additional patterns matched with OR logic. Example: ['PrepareUpload', 'prepare_upload'].",
    },
    glob: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: "Include/exclude glob constraints like ['*.ts', '!*.spec.ts', 'src/'].",
    },
    regex: {
      type: 'boolean',
      description: 'Treat query and or-patterns as regular expressions. Default: false.',
    },
    word: {
      type: 'boolean',
      description: 'Match whole words only. Implemented via regex boundaries.',
    },
    caseSensitive: {
      type: 'boolean',
      description: 'Use case-sensitive matching. Default: false (smart-case).',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum total matches to return. Default: 50.',
    },
    context: {
      type: 'number',
      description: 'Context lines before and after each match. Default: 0.',
    },
    timeoutMs: {
      type: 'number',
      description: 'How long to wait for initial indexing before searching. Default: 10000.',
    },
    useIndex: {
      type: 'boolean',
      description: 'Reuse a cached fff index per cwd. Default: true.',
    },
  },
  required: ['query'],
};

export function buildFileSearchQuery(query, includeGlobs = [], excludeGlobs = []) {
  const constraints = [];
  for (const glob of includeGlobs) constraints.push(glob);
  for (const glob of excludeGlobs) constraints.push(`!${glob}`);
  return [...constraints, query].join(' ').trim();
}

export function buildRegexAlternation(patterns) {
  return patterns.map((pattern) => `(?:${pattern})`).join('|');
}

export function normalizeGrepParams(rawParams, defaultCwd = process.cwd()) {
  const params = rawParams && typeof rawParams === 'object' ? rawParams : {};
  const query = typeof params.query === 'string' ? params.query.trim() : '';
  if (!query) {
    throw new Error('query must be a non-empty string');
  }

  const or = normalizeStringArray(params.or, 'or');
  const glob = normalizeStringArray(params.glob, 'glob');
  const regex = params.regex === true;
  const word = params.word === true;
  const caseSensitive = params.caseSensitive === true;
  const context = clampNumber(params.context, 0, 0, 20);
  const patterns = [query, ...or];

  return {
    query,
    or,
    glob,
    regex,
    word,
    caseSensitive,
    patterns,
    cwd: typeof params.cwd === 'string' && params.cwd.trim() ? params.cwd.trim() : defaultCwd,
    timeoutMs: clampNumber(params.timeoutMs, 10_000, 100, 60_000),
    useIndex: params.useIndex !== false,
    maxResults: clampNumber(params.maxResults, 50, 1, 1_000),
    beforeContext: context,
    afterContext: context,
  };
}

export async function executeFileSearch(rawParams, context = {}) {
  const startedAt = Date.now();
  const params = normalizeGrepParams(rawParams, context.cwd || process.cwd());

  const finderHandle = await getOrCreateFinder({
    cwd: params.cwd,
    timeoutMs: params.timeoutMs,
    useIndex: params.useIndex,
  });

  try {
    const result = runGrepSearch(finderHandle.finder, params);

    if (!result.ok) {
      throw new Error(result.error);
    }

    const hydratedItems = await hydrateContextLines(result.value.items, params);
    const limitedItems = hydratedItems.slice(0, params.maxResults);
    const mapped = limitedItems.map((item) => ({
      path: item.relativePath,
      lineNumber: item.lineNumber,
      column: item.col,
      lineContent: item.lineContent,
      matchRanges: item.matchRanges,
      ...(Array.isArray(item.contextBefore) && item.contextBefore.length > 0 ? { contextBefore: item.contextBefore } : {}),
      ...(Array.isArray(item.contextAfter) && item.contextAfter.length > 0 ? { contextAfter: item.contextAfter } : {}),
      ...(typeof item.fuzzyScore === 'number' ? { fuzzyScore: item.fuzzyScore } : {}),
    }));

    const payload = {
      results: mapped,
      meta: {
        elapsedMs: Date.now() - startedAt,
        source: 'fff-node',
        cwd: finderHandle.cwd,
        cached: finderHandle.cached,
        totalMatched: mapped.length,
        totalFiles: result.value.totalFiles,
        totalFilesSearched: result.value.totalFilesSearched,
        filteredFileCount: result.value.filteredFileCount,
        mode: determineRuntimeMode(params),
        query: params.query,
        or: params.or,
        glob: params.glob,
        regex: params.regex,
        word: params.word,
        caseSensitive: params.caseSensitive,
      },
    };

    return {
      content: [{ type: 'text', text: formatToolText(payload) }],
      details: payload,
    };
  } finally {
    await finderHandle.destroy();
  }
}

function runGrepSearch(finder, params) {
  const constraintSets = buildConstraintSets(params.glob);
  const results = constraintSets.map((constraints) => runSingleGrepSearch(finder, params, constraints));
  return mergeGrepSearchResults(results);
}

function runSingleGrepSearch(finder, params, constraints) {
  const commonOptions = {
    maxMatchesPerFile: params.maxResults,
    beforeContext: params.beforeContext,
    afterContext: params.afterContext,
    smartCase: !params.caseSensitive,
  };

  const inlineQuery = buildInlineQuery(params.query, constraints);

  if (params.word) {
    return finder.grep(buildInlineQuery(buildWordBoundaryRegex(params.patterns, params.regex), constraints), {
      ...commonOptions,
      mode: 'regex',
    });
  }

  if (params.regex) {
    const regexQuery = params.or.length > 0 ? buildRegexAlternation(params.patterns) : params.query;
    return finder.grep(buildInlineQuery(regexQuery, constraints), {
      ...commonOptions,
      mode: 'regex',
    });
  }

  if (params.or.length > 0) {
    return finder.multiGrep({
      patterns: params.patterns,
      constraints: joinConstraints(constraints),
      ...commonOptions,
    });
  }

  return finder.grep(inlineQuery, {
    ...commonOptions,
    mode: 'plain',
  });
}

function determineRuntimeMode(params) {
  if (params.word) return 'regex';
  return params.regex ? 'regex' : 'plain';
}

function buildConstraintSets(glob = []) {
  const include = [];
  const exclude = [];

  for (const entry of glob) {
    if (entry.startsWith('!')) exclude.push(entry);
    else include.push(entry);
  }

  if (include.length === 0) return [exclude];
  return include.map((entry) => [entry, ...exclude]);
}

function mergeGrepSearchResults(results) {
  const firstError = results.find((result) => !result.ok);
  if (firstError) return firstError;
  if (results.length === 1) return results[0];

  const items = [];
  const seen = new Set();
  let totalFiles = 0;
  let totalFilesSearched = 0;
  let filteredFileCount = 0;

  for (const result of results) {
    totalFiles = Math.max(totalFiles, result.value.totalFiles);
    totalFilesSearched += result.value.totalFilesSearched;
    filteredFileCount += result.value.filteredFileCount;

    for (const item of result.value.items) {
      const key = `${item.relativePath}:${item.lineNumber}:${item.col}:${item.lineContent}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }

  return {
    ok: true,
    value: {
      items,
      totalMatched: items.length,
      totalFiles,
      totalFilesSearched,
      filteredFileCount,
      nextCursor: null,
    },
  };
}

async function hydrateContextLines(items, params) {
  if (params.beforeContext === 0 && params.afterContext === 0) return items;

  const fileCache = new Map();
  return Promise.all(items.map(async (item) => ({
    ...item,
    ...(await readContextForItem(item, params, fileCache)),
  })));
}

async function readContextForItem(item, params, fileCache) {
  const absolutePath = typeof item.path === 'string' && item.path ? item.path : null;
  if (!absolutePath) return {};

  if (!fileCache.has(absolutePath)) {
    fileCache.set(
      absolutePath,
      readFile(absolutePath, 'utf8')
        .then((content) => content.split(/\r?\n/))
        .catch(() => null),
    );
  }

  const lines = await fileCache.get(absolutePath);
  if (!Array.isArray(lines)) return {};

  const lineIndex = Math.max(0, item.lineNumber - 1);
  const contextBefore =
    params.beforeContext > 0
      ? lines.slice(Math.max(0, lineIndex - params.beforeContext), lineIndex)
      : [];
  const contextAfter =
    params.afterContext > 0
      ? lines.slice(lineIndex + 1, lineIndex + 1 + params.afterContext)
      : [];

  return {
    ...(contextBefore.length > 0 ? { contextBefore } : {}),
    ...(contextAfter.length > 0 ? { contextAfter } : {}),
  };
}

function buildInlineQuery(query, glob = []) {
  return [...glob, query].join(' ').trim();
}

function joinConstraints(glob = []) {
  return glob.length > 0 ? glob.join(' ') : undefined;
}

function buildWordBoundaryRegex(patterns, regex) {
  const sourcePatterns = regex ? patterns : patterns.map(escapeRegexLiteral);
  return `\\b(?:${sourcePatterns.join('|')})\\b`;
}

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeStringArray(value, fieldName) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of non-empty strings`);
  }
  const normalized = value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
  if (normalized.length !== value.length) {
    throw new Error(`${fieldName} must be an array of non-empty strings`);
  }
  return normalized;
}

function clampNumber(value, fallback, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function registerFileSearchTool(pi) {
  pi.registerTool({
    name: 'fff_grep',
    description: 'Search file contents with grep-style query, optional OR patterns, and glob filters.',
    promptSnippet: 'Search file contents with grep-style query, optional OR patterns, and glob filters.',
    promptGuidelines: ['Use the fff_grep for all file search operations.'],
    parameters: FFF_GREP_PARAMETERS,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx?.workingDirectory || process.cwd();
      return executeFileSearch({ ...params, cwd }, { cwd });
    },
  });
}
