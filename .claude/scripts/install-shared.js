#!/usr/bin/env node
'use strict';

// Shared instructions and skills installer. Only exact kit-owned content is
// replaced; legacy directories are backed up before harness adapters replace them.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const [repoArg, targetArg, claudeArg, cursorArg, ...stackFlags] = process.argv.slice(2);
if (!repoArg || !targetArg || stackFlags.length !== 4 || [claudeArg, cursorArg, ...stackFlags].some((value) => !['true', 'false'].includes(value))) {
  console.error('Usage: install-shared.js REPO TARGET CLAUDE CURSOR REACT VUE FASTAPI DJANGO');
  process.exit(1);
}
const repo = fs.realpathSync(repoArg);
const target = fs.realpathSync(targetArg);
if (repo === target) {
  console.error('The target project must differ from the kit checkout.');
  process.exit(1);
}
const claude = claudeArg === 'true';
const cursor = cursorArg === 'true';
const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-install-hashes.json'), 'utf8'));
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
let previous = {};
const managed = {};
const backupRoot = `.agents/backups/${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const START = '<!-- agents-config:shared:start -->';
const END = '<!-- agents-config:shared:end -->';

// Refuse symlink traversal, including dangling links. All destination names are
// controlled by this installer, but existing project paths remain untrusted.
function destination(relative, allowLeafLink = false) {
  if (path.isAbsolute(relative) || relative.split('/').some((part) => part === '..' || !part)) {
    throw new Error(`Unsafe installation path: ${relative}`);
  }
  let current = target;
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink() && !(allowLeafLink && index === parts.length - 1)) {
      throw new Error(`Symlink blocks installation: ${current}. Replace it with an in-project directory/file first.`);
    }
  }
  return current;
}

function treeHashes(directory, sourceFiles = false) {
  const result = {};
  function visit(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (sourceFiles && ['__pycache__', '.pytest_cache', '.ruff_cache', '.mypy_cache', '.DS_Store'].includes(entry.name)) continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) return false;
      if (entry.isDirectory()) {
        if (!visit(absolute, relative)) return false;
      } else result[relative] = digest(fs.readFileSync(absolute));
    }
    return true;
  }
  return visit(directory, '') ? result : null;
}

function sameTree(actual, expected) {
  if (!actual || !expected) return false;
  const names = Object.keys(actual);
  return names.length === Object.keys(expected).length && names.every((name) => actual[name] === expected[name]);
}

// A legacy entry holds one value per released kit version that shipped it.
const variants = (value) => (Array.isArray(value) ? value : value === undefined ? [] : [value]);
const legacyFile = (relative, hash) => variants(legacy.files[relative]).includes(hash);
const legacyTree = (relative, tree) => variants(legacy.trees[relative]).some((expected) => sameTree(tree, expected));

function warn(relative) {
  console.error(`  Conflict preserved: ${relative}. Compare it with the kit source; merge manually before replacing it.`);
}

function backup(relative) {
  const source = destination(relative);
  const output = destination(`${backupRoot}/${relative}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.cpSync(source, output, { recursive: true, errorOnExist: true, force: false });
  console.log(`  Backup: ${backupRoot}/${relative}`);
}

function writeAtomic(relative, bytes, mode = 0o644) {
  const output = destination(relative);
  if (fs.existsSync(output) && fs.lstatSync(output).isFile() && fs.readFileSync(output).equals(Buffer.from(bytes))) return;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.agents-config-${process.pid}`;
  fs.writeFileSync(temporary, bytes, { mode, flag: 'wx' });
  fs.renameSync(temporary, output);
}

function syncFile(source, relative) {
  const output = destination(relative);
  const bytes = fs.readFileSync(source);
  const expected = digest(bytes);
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  if (stat && !stat.isFile()) { warn(relative); return; }
  const actual = stat ? digest(fs.readFileSync(output)) : null;
  if (actual === expected) { managed[relative] = expected; return; }
  if (stat && actual !== previous[relative] && !legacyFile(relative, actual)) { warn(relative); return; }
  if (stat) backup(relative);
  writeAtomic(relative, bytes, fs.statSync(source).mode & 0o777);
  managed[relative] = expected;
}

// Remove a file the kit no longer ships at this path. Only an unmodified kit copy
// is backed up and removed; a user-edited copy stays in place with a warning.
function retireFile(relative) {
  const output = destination(relative);
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  if (!stat) { delete previous[relative]; return; }
  const actual = stat.isFile() ? digest(fs.readFileSync(output)) : null;
  if (!actual || (actual !== previous[relative] && !legacyFile(relative, actual))) {
    console.error(`  Retired path kept: ${relative} was edited locally. The kit now ships it elsewhere; merge and remove it manually.`);
    return;
  }
  backup(relative);
  fs.rmSync(output);
  delete previous[relative];
  console.log(`  Retired: ${relative}`);
}

function syncTree(source, relative) {
  const output = destination(relative);
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  if (stat && !stat.isDirectory()) { warn(relative); return; }
  const hashes = treeHashes(source, true);
  if (!hashes) throw new Error(`Kit skill contains a symlink or special file: ${source}`);
  for (const name of Object.keys(hashes)) syncFile(path.join(source, name), `${relative}/${name}`);
}

function syncInstructions(sourceRelative, relative, customContent) {
  const output = destination(relative);
  const source = fs.readFileSync(path.join(repo, sourceRelative), 'utf8');
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  if (stat && !stat.isFile()) { warn(relative); return; }
  const existing = stat ? fs.readFileSync(output, 'utf8') : null;
  if (existing === source) { managed[relative] = digest(source); return; }
  if (existing === null || digest(existing) === previous[relative] || legacyFile(relative, digest(existing))) {
    if (existing !== null) backup(relative);
    writeAtomic(relative, source);
    managed[relative] = digest(source);
    return;
  }
  const starts = existing.split(START).length - 1;
  const ends = existing.split(END).length - 1;
  if (starts > 1 || ends > 1 || starts !== ends || (starts && existing.indexOf(START) > existing.indexOf(END))) {
    throw new Error(`Malformed managed instructions in ${output}. Keep exactly one ${START}/${END} pair or remove both.`);
  }
  const block = `${START}\n${customContent}\n${END}`;
  const updated = starts
    ? existing.slice(0, existing.indexOf(START)) + block + existing.slice(existing.indexOf(END) + END.length)
    : existing + (existing.endsWith('\n') ? '\n' : '\n\n') + block + '\n';
  if (updated === existing) return;
  backup(relative);
  writeAtomic(relative, updated);
}

function migrateSkill(harness, name, createLink) {
  const relative = `${harness}/skills/${name}`;
  const output = destination(relative, true);
  const stat = fs.lstatSync(output, { throwIfNoEntry: false });
  const link = `../../.agents/skills/${name}`;
  if (stat?.isSymbolicLink()) {
    if (fs.readlinkSync(output) !== link) warn(relative);
    return;
  }
  if (stat) {
    const actual = stat.isDirectory() ? treeHashes(output) : null;
    const canonical = treeHashes(destination(`.agents/skills/${name}`));
    if (!legacyTree(relative, actual) && !sameTree(actual, canonical)) { warn(relative); return; }
    backup(relative);
    fs.rmSync(output, { recursive: true });
  }
  if (!createLink) return;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.symlinkSync(link, output, 'dir');
}

try {
  // Check the common roots before any mutation to avoid writing through project
  // symlinks. No .codex configuration or hook directory is created here.
  for (const name of ['.agents', '.agents/skills', '.agents/rules', '.claude', '.claude/rules', 'AGENTS.md', 'MODELS.md', '.gitignore']) destination(name);
  if (claude) destination('.claude/skills');
  if (cursor) { destination('.cursor'); destination('.cursor/skills'); }
  const manifestPath = destination('.agents/install-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    previous = manifest.files || {};
    for (const [name, hash] of Object.entries(previous)) {
      destination(name, true);
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid installed-file hash: ${name}`);
    }
  }
  const common = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8').trimEnd();
  syncInstructions('AGENTS.md', 'AGENTS.md', 'Project-specific instructions outside this managed block take precedence over kit defaults.\n\n' + common);
  syncFile(path.join(repo, 'MODELS.md'), 'MODELS.md');
  // Core rules are read on demand through the AGENTS.md routing table. Claude Code
  // preloads every .claude/rules file without `paths`, so only path-scoped rules stay there.
  const coreRules = ['global-standards', 'dev-workflow', 'structured-response', 'gstack-workflow', 'git-conventions', 'external-content', 'model-efficiency'];
  const scopedRules = ['testing-standards'];
  const stackRules = ['react-standards', 'vue-standards', 'python-fastapi-standards', 'python-django-standards'];
  for (const name of coreRules) {
    syncFile(path.join(repo, '.agents', 'rules', `${name}.md`), `.agents/rules/${name}.md`);
    retireFile(`.claude/rules/${name}.md`);
  }
  for (const name of [...scopedRules, ...stackRules.filter((_, index) => stackFlags[index] === 'true')]) {
    syncFile(path.join(repo, '.claude', 'rules', `${name}.md`), `.claude/rules/${name}.md`);
  }
  const skillRoot = path.join(repo, '.agents', 'skills');
  const names = fs.readdirSync(skillRoot).filter((name) => fs.existsSync(path.join(skillRoot, name, 'SKILL.md'))).sort();
  for (const name of names) {
    syncTree(path.join(skillRoot, name), `.agents/skills/${name}`);
    if (!fs.lstatSync(destination(`.agents/skills/${name}`), { throwIfNoEntry: false })?.isDirectory()) continue;
    if (claude) migrateSkill('.claude', name, true);
    if (cursor) migrateSkill('.cursor', name, false);
  }
  if (claude) {
    syncInstructions('CLAUDE.md', 'CLAUDE.md', '@AGENTS.md');
  }
  if (cursor) {
    syncInstructions('.cursor/AGENTS.md', '.cursor/AGENTS.md', 'Apply the shared instructions in ../AGENTS.md.');
  }
  const version = fs.readFileSync(path.join(repo, '.claude', 'kit-version'), 'utf8').trim();
  const metaPath = destination('.agents/kit-meta.json');
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  writeAtomic('.agents/kit-meta.json', JSON.stringify({ ...meta, installedAt: meta.installedAt || new Date().toISOString(), kitVersion: version }, null, 2) + '\n');
  writeAtomic('.agents/install-manifest.json', JSON.stringify({ kitVersion: version, files: { ...previous, ...managed } }, null, 2) + '\n');
  const ignorePath = destination('.gitignore');
  let ignore = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  for (const entry of ['.agents/kit-meta.json', '.agents/install-manifest.json', '.agents/backups/']) {
    if (ignore.split(/\r?\n/).includes(entry)) continue;
    ignore += (ignore && !ignore.endsWith('\n') ? '\n' : '') + entry + '\n';
  }
  writeAtomic('.gitignore', ignore);
  console.log(`  Shared instructions and ${names.length} skills installed in .agents/ (v${version}).`);
} catch (error) {
  console.error(`Shared installation failed: ${error.message}`);
  process.exitCode = 1;
}
