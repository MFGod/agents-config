// Hook execution tests for the unified Claude Code session hook:
//   - session-activate.js (SessionStart — replaces caveman/rtk/headroom activate hooks)
//   - post-edit-check.js  (PostToolUse)
// Validates actual hook behavior with mocked filesystem env.
// Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS = path.join(__dirname, '..', '.claude', 'hooks');
const SESSION_HOOK = path.join(HOOKS, 'session-activate.js');
const PEDIT_HOOK   = path.join(HOOKS, 'post-edit-check.js');

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hook-exec-test-'));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runHook(hookPath, { claudeDir, stdin } = {}) {
  const env = { ...process.env };
  if (claudeDir) env.CLAUDE_CONFIG_DIR = claudeDir;
  const opts = { encoding: 'utf8', env };
  if (stdin !== undefined) opts.input = typeof stdin === 'string' ? stdin : JSON.stringify(stdin);
  return spawnSync(process.execPath, [hookPath], opts);
}

// ── session-activate.js — RTK ─────────────────────────────────────────────

test('rtk: first install (no flag) → sets ON, outputs RTK ACTIVE', () => {
  const dir = mktemp();
  try {
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('RTK ACTIVE'), `expected RTK ACTIVE in output, got: ${res.stdout}`);
    const flag = path.join(dir, '.rtk-active');
    assert.strictEqual(fs.readFileSync(flag, 'utf8'), 'on');
  } finally { cleanup(dir); }
});

test('rtk: flag ON → outputs RTK ACTIVE', () => {
  const dir = mktemp();
  try {
    fs.writeFileSync(path.join(dir, '.rtk-active'), 'on', { mode: 0o600 });
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('RTK ACTIVE'), `expected RTK ACTIVE in output, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

test('rtk: flag OFF → no RTK ACTIVE in output', () => {
  const dir = mktemp();
  try {
    fs.writeFileSync(path.join(dir, '.rtk-active'), 'off', { mode: 0o600 });
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(!res.stdout.includes('RTK ACTIVE'), `expected no RTK ACTIVE, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

// ── session-activate.js — Headroom ────────────────────────────────────────

test('headroom: first install (no flag) → sets ON, outputs HEADROOM ACTIVE', () => {
  const dir = mktemp();
  try {
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('HEADROOM ACTIVE'), `expected HEADROOM ACTIVE in output, got: ${res.stdout}`);
    const flag = path.join(dir, '.headroom-active');
    assert.strictEqual(fs.readFileSync(flag, 'utf8'), 'on');
  } finally { cleanup(dir); }
});

test('headroom: flag ON → outputs HEADROOM ACTIVE', () => {
  const dir = mktemp();
  try {
    fs.writeFileSync(path.join(dir, '.headroom-active'), 'on', { mode: 0o600 });
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('HEADROOM ACTIVE'), `expected HEADROOM ACTIVE in output, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

test('headroom: flag OFF → no HEADROOM ACTIVE in output', () => {
  const dir = mktemp();
  try {
    fs.writeFileSync(path.join(dir, '.headroom-active'), 'off', { mode: 0o600 });
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
    assert.ok(!res.stdout.includes('HEADROOM ACTIVE'), `expected no HEADROOM ACTIVE, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

test('headroom: exit 0 always', () => {
  const dir = mktemp();
  try {
    const res = runHook(SESSION_HOOK, { claudeDir: dir });
    assert.strictEqual(res.status, 0);
  } finally { cleanup(dir); }
});

// ── post-edit-check.js ────────────────────────────────────────────────────

function editPayload(filePath) {
  return { tool_name: 'Edit', tool_input: { file_path: filePath } };
}
function writePayload(filePath) {
  return { tool_name: 'Write', tool_input: { file_path: filePath } };
}

test('post-edit: valid .js file → no error output', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'valid.js');
    fs.writeFileSync(f, 'const x = 1;\n');
    const res = runHook(PEDIT_HOOK, { stdin: editPayload(f) });
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
  } finally { cleanup(dir); }
});

test('post-edit: invalid .js file → reports syntax error', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'broken.js');
    fs.writeFileSync(f, 'const = ;\n');
    const res = runHook(PEDIT_HOOK, { stdin: editPayload(f) });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('[post-edit-check]'), `expected error report, got: ${res.stdout}`);
    assert.ok(res.stdout.includes('broken.js'));
  } finally { cleanup(dir); }
});

test('post-edit: valid .json file → no error output', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'valid.json');
    fs.writeFileSync(f, '{"key": "value"}\n');
    const res = runHook(PEDIT_HOOK, { stdin: writePayload(f) });
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
  } finally { cleanup(dir); }
});

test('post-edit: invalid .json file → reports syntax error', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'broken.json');
    fs.writeFileSync(f, '{bad json}\n');
    const res = runHook(PEDIT_HOOK, { stdin: writePayload(f) });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('[post-edit-check]'), `expected error report, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

test('post-edit: valid .sh file → no error output', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'valid.sh');
    fs.writeFileSync(f, '#!/usr/bin/env bash\necho hello\n');
    const res = runHook(PEDIT_HOOK, { stdin: editPayload(f) });
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
  } finally { cleanup(dir); }
});

test('post-edit: invalid .sh file → reports syntax error', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'broken.sh');
    fs.writeFileSync(f, '#!/usr/bin/env bash\nif then\n');
    const res = runHook(PEDIT_HOOK, { stdin: editPayload(f) });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('[post-edit-check]'), `expected error report, got: ${res.stdout}`);
  } finally { cleanup(dir); }
});

test('post-edit: non-Edit/Write tool → no output, exit 0', () => {
  const dir = mktemp();
  try {
    const res = runHook(PEDIT_HOOK, { stdin: { tool_name: 'Read', tool_input: { file_path: '/tmp/x.js' } } });
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
  } finally { cleanup(dir); }
});

test('post-edit: unsupported extension (.ts) → no output, exit 0', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'file.ts');
    fs.writeFileSync(f, 'const x: number = "bad";\n');
    const res = runHook(PEDIT_HOOK, { stdin: editPayload(f) });
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.stdout.trim(), '');
  } finally { cleanup(dir); }
});

test('post-edit: malformed JSON stdin → exit 0, no output', () => {
  const res = runHook(PEDIT_HOOK, { stdin: 'not json at all' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '');
});
