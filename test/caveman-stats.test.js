// Unit tests for the pure helpers exported by .claude/hooks/caveman-stats.js.
// These are intentionally separated from main() so they can be tested without a
// live session log. Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const stats = require('../.claude/hooks/caveman-stats.js');

test('priceForModel matches by model id prefix', () => {
  assert.strictEqual(stats.priceForModel('claude-opus-4-8'), 75);
  assert.strictEqual(stats.priceForModel('claude-sonnet-4-6'), 15);
  assert.strictEqual(stats.priceForModel('claude-haiku-4-5'), 4);
  assert.strictEqual(stats.priceForModel('gpt-4'), null);
  assert.strictEqual(stats.priceForModel(null), null);
});

test('formatUsd scales precision with magnitude', () => {
  assert.strictEqual(stats.formatUsd(1.5), '$1.50');
  assert.strictEqual(stats.formatUsd(0.05), '$0.050');
  assert.strictEqual(stats.formatUsd(0.0001), '$0.0001');
});

test('parseDuration accepts Nd / Nh, rejects junk', () => {
  assert.strictEqual(stats.parseDuration('7d'), 7 * 86_400_000);
  assert.strictEqual(stats.parseDuration('12h'), 12 * 3_600_000);
  assert.strictEqual(stats.parseDuration('week'), null);
  assert.strictEqual(stats.parseDuration(null), null);
});

test('deriveSavings uses the full-mode compression ratio', () => {
  const r = stats.deriveSavings({ outputTokens: 3500, mode: 'full', model: 'claude-sonnet-4-6' });
  assert.strictEqual(r.estSavedTokens, 6500); // round(3500/0.35) - 3500
  assert.ok(Math.abs(r.estSavedUsd - 0.0975) < 1e-9);
});

test('deriveSavings returns zero when no ratio is known for mode', () => {
  assert.deepStrictEqual(
    stats.deriveSavings({ outputTokens: 3500, mode: 'lite', model: 'claude-sonnet-4-6' }),
    { estSavedTokens: 0, estSavedUsd: 0 }
  );
});

test('humanizeTokens renders compact units', () => {
  assert.strictEqual(stats.humanizeTokens(1500), '1.5k');
  assert.strictEqual(stats.humanizeTokens(2_000_000), '2.0M');
  assert.strictEqual(stats.humanizeTokens(0), '0');
});
