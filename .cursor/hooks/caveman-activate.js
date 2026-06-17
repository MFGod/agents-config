#!/usr/bin/env node
/*
 * FROZEN SOURCE
 *
 * Origin Repository: https://github.com/JuliusBrussee/caveman
 * Origin File: src/hooks/caveman-activate.js
 * Origin Commit/Tag: 25d22f864ad68cc447a4cb93aefde918aa4aec9f (main, 2026-06-12)
 *
 * Status: Adapted
 *
 * This file is based on an external implementation.
 * Before making changes:
 * 1. Compare with the original source.
 * 2. Verify that upstream behavior is preserved.
 * 3. Check for upstream updates or fixes.
 * 4. Document reasons for any divergence.
 *
 * Do not refactor, simplify, optimize, or rewrite this file
 * without understanding the original implementation and its intent.
 */
// Cursor sessionStart hook — inject caveman rules as additional_context.
// Respects CAVEMAN_DEFAULT_MODE env var and ~/.config/caveman/config.json (same as CC).
// Cursor applies cursor-caveman.mdc (alwaysApply: true) — hook provides redundant anchor.

function tryRequire(p) { try { return require(p); } catch (_) { return null; } }
const cavemanConfig = tryRequire('./caveman-config');
const getDefaultMode = cavemanConfig ? cavemanConfig.getDefaultMode : () => 'full';

if (getDefaultMode() === 'off') {
  process.exit(0);
}

const rules = [
  'Respond terse like smart caveman. All technical substance stay. Only fluff die.',
  '',
  'Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries',
  '(sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms.',
  'Technical terms exact. Code blocks unchanged. Errors quoted exact.',
  '',
  'Pattern: `[thing] [action] [reason]. [next step].`',
  '',
  'Auto-Clarity: drop caveman for security warnings, irreversible action confirmations,',
  'multi-step sequences where fragment order risks misread. Resume caveman after.',
  '',
  'Code/commits/PRs: write normal.',
].join('\n');

process.stdout.write(JSON.stringify({
  additional_context: 'CAVEMAN MODE ACTIVE\n\n' + rules,
}));
