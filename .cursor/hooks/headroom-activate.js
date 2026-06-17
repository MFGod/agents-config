#!/usr/bin/env node
// Cursor sessionStart hook — inject headroom usage rules as additional_context.
// Flag shared with CC: ~/.claude/.headroom-active. Default: ON on first install.
// Headroom MCP must be configured in .cursor/mcp.json for tools to be available.

const path = require('path');
const os = require('os');

function tryRequire(p) { try { return require(p); } catch (_) { return null; } }
const cavemanConfig = tryRequire('./caveman-config');

if (!cavemanConfig) { process.exit(0); }
const { safeWriteFlag, readBoolFlag } = cavemanConfig;

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.headroom-active');

let content = readBoolFlag(flagPath);

// First install: file absent → default ON
if (content === null) {
  safeWriteFlag(flagPath, 'on');
  content = 'on';
}

if (content !== 'on') { process.exit(0); }

process.stdout.write(JSON.stringify({
  additional_context: [
    'HEADROOM ACTIVE — auto-compress large tool outputs.',
    '',
    'Rule: when tool returns logs, JSON, search results, command output, or directory listings',
    '>100 lines or >3000 chars — call headroom_compress immediately.',
    'Use the returned key instead of raw content.',
    'Retrieve with headroom_retrieve only when full content is needed for reasoning.',
    '',
    'Skip: error messages, short confirmations, code files you need to reason about inline.',
  ].join('\n'),
}));
