export { default } from './src/extension.js';
export {
  buildFileSearchQuery,
  buildRegexAlternation,
  executeFileSearch,
  normalizeGrepParams,
  registerFileSearchTool,
} from './src/file-search-tool.js';
export {
  destroyAllFinders,
  getFinderRegistrySnapshot,
  getOrCreateFinder,
  resetFinderRegistry,
  setFinderFactory,
} from './src/finder-registry.js';
