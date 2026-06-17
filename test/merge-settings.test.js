// Integration tests for .claude/scripts/merge-settings.js
// Verifies idempotent hook merge logic: deduplication, field preservation,
// non-array guard, empty-hooks skip, and exit codes.
// Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const MERGE = path.join(__dirname, '..', '.claude', 'scripts', 'merge-settings.js');

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'merge-settings-test-'));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runMerge(targetJson, templateJson) {
  const dir = mktemp();
  const targetPath = path.join(dir, 'settings.json');
  const templatePath = path.join(dir, 'template.json');
  try {
    fs.writeFileSync(targetPath, JSON.stringify(targetJson, null, 2));
    fs.writeFileSync(templatePath, JSON.stringify(templateJson, null, 2));
    const res = spawnSync(process.execPath, [MERGE, targetPath, templatePath], { encoding: 'utf8' });
    const result = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    return { result, stdout: res.stdout, stderr: res.stderr, code: res.status };
  } finally {
    cleanup(dir);
  }
}

test('merges missing hook into empty hooks object', () => {
  const target = { hooks: {} };
  const template = {
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node guard.js', type: 'command' }] }],
    },
  };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.hooks.PreToolUse[0].hooks[0].command, 'node guard.js');
});

test('does not duplicate hook that already exists', () => {
  const existing = { command: 'node guard.js', type: 'command' };
  const target = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [existing] }] } };
  const template = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [existing] }] } };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.hooks.PreToolUse[0].hooks.length, 1);
});

test('adds new hook command alongside existing one', () => {
  const target = {
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node guard.js', type: 'command' }] }] },
  };
  const template = {
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [
        { command: 'node guard.js', type: 'command' },
        { command: 'bash rtk.sh', type: 'command' },
      ]}],
    },
  };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.hooks.PreToolUse[0].hooks.length, 2);
});

test('preserves non-hooks fields in target (theme, language, permissions)', () => {
  const target = { theme: 'dark', language: 'russian', permissions: { allow: ['X'] }, hooks: {} };
  const template = { hooks: { Stop: [{ hooks: [{ command: 'bash stop.sh', type: 'command' }] }] } };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.theme, 'dark');
  assert.strictEqual(result.language, 'russian');
  assert.deepStrictEqual(result.permissions, { allow: ['X'] });
});

test('handles target with no hooks key', () => {
  const target = { theme: 'dark' };
  const template = { hooks: { Stop: [{ hooks: [{ command: 'bash stop.sh', type: 'command' }] }] } };
  const { result } = runMerge(target, template);
  assert.ok(Array.isArray(result.hooks.Stop));
  assert.strictEqual(result.hooks.Stop[0].hooks[0].command, 'bash stop.sh');
});

test('skips template entries with empty hooks arrays (placeholder entries)', () => {
  const target = { hooks: {} };
  const template = { hooks: { PostToolUse: [{ matcher: 'Write|Edit', hooks: [] }] } };
  const { result } = runMerge(target, template);
  // PostToolUse must not appear — empty hook list = placeholder
  assert.strictEqual(result.hooks.PostToolUse, undefined);
});

test('warns and does not clobber non-array event value in target', () => {
  const target = { hooks: { PreToolUse: 'invalid-string' } };
  const template = {
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node guard.js', type: 'command' }] }] },
  };
  const { result, stderr } = runMerge(target, template);
  assert.strictEqual(result.hooks.PreToolUse, 'invalid-string');
  assert.ok(stderr.includes('Warning'));
});

test('deduplication is whitespace-insensitive', () => {
  const target = {
    hooks: { SessionStart: [{ hooks: [{ command: '  node  start.js  ', type: 'command' }] }] },
  };
  const template = {
    hooks: { SessionStart: [{ hooks: [{ command: 'node start.js', type: 'command' }] }] },
  };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.hooks.SessionStart[0].hooks.length, 1);
});

test('merges two different matchers independently under the same event', () => {
  const target = {
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node a.js', type: 'command' }] }] },
  };
  const template = {
    hooks: {
      PreToolUse: [
        { matcher: 'Bash',  hooks: [{ command: 'node a.js', type: 'command' }] },
        { matcher: 'Write', hooks: [{ command: 'node b.js', type: 'command' }] },
      ],
    },
  };
  const { result } = runMerge(target, template);
  assert.strictEqual(result.hooks.PreToolUse.length, 2);
  const bashEntry  = result.hooks.PreToolUse.find(e => e.matcher === 'Bash');
  const writeEntry = result.hooks.PreToolUse.find(e => e.matcher === 'Write');
  assert.strictEqual(bashEntry.hooks.length, 1);
  assert.strictEqual(writeEntry.hooks.length, 1);
});

test('exits 0 and reports merged count on success', () => {
  const dir = mktemp();
  const targetPath = path.join(dir, 'settings.json');
  const templatePath = path.join(dir, 'template.json');
  try {
    fs.writeFileSync(targetPath, JSON.stringify({ hooks: {} }, null, 2));
    fs.writeFileSync(templatePath, JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: 'bash stop.sh', type: 'command' }] }] },
    }, null, 2));
    const res = spawnSync(process.execPath, [MERGE, targetPath, templatePath], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('merged 1'));
  } finally {
    cleanup(dir);
  }
});

test('exits 0 and reports already-up-to-date when nothing to merge', () => {
  const existing = { command: 'node guard.js', type: 'command' };
  const settings = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [existing] }] } };
  const dir = mktemp();
  const targetPath = path.join(dir, 'settings.json');
  const templatePath = path.join(dir, 'template.json');
  try {
    fs.writeFileSync(targetPath, JSON.stringify(settings, null, 2));
    fs.writeFileSync(templatePath, JSON.stringify(settings, null, 2));
    const res = spawnSync(process.execPath, [MERGE, targetPath, templatePath], { encoding: 'utf8' });
    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('up to date'));
  } finally {
    cleanup(dir);
  }
});

test('exits 1 when target file is missing', () => {
  const res = spawnSync(
    process.execPath,
    [MERGE, '/no/such/settings.json', '/no/such/template.json'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(res.status, 1);
});
