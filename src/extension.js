import { destroyAllFinders, getFinderRegistrySnapshot } from './finder-registry.js';
import { registerFileSearchTool } from './file-search-tool.js';

function sendInfo(pi, content, ctx) {
  if (ctx?.hasUI && ctx.ui?.notify) {
    ctx.ui.notify(content, 'info');
  }

  if (typeof pi.sendMessage === 'function') {
    pi.sendMessage({
      customType: 'pi-fff-tool',
      content,
      display: true,
    });
  }
}

function formatHealthText() {
  const snapshot = getFinderRegistrySnapshot();
  if (snapshot.length === 0) {
    return ['pi-fff-tool health', '', 'Cached finders: 0'].join('\n');
  }

  return [
    'pi-fff-tool health',
    '',
    `Cached finders: ${snapshot.length}`,
    '',
    ...snapshot.map((entry) => {
      const parts = [
        `- cwd: ${entry.cwd}`,
        `  ageMs: ${entry.ageMs}`,
      ];
      if (typeof entry.isScanning === 'boolean') {
        parts.push(`  isScanning: ${entry.isScanning}`);
      }
      return parts.join('\n');
    }),
  ].join('\n');
}

export default async function piFffToolExtension(pi) {
  registerFileSearchTool(pi);

  if (typeof pi.registerCommand === 'function') {
    pi.registerCommand('file-search-help', {
      description: 'Show pi-fff-tool commands and fff_grep usage',
      handler: async (_args, ctx) => {
        sendInfo(
          pi,
          [
            'Commands:',
            '  /file-search-help',
            '  /file-search-health',
            '  /file-search-reset',
            '',
            'Tool:',
            '  fff_grep - Search file contents with grep-style query, OR patterns, and glob filters',
            '',
            'Parameters:',
            '  query (required, string) - Main search text or regex',
            '  or (optional, array<string>) - Additional OR patterns',
            '  glob (optional, array<string>) - Include/exclude globs; multiple positive entries are ORed',
            '  regex (optional, boolean) - Treat query/or as regex',
            '  context (optional, number) - Context lines before and after each match',
            '',
            'Examples:',
            '  fff_grep({',
            '    query: "registerTool"',
            '  })',
            '',
            '  fff_grep({',
            '    query: "registerTool",',
            '    or: ["toolRegister"],',
            '    glob: ["*.js", "!docs/"]',
            '  })',
            '',
            '  fff_grep({',
            '    query: "register.*tool",',
            '    regex: true,',
            '    context: 1',
            '  })',
          ].join('\n'),
          ctx,
        );
      },
    });

    pi.registerCommand('file-search-health', {
      description: 'Show cached finder health and registry state',
      handler: async (_args, ctx) => {
        sendInfo(pi, formatHealthText(), ctx);
      },
    });

    pi.registerCommand('file-search-reset', {
      description: 'Destroy all cached fff_grep finder instances',
      handler: async (_args, ctx) => {
        const count = getFinderRegistrySnapshot().length;
        await destroyAllFinders();
        sendInfo(pi, `Reset ${count} cached finder${count === 1 ? '' : 's'}.`, ctx);
      },
    });
  }

  if (typeof pi.on === 'function') {
    pi.on('session_shutdown', async () => {
      await destroyAllFinders();
    });
  }
}
