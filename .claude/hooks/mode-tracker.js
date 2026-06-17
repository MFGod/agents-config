#!/usr/bin/env node
// UserPromptSubmit: tracks caveman + rtk + headroom modes in one process.
// Replaces caveman-mode-tracker.js + bool-mode-tracker.js.

const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  getDefaultMode, safeWriteFlag, readFlag, readBoolFlag,
  VALID_MODES, INDEPENDENT_MODES,
} = require('./caveman-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const cavemanFlag = path.join(claudeDir, '.caveman-active');
const rtkFlag = path.join(claudeDir, '.rtk-active');
const headroomFlag = path.join(claudeDir, '.headroom-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim();
    const lower = prompt.toLowerCase();

    // /caveman-stats → block early with stats output
    const statsMatch = /^\/caveman(?::caveman)?-stats(?:\s+(.*))?$/i.exec(lower);
    if (statsMatch) {
      const tailArgs = (statsMatch[1] || '').trim().split(/\s+/).filter(Boolean);
      try {
        const statsPath = path.join(__dirname, 'caveman-stats.js');
        const argv = [statsPath];
        if (data.transcript_path) argv.push('--session-file', data.transcript_path);
        if (tailArgs.includes('--share')) argv.push('--share');
        if (tailArgs.includes('--all')) argv.push('--all');
        const sinceIdx = tailArgs.indexOf('--since');
        if (sinceIdx !== -1 && tailArgs[sinceIdx + 1]) argv.push('--since', tailArgs[sinceIdx + 1]);
        const out = execFileSync(process.execPath, argv, { encoding: 'utf8', timeout: 5000 });
        process.stdout.write(JSON.stringify({ decision: 'block', reason: out.trim() }));
      } catch (e) {
        process.stdout.write(JSON.stringify({
          decision: 'block',
          reason: 'caveman-stats: could not run stats script.\nTry manually: node hooks/caveman-stats.js',
        }));
      }
      return;
    }

    // --- caveman ---
    if (lower.startsWith('/caveman')) {
      const parts = lower.split(/\s+/);
      const cmd = parts[0];
      const arg = parts[1] || '';
      let mode = null;

      if (cmd === '/caveman-commit') { mode = 'commit'; }
      else if (cmd === '/caveman-review') { mode = 'review'; }
      else if (cmd === '/caveman-compress' || cmd === '/caveman:caveman-compress') { mode = 'compress'; }
      else if (cmd === '/caveman' || cmd === '/caveman:caveman') {
        if (!arg) { mode = getDefaultMode(); }
        else if (arg === 'off' || arg === 'stop' || arg === 'disable') { mode = 'off'; }
        else if (VALID_MODES.includes(arg) && !INDEPENDENT_MODES.has(arg)) { mode = arg; }
      }
      if (mode) safeWriteFlag(cavemanFlag, mode);
    }

    // caveman NL patterns
    if (!lower.startsWith('/caveman')) {
      if ((/\b(?:activate|enable|turn on|start)\b.*\bcaveman\b/i.test(lower) ||
           /\bcaveman\b.*\b(?:mode|activate|enable|on)\b/i.test(lower) ||
           /\b(?:less tokens|fewer tokens|be brief|be terse)\b/i.test(lower)) &&
          !/\b(?:stop|disable|turn off|deactivate|don't|dont|not)\b/i.test(lower)) {
        const nlMode = getDefaultMode();
        if (nlMode !== 'off') safeWriteFlag(cavemanFlag, nlMode);
      }
      if (/^(?:stop caveman|normal mode)(?:\s|$)/i.test(lower)) {
        safeWriteFlag(cavemanFlag, 'off');
      }
    }

    // --- rtk ---
    if (lower === '/rtk' || lower.startsWith('/rtk ')) {
      const arg = (lower.split(/\s+/)[1] || '').trim();
      safeWriteFlag(rtkFlag, (arg === 'off' || arg === 'disable' || arg === 'stop') ? 'off' : 'on');
    } else if ((/выключ(?:ить|и(?:те)?|ай(?:те)?)?/i.test(lower) && /\brtk\b/i.test(lower)) ||
               /\b(?:disable|turn off|deactivate)\b.*\brtk\b/i.test(lower) ||
               /\brtk\b.*\b(?:off|disable|deactivate)\b/i.test(lower)) {
      safeWriteFlag(rtkFlag, 'off');
    } else if ((/включ(?:ить|и(?:те)?|ай(?:те)?)?/i.test(lower) && !/выключ/i.test(lower) && /\brtk\b/i.test(lower)) ||
               /\b(?:enable|turn on|activate)\b.*\brtk\b/i.test(lower) ||
               /\brtk\b.*\b(?:on|enable|activate)\b/i.test(lower)) {
      safeWriteFlag(rtkFlag, 'on');
    }

    // --- headroom ---
    if (lower === '/headroom' || lower.startsWith('/headroom ')) {
      const arg = (lower.split(/\s+/)[1] || '').trim();
      safeWriteFlag(headroomFlag, (arg === 'off' || arg === 'disable' || arg === 'stop') ? 'off' : 'on');
    } else if ((/выключ(?:ить|и(?:те)?|ай(?:те)?)?/i.test(lower) && /\bheadroom\b/i.test(lower)) ||
               /\b(?:disable|turn off|deactivate)\b.*\bheadroom\b/i.test(lower) ||
               /\bheadroom\b.*\b(?:off|disable|deactivate)\b/i.test(lower)) {
      safeWriteFlag(headroomFlag, 'off');
    } else if ((/включ(?:ить|и(?:те)?|ай(?:те)?)?/i.test(lower) && !/выключ/i.test(lower) && /\bheadroom\b/i.test(lower)) ||
               /\b(?:enable|turn on|activate)\b.*\bheadroom\b/i.test(lower) ||
               /\bheadroom\b.*\b(?:on|enable|activate)\b/i.test(lower)) {
      safeWriteFlag(headroomFlag, 'on');
    }

    // --- build combined additionalContext ---
    const contexts = [];

    const activeMode = readFlag(cavemanFlag);
    if (activeMode && activeMode !== 'off' && !INDEPENDENT_MODES.has(activeMode)) {
      contexts.push(
        'CAVEMAN MODE ACTIVE (' + activeMode + '). ' +
        'Drop articles/filler/pleasantries/hedging. Fragments OK. ' +
        'Code/commits/security: write normal.'
      );
    }

    if (readBoolFlag(rtkFlag) === 'on') {
      contexts.push('RTK ON — Bash commands auto-rewritten for token efficiency. Use /rtk off to disable.');
    }

    if (readBoolFlag(headroomFlag) === 'on') {
      contexts.push(
        'HEADROOM ACTIVE — compress logs/JSON/search results/command output >100 lines ' +
        'with headroom_compress. Skip code files needed for reasoning.'
      );
    }

    if (contexts.length > 0) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: contexts.join('\n'),
        },
      }));
    }
  } catch (e) {
    // Silent fail
  }
});
