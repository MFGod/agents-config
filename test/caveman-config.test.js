// Unit/integration tests for .claude/hooks/caveman-config.js
// Tests symlink-safe flag operations (security-critical code).
// Run: node --test

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  readFlag, readBoolFlag, safeWriteFlag, appendFlag, readHistory,
  getDefaultMode, VALID_MODES,
} = require('../.claude/hooks/caveman-config');

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'caveman-config-test-'));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── readFlag ──────────────────────────────────────────────────────────────

test('readFlag returns known mode from file', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'full', { mode: 0o600 });
    assert.strictEqual(readFlag(f), 'full');
  } finally { cleanup(dir); }
});

test('readFlag is case-insensitive (trims and lowercases)', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'FULL\n', { mode: 0o600 });
    assert.strictEqual(readFlag(f), 'full');
  } finally { cleanup(dir); }
});

test('readFlag returns null for unknown mode', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'turbo', { mode: 0o600 });
    assert.strictEqual(readFlag(f), null);
  } finally { cleanup(dir); }
});

test('readFlag returns null for missing file', () => {
  assert.strictEqual(readFlag(path.join(os.tmpdir(), 'no-such-caveman-flag-xyz')), null);
});

test('readFlag refuses symlink', () => {
  const dir = mktemp();
  try {
    const target = path.join(dir, 'real');
    const link = path.join(dir, 'link');
    fs.writeFileSync(target, 'full', { mode: 0o600 });
    fs.symlinkSync(target, link);
    assert.strictEqual(readFlag(link), null);
  } finally { cleanup(dir); }
});

test('readFlag returns null for oversized content (> 64 bytes)', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'full' + 'x'.repeat(100), { mode: 0o600 });
    assert.strictEqual(readFlag(f), null);
  } finally { cleanup(dir); }
});

test('readFlag accepts all VALID_MODES', () => {
  const dir = mktemp();
  try {
    for (const mode of VALID_MODES) {
      const f = path.join(dir, `flag-${mode}`);
      fs.writeFileSync(f, mode, { mode: 0o600 });
      assert.strictEqual(readFlag(f), mode, `expected mode '${mode}' to be accepted`);
    }
  } finally { cleanup(dir); }
});

// ── readBoolFlag ──────────────────────────────────────────────────────────

test('readBoolFlag returns "on"', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'on', { mode: 0o600 });
    assert.strictEqual(readBoolFlag(f), 'on');
  } finally { cleanup(dir); }
});

test('readBoolFlag returns "off"', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'off', { mode: 0o600 });
    assert.strictEqual(readBoolFlag(f), 'off');
  } finally { cleanup(dir); }
});

test('readBoolFlag returns null for unknown value', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'yes', { mode: 0o600 });
    assert.strictEqual(readBoolFlag(f), null);
  } finally { cleanup(dir); }
});

test('readBoolFlag refuses symlink', () => {
  const dir = mktemp();
  try {
    const target = path.join(dir, 'real');
    const link = path.join(dir, 'link');
    fs.writeFileSync(target, 'on', { mode: 0o600 });
    fs.symlinkSync(target, link);
    assert.strictEqual(readBoolFlag(link), null);
  } finally { cleanup(dir); }
});

// ── safeWriteFlag ─────────────────────────────────────────────────────────

test('safeWriteFlag writes content to new file', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    safeWriteFlag(f, 'full');
    assert.strictEqual(fs.readFileSync(f, 'utf8'), 'full');
  } finally { cleanup(dir); }
});

test('safeWriteFlag overwrites existing content atomically', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'flag');
    fs.writeFileSync(f, 'lite', { mode: 0o600 });
    safeWriteFlag(f, 'ultra');
    assert.strictEqual(fs.readFileSync(f, 'utf8'), 'ultra');
  } finally { cleanup(dir); }
});

test('safeWriteFlag refuses to write through symlink (clobber vector)', () => {
  const dir = mktemp();
  try {
    const target = path.join(dir, 'real');
    const link = path.join(dir, 'link');
    fs.writeFileSync(target, 'original', { mode: 0o600 });
    fs.symlinkSync(target, link);
    safeWriteFlag(link, 'injected');
    // Real target must remain untouched
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'original');
  } finally { cleanup(dir); }
});

// ── appendFlag ────────────────────────────────────────────────────────────

test('appendFlag creates file and appends two lines', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'history.jsonl');
    appendFlag(f, '{"a":1}');
    appendFlag(f, '{"b":2}');
    const lines = fs.readFileSync(f, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 2);
    assert.deepStrictEqual(JSON.parse(lines[0]), { a: 1 });
    assert.deepStrictEqual(JSON.parse(lines[1]), { b: 2 });
  } finally { cleanup(dir); }
});

test('appendFlag refuses symlink target', () => {
  const dir = mktemp();
  try {
    const target = path.join(dir, 'real.jsonl');
    const link = path.join(dir, 'link.jsonl');
    fs.writeFileSync(target, '', { mode: 0o600 });
    fs.symlinkSync(target, link);
    appendFlag(link, '{"injected":true}');
    assert.strictEqual(fs.readFileSync(target, 'utf8'), '');
  } finally { cleanup(dir); }
});

// ── readHistory ───────────────────────────────────────────────────────────

test('readHistory returns non-empty lines from valid JSONL', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'hist.jsonl');
    fs.writeFileSync(f, '{"x":1}\n{"y":2}\n', { mode: 0o600 });
    const lines = readHistory(f);
    assert.strictEqual(lines.length, 2);
  } finally { cleanup(dir); }
});

test('readHistory skips blank lines', () => {
  const dir = mktemp();
  try {
    const f = path.join(dir, 'hist.jsonl');
    fs.writeFileSync(f, '{"x":1}\n\n{"y":2}\n\n', { mode: 0o600 });
    const lines = readHistory(f);
    assert.strictEqual(lines.length, 2);
  } finally { cleanup(dir); }
});

test('readHistory returns empty array for missing file', () => {
  assert.deepStrictEqual(readHistory(path.join(os.tmpdir(), 'no-such-hist-xyz.jsonl')), []);
});

test('readHistory refuses symlink', () => {
  const dir = mktemp();
  try {
    const target = path.join(dir, 'real.jsonl');
    const link = path.join(dir, 'link.jsonl');
    fs.writeFileSync(target, '{"x":1}\n', { mode: 0o600 });
    fs.symlinkSync(target, link);
    assert.deepStrictEqual(readHistory(link), []);
  } finally { cleanup(dir); }
});

// ── getDefaultMode ────────────────────────────────────────────────────────

test('getDefaultMode respects CAVEMAN_DEFAULT_MODE env var', () => {
  const saved = process.env.CAVEMAN_DEFAULT_MODE;
  process.env.CAVEMAN_DEFAULT_MODE = 'lite';
  try {
    assert.strictEqual(getDefaultMode(), 'lite');
  } finally {
    if (saved === undefined) delete process.env.CAVEMAN_DEFAULT_MODE;
    else process.env.CAVEMAN_DEFAULT_MODE = saved;
  }
});

test('getDefaultMode ignores invalid CAVEMAN_DEFAULT_MODE and returns a valid mode', () => {
  const saved = process.env.CAVEMAN_DEFAULT_MODE;
  process.env.CAVEMAN_DEFAULT_MODE = 'turbo';
  try {
    assert.ok(VALID_MODES.includes(getDefaultMode()), 'result must be a VALID_MODE');
  } finally {
    if (saved === undefined) delete process.env.CAVEMAN_DEFAULT_MODE;
    else process.env.CAVEMAN_DEFAULT_MODE = saved;
  }
});
