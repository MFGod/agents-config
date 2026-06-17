#!/usr/bin/env node
// Cursor sessionStart hook — inject RTK status as additional_context.
// Flag shared with CC: ~/.claude/.rtk-active (or $CLAUDE_CONFIG_DIR). Default: ON on first install.

const path = require('path');
const os = require('os');

function tryRequire(p) { try { return require(p); } catch (_) { return null; } }
const cavemanConfig = tryRequire('./caveman-config');

if (!cavemanConfig) { process.exit(0); }
const { safeWriteFlag, readBoolFlag } = cavemanConfig;

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.rtk-active');

let mode = readBoolFlag(flagPath);
if (mode === null) {
  safeWriteFlag(flagPath, 'on');
  mode = 'on';
}

if (mode !== 'on') { process.exit(0); }

process.stdout.write(JSON.stringify({
  additional_context:
    'RTK ACTIVE (ON) — Shell commands auto-rewritten for token efficiency.\n' +
    'To disable: printf "off" > ~/.claude/.rtk-active',
}));
