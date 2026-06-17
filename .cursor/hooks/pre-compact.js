#!/usr/bin/env node
// Cursor preCompact hook — inject gstack phase context before context compaction.
// Reads .cursor/hooks/state/gstack.json written by the model during gstack phases.
// Output: { user_message } if state exists, {} otherwise (fail-open).
//
// gstack.json schema: { phase, frozen, modified[] }

'use strict';
const fs = require('fs');
const path = require('path');

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const stateFile = path.join(process.cwd(), '.cursor', 'hooks', 'state', 'gstack.json');

  let state = null;
  try {
    const stat = fs.statSync(stateFile);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 4 * 60 * 60 * 1000) {          // ignore if older than 4h (stale/crash)
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch { /* no state — silent */ }

  if (!state || !state.phase) { done({}); return; }

  const frozen = state.frozen ? ' [FROZEN GATE]' : '';
  const files  = Array.isArray(state.modified) && state.modified.length
    ? `\n  modified: ${state.modified.join(', ')}`
    : '';

  done({ user_message: `[gstack] Phase: ${state.phase}${frozen}${files}` });

  function done(obj) {
    process.stdout.write(JSON.stringify(obj));
    process.exit(0);
  }
});
