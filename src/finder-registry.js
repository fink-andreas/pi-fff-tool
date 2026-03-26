import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const registry = new Map();
let finderFactory = defaultFinderFactory;

export function getFinderRegistrySnapshot() {
  return Array.from(registry.entries()).map(([cwd, entry]) => ({
    cwd,
    createdAt: entry.createdAt,
    ageMs: Math.max(0, Date.now() - entry.createdAt),
    isScanning: typeof entry.finder?.isScanning === 'function' ? entry.finder.isScanning() : undefined,
  }));
}

export function setFinderFactory(factory) {
  finderFactory = factory || defaultFinderFactory;
}

export function resetFinderRegistry() {
  return destroyAllFinders();
}

export async function destroyAllFinders() {
  for (const entry of registry.values()) {
    try {
      entry.finder.destroy();
    } catch {
      // ignore destroy errors
    }
  }
  registry.clear();
}

export async function getOrCreateFinder({ cwd, timeoutMs = 10_000, useIndex = true }) {
  const normalizedCwd = await normalizeCwd(cwd);

  if (useIndex && registry.has(normalizedCwd)) {
    return {
      cwd: normalizedCwd,
      finder: registry.get(normalizedCwd).finder,
      cached: true,
      destroy: async () => {},
    };
  }

  const finder = await finderFactory({ cwd: normalizedCwd, timeoutMs });

  if (useIndex) {
    registry.set(normalizedCwd, { finder, createdAt: Date.now() });
    return {
      cwd: normalizedCwd,
      finder,
      cached: false,
      destroy: async () => {},
    };
  }

  return {
    cwd: normalizedCwd,
    finder,
    cached: false,
    destroy: async () => {
      finder.destroy();
    },
  };
}

async function normalizeCwd(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim()) {
    throw new Error('cwd must be a non-empty string');
  }
  const normalized = resolve(cwd);
  const info = await stat(normalized).catch(() => null);
  if (!info) {
    throw new Error(`cwd does not exist: ${normalized}`);
  }
  if (!info.isDirectory()) {
    throw new Error(`cwd is not a directory: ${normalized}`);
  }
  return normalized;
}

async function defaultFinderFactory({ cwd, timeoutMs }) {
  const { FileFinder } = await import('@ff-labs/fff-node');
  const created = FileFinder.create({ basePath: cwd, aiMode: true });
  if (!created.ok) {
    throw new Error(created.error);
  }

  const finder = created.value;
  const waitResult = await finder.waitForScan(timeoutMs);
  if (!waitResult.ok) {
    finder.destroy();
    throw new Error(waitResult.error);
  }

  return finder;
}
