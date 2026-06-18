#!/usr/bin/env node
// SessionStart: activates caveman + headroom + rtk in one process.
// Replaces caveman-activate.js + headroom-activate.js + rtk-activate.js.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, safeWriteFlag, readFlag, readBoolFlag, INDEPENDENT_MODES } = require('./caveman-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const parts = [];

// --- caveman ---
(function activateCaveman() {
  const flagPath = path.join(claudeDir, '.caveman-active');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const mode = getDefaultMode();

  if (mode === 'off') {
    try { fs.unlinkSync(flagPath); } catch (e) {}
    return;
  }

  const existingMode = readFlag(flagPath);
  if (existingMode === 'off') return;

  safeWriteFlag(flagPath, mode);

  if (INDEPENDENT_MODES.has(mode)) {
    parts.push('CAVEMAN MODE ACTIVE — level: ' + mode + '. Behavior defined by /caveman-' + mode + ' skill.');
    return;
  }

  const cavemanRules =
    'CAVEMAN MODE ACTIVE — level: ' + mode + '\n\n' +
    'Respond terse like smart caveman. All technical substance stay. Only fluff die.\n\n' +
    '## Persistence\n\n' +
    'ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".\n\n' +
    'Default: **' + mode + '**. Switch: `/caveman lite|full|ultra`.\n\n' +
    '## Rules\n\n' +
    'Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. ' +
    'Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.\n\n' +
    'Pattern: `[thing] [action] [reason]. [next step].`\n\n' +
    'Not: "Sure! I\'d be happy to help you with that. The issue you\'re experiencing is likely caused by..."\n' +
    'Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"\n\n' +
    '## Auto-Clarity\n\n' +
    'Drop caveman when: security warnings, irreversible action confirmations, multi-step sequences where fragment order or omitted conjunctions risk misread, ' +
    'compression itself creates technical ambiguity, user asks to clarify or repeats question. Resume caveman after clear part done.\n\n' +
    '## Boundaries\n\n' +
    'Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.';

  let output = cavemanRules;

  // Statusline nudge when not configured
  try {
    const projectSettingsPath = path.join(process.cwd(), '.claude', 'settings.json');
    let hasStatusline = false;
    for (const sp of [settingsPath, projectSettingsPath]) {
      try {
        if (fs.existsSync(sp)) {
          const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
          if (s.statusLine) { hasStatusline = true; break; }
        }
      } catch (e) {}
    }
    if (!hasStatusline) {
      const isWindows = process.platform === 'win32';
      const scriptName = isWindows ? 'caveman-statusline.ps1' : 'caveman-statusline.sh';
      const scriptPath = path.join(__dirname, scriptName);
      const command = isWindows
        ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
        : `bash "${scriptPath}"`;
      const statusLineSnippet =
        '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
      output += '\n\nSTATUSLINE SETUP NEEDED: The caveman plugin includes a statusline badge. ' +
        'To enable, add this to ' + path.join(claudeDir, 'settings.json') + ': ' +
        statusLineSnippet + ' ' +
        'Proactively offer to set this up for the user on first interaction.';
    }
  } catch (e) {}

  parts.push(output);
})();

// --- headroom ---
(function activateHeadroom() {
  const flagPath = path.join(claudeDir, '.headroom-active');
  let content = readBoolFlag(flagPath);
  if (content === null) {
    safeWriteFlag(flagPath, 'on');
    content = 'on';
  }
  if (content !== 'on') return;
  parts.push(
    'HEADROOM ACTIVE — auto-compress large tool outputs.\n\n' +
    'Setup: call ToolSearch with query "select:mcp__headroom__headroom_compress,mcp__headroom__headroom_retrieve" before first use this session.\n\n' +
    'Rule: when tool returns logs, JSON, search results, command output, or directory listings >100 lines or >3000 chars — ' +
    'call headroom_compress immediately. Use the returned key instead of raw content. ' +
    'Retrieve with headroom_retrieve only when full content is needed for reasoning.\n' +
    'Skip: error messages, short confirmations, code files you need to reason about inline.\n' +
    'Disable: /headroom off'
  );
})();

// --- rtk ---
(function activateRtk() {
  const flagPath = path.join(claudeDir, '.rtk-active');
  // Always force ON at session start (user preference: rtk always on)
  safeWriteFlag(flagPath, 'on');
  parts.push(
    'RTK ACTIVE (ON) — Bash commands auto-rewritten for token efficiency.\n' +
    'Toggle: /rtk off | /rtk on'
  );
})();

if (parts.length > 0) {
  process.stdout.write(parts.join('\n\n'));
}
