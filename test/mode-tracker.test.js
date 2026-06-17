// Integration tests for .claude/hooks/mode-tracker.js
// Tests slash commands and NL triggers for RTK and Headroom features.
// Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TRACKER = path.join(__dirname, '..', '.claude', 'hooks', 'mode-tracker.js');

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mode-tracker-test-'));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Run tracker with given prompt; returns { stdout, exitCode, contextMessage }.
function run(prompt, claudeDir) {
  const res = spawnSync(process.execPath, [TRACKER], {
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: claudeDir },
  });
  const raw = (res.stdout || '').trim();
  let contextMessage = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      contextMessage = parsed?.hookSpecificOutput?.additionalContext ?? null;
    } catch { /* empty output is valid */ }
  }
  return { stdout: raw, exitCode: res.status, contextMessage };
}

// ── /rtk slash commands ───────────────────────────────────────────────────

test('/rtk (no arg) enables RTK and injects context', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('/rtk', dir);
    assert.ok(contextMessage && contextMessage.includes('RTK ON'), `expected RTK ON context, got: ${contextMessage}`);
  } finally { cleanup(dir); }
});

test('/rtk on enables RTK and injects context', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('/rtk on', dir);
    assert.ok(contextMessage && contextMessage.includes('RTK ON'));
  } finally { cleanup(dir); }
});

test('/rtk off disables RTK and produces no context output', () => {
  const dir = mktemp();
  try {
    // First enable
    run('/rtk on', dir);
    // Then disable
    const { contextMessage } = run('/rtk off', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('/rtk disable disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('/rtk disable', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('/rtk stop disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('/rtk stop', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

// ── /headroom slash commands ───────────────────────────────────────────────

test('/headroom on enables Headroom and injects context', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('/headroom on', dir);
    assert.ok(contextMessage && contextMessage.includes('HEADROOM ACTIVE'));
  } finally { cleanup(dir); }
});

test('/headroom off disables Headroom and produces no context output', () => {
  const dir = mktemp();
  try {
    run('/headroom on', dir);
    const { contextMessage } = run('/headroom off', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

// ── RTK natural language triggers ─────────────────────────────────────────

test('NL "выключить rtk" disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('выключить rtk', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('NL "включить rtk" enables RTK', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('включить rtk', dir);
    assert.ok(contextMessage && contextMessage.includes('RTK ON'));
  } finally { cleanup(dir); }
});

test('NL "disable rtk" disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('disable rtk', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('NL "turn off rtk" disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('turn off rtk', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('NL "enable rtk" enables RTK', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('enable rtk', dir);
    assert.ok(contextMessage && contextMessage.includes('RTK ON'));
  } finally { cleanup(dir); }
});

test('NL "rtk off" disables RTK', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('rtk off', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

// ── Headroom natural language triggers ────────────────────────────────────

test('NL "выключить headroom" disables Headroom', () => {
  const dir = mktemp();
  try {
    run('/headroom on', dir);
    const { contextMessage } = run('выключить headroom', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('NL "disable headroom" disables Headroom', () => {
  const dir = mktemp();
  try {
    run('/headroom on', dir);
    const { contextMessage } = run('disable headroom', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('NL "enable headroom" enables Headroom', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('enable headroom', dir);
    assert.ok(contextMessage && contextMessage.includes('HEADROOM ACTIVE'));
  } finally { cleanup(dir); }
});

// ── Neutral prompt — no false positives ───────────────────────────────────

test('neutral prompt does not trigger RTK when flag is off', () => {
  const dir = mktemp();
  try {
    const { contextMessage } = run('explain how this function works', dir);
    assert.strictEqual(contextMessage, null);
  } finally { cleanup(dir); }
});

test('neutral prompt with RTK flag ON still injects context', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('explain how this function works', dir);
    assert.ok(contextMessage && contextMessage.includes('RTK ON'));
  } finally { cleanup(dir); }
});

test('"выключить" alone does not trigger RTK off (missing keyword)', () => {
  const dir = mktemp();
  try {
    run('/rtk on', dir);
    const { contextMessage } = run('выключить компьютер', dir);
    // RTK should remain ON — no RTK keyword → no change → context still injected
    assert.ok(contextMessage && contextMessage.includes('RTK ON'));
  } finally { cleanup(dir); }
});

// ── Error handling ────────────────────────────────────────────────────────

test('malformed JSON input exits 0 with no output (silent fail)', () => {
  const dir = mktemp();
  try {
    const res = spawnSync(process.execPath, [TRACKER], {
      input: 'not json at all',
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(res.status, 0);
    assert.strictEqual((res.stdout || '').trim(), '');
  } finally { cleanup(dir); }
});
