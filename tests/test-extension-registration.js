#!/usr/bin/env node

import assert from 'node:assert/strict';

import extension from '../index.js';

function createMockPi() {
  const tools = new Map();
  const handlers = new Map();
  const commands = new Map();
  const messages = [];
  const notifications = [];

  return {
    tools,
    handlers,
    commands,
    messages,
    notifications,
    registerTool(definition) {
      tools.set(definition.name, definition);
    },
    registerCommand(name, definition) {
      commands.set(name, definition);
    },
    sendMessage(message) {
      messages.push(message);
    },
    on(eventName, handler) {
      handlers.set(eventName, handler);
    },
  };
}

async function main() {
  const pi = createMockPi();
  await extension(pi);

  assert.ok(pi.tools.has('fff_grep'));
  assert.ok(pi.handlers.has('session_shutdown'));
  assert.ok(pi.commands.has('file-search-help'));
  assert.ok(pi.commands.has('file-search-health'));
  assert.ok(pi.commands.has('file-search-reset'));

  const tool = pi.tools.get('fff_grep');
  assert.equal(tool.parameters.required[0], 'query');
  assert.equal(tool.promptSnippet, 'Search file contents with grep-style query, optional OR patterns, and glob filters.');
  assert.deepEqual(tool.promptGuidelines, ['Use the fff_grep for all file search operations.']);

  await pi.commands.get('file-search-help').handler('', {
    hasUI: true,
    ui: {
      notify(message) {
        pi.notifications.push(message);
      },
    },
  });
  assert.match(pi.messages.at(-1).content, /fff_grep/);

  await pi.commands.get('file-search-health').handler('', {
    hasUI: false,
  });
  assert.match(pi.messages.at(-1).content, /Cached finders:/);

  await pi.commands.get('file-search-reset').handler('', {
    hasUI: false,
  });
  assert.match(pi.messages.at(-1).content, /Reset 0 cached finders\./);

  console.log('✓ tests/test-extension-registration.js passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
