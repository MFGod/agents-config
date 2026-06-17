#!/usr/bin/env node
/*
 * FROZEN SOURCE
 *
 * Origin Repository: https://github.com/JuliusBrussee/caveman
 * Origin File: src/hooks/caveman-config.js
 * Origin Commit/Tag: 25d22f864ad68cc447a4cb93aefde918aa4aec9f (main, 2026-06-12)
 *
 * Status: Modified
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
// caveman — shared configuration resolver
//
// Resolution order for default mode:
//   1. CAVEMAN_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $XDG_CONFIG_HOME/caveman/config.json (any platform, if set)
//      - ~/.config/caveman/config.json (macOS / Linux fallback)
//      - %APPDATA%\caveman\config.json (Windows fallback)
//   3. 'full'

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = [
  'off', 'lite', 'full', 'ultra',
  'commit', 'review', 'compress'
];

const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'caveman');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'caveman'
    );
  }
  return path.join(os.homedir(), '.config', 'caveman');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getDefaultMode() {
  // 1. Environment variable (highest priority)
  const envMode = process.env.CAVEMAN_DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }

  // 2. Config file
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    if (config.defaultMode && VALID_MODES.includes(config.defaultMode.toLowerCase())) {
      return config.defaultMode.toLowerCase();
    }
  } catch (e) {
    // Config file doesn't exist or is invalid — fall through
  }

  // 3. Default
  return 'full';
}

// Resolves a directory path through any symlink, verifying the target is a
// directory owned by the current user. Returns the real path or null.
//
// Allows legitimate ~/.claude → /other/dir symlinks while refusing
// attacker-planted symlinks pointing at dirs owned by another user.
// On Windows (no getuid), verifies the resolved path is under the user's home.
//
// Set CAVEMAN_DEBUG=1 to emit stderr diagnostics when resolution is refused.
function resolveRealDir(dir) {
  const debug = process.env.CAVEMAN_DEBUG === '1';
  try {
    const lstat = fs.lstatSync(dir);
    if (!lstat.isSymbolicLink()) return dir;

    const realDir = fs.realpathSync(dir);
    const realStat = fs.statSync(realDir);
    if (!realStat.isDirectory()) {
      if (debug) process.stderr.write(`[caveman] resolveRealDir: symlink target ${realDir} is not a directory\n`);
      return null;
    }
    if (typeof process.getuid === 'function') {
      if (realStat.uid !== process.getuid()) {
        if (debug) process.stderr.write(`[caveman] resolveRealDir: symlink target ${realDir} owned by uid ${realStat.uid}, not current user ${process.getuid()}\n`);
        return null;
      }
    } else {
      const home = os.homedir();
      const normalizedReal = path.resolve(realDir).toLowerCase();
      const normalizedHome = path.resolve(home).toLowerCase();
      if (!normalizedReal.startsWith(normalizedHome + path.sep) &&
          normalizedReal !== normalizedHome) {
        if (debug) process.stderr.write(`[caveman] resolveRealDir: symlink target ${normalizedReal} is outside home directory ${normalizedHome}\n`);
        return null;
      }
    }
    return realDir;
  } catch (e) {
    return null;
  }
}

// Symlink-safe flag file write.
// Writes atomically via temp + rename with 0600 permissions.
// Refuses if the flag file itself is a symlink (clobber vector).
// Silent-fails on any filesystem error — the flag is best-effort.
function safeWriteFlag(flagPath, content) {
  try {
    const flagDir = path.dirname(flagPath);
    // Resolve before mkdir: verify symlink safety first.
    // If dir doesn't exist, mkdir then re-verify ownership.
    let realFlagDir = resolveRealDir(flagDir);
    if (!realFlagDir) {
      try { fs.mkdirSync(flagDir, { recursive: true }); } catch (_) { return; }
      realFlagDir = resolveRealDir(flagDir);
      if (!realFlagDir) return;
    }

    const realFlagPath = path.join(realFlagDir, path.basename(flagPath));
    try {
      if (fs.lstatSync(realFlagPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const tempPath = path.join(realFlagDir, `.${path.basename(flagPath)}.${process.pid}.${Date.now()}`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tempPath, flags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    try {
      fs.renameSync(tempPath, realFlagPath);
    } catch (e) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
      throw e;
    }
  } catch (e) {
    // Silent fail — flag is best-effort
  }
}

// Core read implementation shared by readFlag and readBoolFlag.
// Symlink-safe (refuses symlinks), size-capped, O_NOFOLLOW.
// Calls validator(rawString) — returns its result or null on any anomaly.
function readFlagValidated(flagPath, maxBytes, validator) {
  try {
    let st;
    try { st = fs.lstatSync(flagPath); } catch (e) { return null; }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > maxBytes) return null;

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    let fd;
    let out;
    try {
      fd = fs.openSync(flagPath, fs.constants.O_RDONLY | O_NOFOLLOW);
      const buf = Buffer.alloc(maxBytes);
      const n = fs.readSync(fd, buf, 0, maxBytes, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    return validator(out.trim().toLowerCase());
  } catch (e) {
    return null;
  }
}

// Symlink-safe, whitelist-validated mode flag read.
// Returns a known mode string or null on any anomaly.
function readFlag(flagPath) {
  return readFlagValidated(flagPath, 64, raw => VALID_MODES.includes(raw) ? raw : null);
}

// Symlink-safe boolean flag read (on/off flags, e.g. headroom, rtk).
// Returns 'on', 'off', or null on any anomaly.
function readBoolFlag(flagPath) {
  return readFlagValidated(flagPath, 8, raw => (raw === 'on' || raw === 'off') ? raw : null);
}

// Symlink-safe append for the lifetime stats log (.caveman-history.jsonl).
// Uses O_APPEND so concurrent writers from different sessions don't clobber.
// Silent-fails on any filesystem error.
function appendFlag(filePath, line) {
  try {
    const dir = path.dirname(filePath);
    let realDir = resolveRealDir(dir);
    if (!realDir) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) { return; }
      realDir = resolveRealDir(dir);
      if (!realDir) return;
    }

    const realPath = path.join(realDir, path.basename(filePath));
    try {
      if (fs.lstatSync(realPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(realPath, flags, 0o600);
      fs.writeSync(fd, String(line).replace(/\n$/, '') + '\n');
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  } catch (e) {
    // Silent fail — history is best-effort
  }
}

const MAX_HISTORY_BYTES = 10 * 1024 * 1024; // 10 MB — prevents OOM on large history files

// Symlink-safe history read. Returns lines (untrimmed) or empty array on any anomaly.
// Caller is responsible for parsing JSON.
function readHistory(filePath) {
  try {
    const st = fs.lstatSync(filePath);
    if (st.isSymbolicLink() || !st.isFile()) return [];
    if (st.size > MAX_HISTORY_BYTES) return [];
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    let fd;
    let raw;
    try {
      fd = fs.openSync(filePath, fs.constants.O_RDONLY | O_NOFOLLOW);
      raw = fs.readFileSync(fd, 'utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    return raw.split('\n').filter(line => line.trim());
  } catch (e) {
    return [];
  }
}

module.exports = { getDefaultMode, VALID_MODES, INDEPENDENT_MODES, safeWriteFlag, readFlag, readBoolFlag, appendFlag, readHistory };
