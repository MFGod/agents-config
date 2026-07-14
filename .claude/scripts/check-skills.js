#!/usr/bin/env node
// Validates the skill tree against the invariants the kit relies on:
//   1. Every SKILL.md has `name:` equal to its directory, plus a `description:`.
//      A mismatched name silently fails to load in both Claude Code and Cursor.
//   2. Every vendored skill (.agents/skills/) has a skills-lock.json record, and
//      every lock record points at a skill that still exists — so a deleted skill
//      can't leave a dangling provenance entry, and a new one can't skip the lock.
//   3. Every skill install.sh copies actually exists on disk.
//   4. .claude/skills symlinks resolve.
// Exits 1 on any violation.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const AGENTS_SKILLS = path.join(ROOT, '.agents', 'skills');
const CLAUDE_SKILLS = path.join(ROOT, '.claude', 'skills');
const CURSOR_SKILLS = path.join(ROOT, '.cursor', 'skills');
const LOCK = path.join(ROOT, 'skills-lock.json');
const INSTALL = path.join(ROOT, 'install.sh');

const errors = [];

function skillDirs(base) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'SKILL.md')));
}

// --- 1. frontmatter: name === dir, description present ---
function checkFrontmatter(base, label) {
  for (const dir of skillDirs(base)) {
    const file = path.join(base, dir, 'SKILL.md');
    const head = fs.readFileSync(file, 'utf8').split(/^---$/m)[1] || '';
    const name = (head.match(/^name:\s*(\S+)/m) || [])[1];
    if (!name) errors.push(`${label}/${dir}: SKILL.md has no \`name:\``);
    else if (name !== dir) errors.push(`${label}/${dir}: name \`${name}\` != directory \`${dir}\` — skill won't load`);
    if (!/^description:/m.test(head)) errors.push(`${label}/${dir}: SKILL.md has no \`description:\``);
  }
}
checkFrontmatter(AGENTS_SKILLS, '.agents/skills');
checkFrontmatter(CLAUDE_SKILLS, '.claude/skills');
checkFrontmatter(CURSOR_SKILLS, '.cursor/skills');

// --- 2. lock covers vendored skills, both directions ---
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const locked = Object.keys(lock.skills || {});
const vendored = skillDirs(AGENTS_SKILLS);

for (const skill of vendored) {
  if (!locked.includes(skill)) errors.push(`skills-lock.json: no record for vendored skill \`${skill}\``);
}
for (const skill of locked) {
  const inAgents = vendored.includes(skill);
  const inClaude = fs.existsSync(path.join(CLAUDE_SKILLS, skill, 'SKILL.md'));
  if (!inAgents && !inClaude) errors.push(`skills-lock.json: record \`${skill}\` points at a skill that no longer exists`);
}

// --- 3. install.sh copies only skills that exist ---
const install = fs.readFileSync(INSTALL, 'utf8');
for (const m of install.matchAll(/for skill in ([^;]+); do\s*\n\s*copy_dir "\$SCRIPT_DIR\/(\.[\w/.]+)\/\$skill"/g)) {
  const [, list, base] = m;
  for (const skill of list.replace(/\\\s*\n\s*/g, ' ').trim().split(/\s+/)) {
    if (!fs.existsSync(path.join(ROOT, base, skill, 'SKILL.md'))) {
      errors.push(`install.sh: copies \`${base}/${skill}\` — no SKILL.md there`);
    }
  }
}

// --- 4. symlinks in .claude/skills resolve ---
if (fs.existsSync(CLAUDE_SKILLS)) {
  for (const entry of fs.readdirSync(CLAUDE_SKILLS)) {
    const p = path.join(CLAUDE_SKILLS, entry);
    if (fs.lstatSync(p).isSymbolicLink() && !fs.existsSync(p)) {
      errors.push(`.claude/skills/${entry}: broken symlink → ${fs.readlinkSync(p)}`);
    }
  }
}

if (errors.length) {
  console.error('skills: validation failed\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`skills: ${vendored.length} vendored + ${skillDirs(CLAUDE_SKILLS).length} in .claude — frontmatter, lock, install.sh and symlinks all valid`);
