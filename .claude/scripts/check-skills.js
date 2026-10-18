#!/usr/bin/env node
// Kit invariants: one canonical skill tree, explicitly pinned harness variants,
// relative same-name adapters, and matching Codex invocation policy.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = fs.realpathSync(path.join(__dirname, '..', '..'));
const CANONICAL = '.agents/skills';
const HARNESSES = ['.claude/skills', '.cursor/skills'];
const ARCHIVES = ['.agents/variants/claude', '.agents/variants/cursor'];
const KIT_AUTHORED = new Set([
  'debug', 'deploy', 'gstack', 'headroom', 'migrate', 'rtk', 'session-teacher',
]);
const IGNORED_DIRS = new Set(['__pycache__', 'node_modules', '.pytest_cache']);
const IGNORED_FILES = /\.(pyc|pyo)$|^\.DS_Store$/;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const errors = [];

function inside(base, file) {
  const rel = path.relative(base, file);
  return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`));
}

function relativePath(rel, label) {
  if (typeof rel !== 'string' || !rel || rel.includes('\\') || path.win32.isAbsolute(rel) ||
      rel.split('/').some(part => !part || part === '.' || part === '..')) {
    errors.push(`${label}: unsafe relative path \`${rel}\``);
    return false;
  }
  return true;
}

// Resolve each component without following symlinks. Canonical bodies and pinned
// variants contain regular files; only harness adapters may be directory links.
function regularPath(rel, kind, optional = false) {
  if (!relativePath(rel, rel)) return null;
  let file = ROOT;
  const parts = rel.split('/');
  for (const [index, part] of parts.entries()) {
    file = path.join(file, part);
    let stat;
    try { stat = fs.lstatSync(file); }
    catch (error) {
      if (optional && error.code === 'ENOENT') return null;
      errors.push(`${rel}: ${error.code === 'ENOENT' ? 'missing on disk' : error.message}`);
      return null;
    }
    if (stat.isSymbolicLink()) {
      errors.push(`${rel}: symlink in canonical or pinned payload at ${path.relative(ROOT, file)} — use a regular file/directory`);
      return null;
    }
    const expectedDirectory = index < parts.length - 1 || kind === 'directory';
    if (expectedDirectory ? !stat.isDirectory() : !stat.isFile()) {
      errors.push(`${rel}: expected a regular ${expectedDirectory ? 'directory' : 'file'}`);
      return null;
    }
  }
  return file;
}

function skillEntries(base) {
  const dir = regularPath(base, 'directory', true);
  if (!dir) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => !IGNORED_DIRS.has(entry.name) && (entry.isDirectory() || entry.isSymbolicLink()))
    .map(entry => entry.name);
}

function frontmatter(file, expectedName) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${rel}: valid frontmatter must start on the first line — move any comment below the block`);
    return null;
  }
  const head = match[1].replace(/\r\n/g, '\n');
  const name = (head.match(/^name:[ \t]*([^\r\n#]+)/m) || [])[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (name !== expectedName) errors.push(`${rel}: name \`${name}\` != directory/filename \`${expectedName}\` (kit invariant)`);
  if (!/^description:/m.test(head)) errors.push(`${rel}: no \`description:\``);
  return head;
}

function checkCodexPolicy(dir, head) {
  // user-invocable controls the slash menu in Claude Code; it does not disable
  // model invocation. Only disable-model-invocation maps to Codex's policy.
  if (!head || !/^disable-model-invocation:[ \t]*true[ \t]*(?:#.*)?$/m.test(head)) return;
  const rel = `${dir}/agents/openai.yaml`;
  const file = regularPath(rel, 'file');
  if (!file) return;
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const policy = text.match(/^policy:[ \t]*(?:#.*)?\r?\n((?:[ \t]+[^\r\n]*\r?\n?)+)/m)?.[1] || '';
  const fields = policy.match(/^  allow_implicit_invocation:.*$/gm) || [];
  if ((text.match(/^policy:/gm) || []).length !== 1 || fields.length !== 1 ||
      !/^  allow_implicit_invocation:[ \t]*false[ \t]*(?:#.*)?$/.test(fields[0])) {
    errors.push(`${rel}: disable-model-invocation: true requires policy.allow_implicit_invocation: false`);
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function checkHash(file, expected) {
  const rel = path.relative(ROOT, file);
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
    errors.push(`${rel}: missing or invalid sha256 in skills-lock.json`);
    return;
  }
  const actual = sha256(file);
  if (actual !== expected) {
    errors.push(`${rel}: sha256 does not match skills-lock.json\n` +
      `      expected ${expected}\n      actual   ${actual}\n` +
      '      Review the intended diff before updating the lock.');
  }
}

// Instructions, references, metadata and scripts are all part of the pinned payload.
function skillFiles(dir) {
  const files = [];
  function walk(rel) {
    const current = regularPath(rel, 'directory');
    if (!current) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if ((entry.isDirectory() && IGNORED_DIRS.has(entry.name)) || IGNORED_FILES.test(entry.name)) continue;
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (regularPath(child, 'file')) {
        const payload = path.posix.relative(dir, child);
        if (payload !== 'SKILL.md') files.push(payload);
      }
    }
  }
  walk(dir);
  return files.sort();
}

function checkArtifact(dir, record) {
  if (!regularPath(dir, 'directory')) return;
  const file = regularPath(`${dir}/SKILL.md`, 'file');
  if (!file) return;
  checkHash(file, record.computedHash);
  const pinned = record.fileHashes || {};
  if (typeof pinned !== 'object' || Array.isArray(pinned)) {
    errors.push(`${dir}: fileHashes must be an object`);
    return;
  }
  for (const [rel, expected] of Object.entries(pinned)) {
    if (!relativePath(rel, `${dir} fileHashes`) || rel === 'SKILL.md') {
      if (rel === 'SKILL.md') errors.push(`${dir}: pin SKILL.md with computedHash, not fileHashes`);
      continue;
    }
    const payload = regularPath(`${dir}/${rel}`, 'file');
    if (payload) checkHash(payload, expected);
  }
  for (const rel of skillFiles(dir)) {
    if (!Object.hasOwn(pinned, rel)) errors.push(`${dir}/${rel}: skill file not pinned in skills-lock.json`);
  }
}

let records = {};
const lockFile = regularPath('skills-lock.json', 'file');
if (lockFile) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    if (!lock.skills || typeof lock.skills !== 'object' || Array.isArray(lock.skills)) {
      errors.push('skills-lock.json: skills must be an object');
    } else records = lock.skills;
  } catch (error) { errors.push(`skills-lock.json: invalid JSON — ${error.message}`); }
}

const canonicalNames = skillEntries(CANONICAL);
const canonicalDirs = new Map();
for (const skill of canonicalNames) {
  const dir = `${CANONICAL}/${skill}`;
  if (!SKILL_NAME.test(skill)) {
    errors.push(`${dir}: invalid skill directory name`);
    continue;
  }
  const source = regularPath(dir, 'directory');
  if (!source) continue;
  canonicalDirs.set(skill, source);
  const file = regularPath(`${dir}/SKILL.md`, 'file');
  if (file) checkCodexPolicy(dir, frontmatter(file, skill));
  if (KIT_AUTHORED.has(skill)) skillFiles(dir); // Check payload paths; kit code is reviewed in its own PRs.
  if (!KIT_AUTHORED.has(skill) && !Object.hasOwn(records, skill)) {
    errors.push(`skills-lock.json: no record for vendored skill \`${skill}\``);
  }
}

const lockedVariants = new Set();
for (const [skill, record] of Object.entries(records)) {
  if (!SKILL_NAME.test(skill) || !record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push(`skills-lock.json: invalid record \`${skill}\``);
    continue;
  }
  const expectedPath = `${CANONICAL}/${skill}/SKILL.md`;
  if (record.localPath !== expectedPath) {
    errors.push(`skills-lock.json: record \`${skill}\` localPath must be exactly \`${expectedPath}\`, got \`${record.localPath}\``);
  } else checkArtifact(`${CANONICAL}/${skill}`, record);

  const variants = record.variants || {};
  if (typeof variants !== 'object' || Array.isArray(variants)) {
    errors.push(`skills-lock.json: record \`${skill}\` variants must be an object`);
    continue;
  }
  for (const [dir, variant] of Object.entries(variants)) {
    if (![...HARNESSES, ...ARCHIVES].some(base => dir === `${base}/${skill}`)) {
      errors.push(`skills-lock.json: unsafe or unexpected variant path \`${dir}\` for \`${skill}\``);
      continue;
    }
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
      errors.push(`skills-lock.json: invalid variant record \`${dir}\``);
      continue;
    }
    lockedVariants.add(dir);
    const file = regularPath(`${dir}/SKILL.md`, 'file');
    if (file) frontmatter(file, skill);
    checkArtifact(dir, variant);
  }
}

const archivesDir = regularPath('.agents/variants', 'directory', true);
if (archivesDir) {
  for (const entry of fs.readdirSync(archivesDir, { withFileTypes: true })) {
    if ((entry.isDirectory() || entry.isSymbolicLink()) && !ARCHIVES.includes(`.agents/variants/${entry.name}`)) {
      errors.push(`.agents/variants/${entry.name}: unexpected harness archive directory`);
    }
  }
}
for (const base of ARCHIVES) {
  for (const skill of skillEntries(base)) {
    const rel = `${base}/${skill}`;
    if (!lockedVariants.has(rel)) errors.push(`${rel}: archived harness variant is not pinned in skills-lock.json`);
  }
}

for (const base of HARNESSES) {
  for (const skill of skillEntries(base)) {
    const rel = `${base}/${skill}`;
    const adapter = path.join(ROOT, rel);
    if (!fs.lstatSync(adapter).isSymbolicLink()) {
      if (!lockedVariants.has(rel)) errors.push(`${rel}: separate harness copy is not pinned under variants in skills-lock.json — use a canonical adapter or pin this artifact`);
      continue;
    }
    const target = fs.readlinkSync(adapter);
    if (path.isAbsolute(target) || path.win32.isAbsolute(target)) {
      errors.push(`${rel}: adapter must use a relative symlink`);
      continue;
    }
    let resolved;
    try { resolved = fs.realpathSync(adapter); }
    catch (error) {
      errors.push(`${rel}: broken symlink → ${target} (${error.code})`);
      continue;
    }
    if (!inside(ROOT, resolved) || resolved !== canonicalDirs.get(skill)) {
      errors.push(`${rel}: unsafe adapter → ${target}; it must resolve to ${CANONICAL}/${skill} inside this repository`);
    }
  }
}

// Agent definitions retain their own Claude Code frontmatter contract.
const agentsDir = regularPath('.claude/agents', 'directory', true);
if (agentsDir) {
  for (const name of fs.readdirSync(agentsDir).filter(name => name.endsWith('.md'))) {
    const file = regularPath(`.claude/agents/${name}`, 'file');
    if (file) frontmatter(file, name.replace(/\.md$/, ''));
  }
}

// Preserve validation of any explicit skill-copy lists in the installer. Dynamic
// canonical discovery and target adapter layout are verified by install tests/CI.
const installFile = regularPath('install.sh', 'file');
if (installFile) {
  const install = fs.readFileSync(installFile, 'utf8');
  for (const match of install.matchAll(/for skill in ([^;]+); do\s*\n\s*copy_dir "\$SCRIPT_DIR\/(\.[\w/.]+)\/\$skill"/g)) {
    const [, list, base] = match;
    for (const skill of list.replace(/\\\s*\n\s*/g, ' ').trim().split(/\s+/)) {
      if (!fs.existsSync(path.join(ROOT, base, skill, 'SKILL.md'))) errors.push(`install.sh: copies \`${base}/${skill}\` — no SKILL.md there`);
    }
  }
}

if (errors.length) {
  console.error('skills: validation failed\n');
  for (const error of errors) console.error(`  ${error}`);
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
const authored = canonicalNames.filter(skill => KIT_AUTHORED.has(skill)).length;
console.log(`skills: ${canonicalNames.length - authored} vendored + ${authored} kit-authored canonical skills; ${lockedVariants.size} pinned variants — frontmatter, Codex policy, payload hashes and adapters valid`);
