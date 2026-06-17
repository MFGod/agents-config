// Integration tests for .claude/hooks/safety-guard.js — the security guard that
// blocks DROP TABLE/DATABASE and force-pushes to protected branches across the
// three hook contexts (CC PreToolUse, Cursor preToolUse, Cursor beforeShellExec).
// Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const GUARD = path.join(__dirname, '..', '.claude', 'hooks', 'safety-guard.js');

// Feed a payload to the guard via stdin; return parsed { denied, raw }.
function runGuard(payload) {
  const res = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  const raw = (res.stdout || '').trim();
  let denied = false;
  if (raw) {
    const out = JSON.parse(raw);
    denied =
      out.permission === 'deny' ||
      out.hookSpecificOutput?.permissionDecision === 'deny';
  }
  return { denied, raw };
}

const cc = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const cursor = (command) => ({
  hook_event_name: 'preToolUse',
  tool_name: 'Shell',
  tool_input: { command },
});

test('blocks DROP TABLE at command position (CC Bash)', () => {
  assert.strictEqual(runGuard(cc('DROP TABLE users')).denied, true);
});

test('blocks DROP DATABASE after a separator (Cursor Shell)', () => {
  assert.strictEqual(runGuard(cursor('echo done; drop database app')).denied, true);
});

test('blocks force-push to protected branch main', () => {
  assert.strictEqual(runGuard(cc('git push --force origin main')).denied, true);
});

test('blocks --force-with-lease to prod', () => {
  assert.strictEqual(runGuard(cc('git push --force-with-lease origin prod')).denied, true);
});

test('blocks refspec force (+HEAD:dev) to protected branch', () => {
  assert.strictEqual(runGuard(cc('git push origin +HEAD:dev')).denied, true);
});

test('allows force-push to non-protected feature branch', () => {
  assert.strictEqual(runGuard(cc('git push --force origin dev-123-feature')).denied, false);
});

test('allows plain push to main (no force)', () => {
  assert.strictEqual(runGuard(cc('git push origin main')).denied, false);
});

test('allows harmless command', () => {
  assert.strictEqual(runGuard(cc('ls -la')).denied, false);
});

test('does not false-positive on "drop table" inside echo argument', () => {
  assert.strictEqual(runGuard(cc('echo "how to drop table in sql"')).denied, false);
});

test('ignores non-Bash CC tools (Write)', () => {
  const res = runGuard({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'y' } });
  assert.strictEqual(res.denied, false);
});

test('allows on malformed JSON (fail-open)', () => {
  const res = spawnSync(process.execPath, [GUARD], { input: 'not json', encoding: 'utf8' });
  assert.strictEqual((res.stdout || '').trim(), '');
});

test('blocks DROP TABLE in Cursor beforeShellExecution with tool_name field', () => {
  const payload = { hook_event_name: 'beforeShellExecution', tool_name: 'Shell', command: 'drop table users' };
  assert.strictEqual(runGuard(payload).denied, true);
});

test('blocks force-push in Cursor beforeShellExecution with tool_name field', () => {
  const payload = { hook_event_name: 'beforeShellExecution', tool_name: 'Shell', command: 'git push --force origin main' };
  assert.strictEqual(runGuard(payload).denied, true);
});
