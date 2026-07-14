#!/usr/bin/env node
// Validates the skill tree against the invariants the kit relies on:
//   1. Every SKILL.md has `name:` equal to its directory, plus a `description:`.
//      A mismatched name silently fails to load in both Claude Code and Cursor.
//   2. Every vendored skill (.agents/skills/) has a skills-lock.json record, and
//      every lock record points at a skill that still exists — so a deleted skill
//      can't leave a dangling provenance entry, and a new one can't skip the lock.
//   3. Every locked skill's SKILL.md still hashes to its `computedHash`. Vendored
//      skills are third-party code that the agent executes with the user's rights;
//      without this check the lock records provenance but enforces nothing, and a
//      skill can be swapped after review (a rug pull) with CI staying green.
//   4. Every skill install.sh copies actually exists on disk.
//   5. .claude/skills symlinks resolve.
// Exits 1 on any violation.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const AGENTS_SKILLS = path.join(ROOT, '.agents', 'skills');
const CLAUDE_SKILLS = path.join(ROOT, '.claude', 'skills');
const CURSOR_SKILLS = path.join(ROOT, '.cursor', 'skills');
const LOCK = path.join(ROOT, 'skills-lock.json');
const INSTALL = path.join(ROOT, 'install.sh');

// Skills written by this kit and reviewed through its own PRs. Everything else is
// third-party and MUST be locked. Listing is deliberate: a new skill that is neither
// locked nor named here fails CI, so imported code cannot land unpinned by omission
// (which is exactly how ui-ux-pro-max shipped executable Python with no provenance).
// The caveman* / cavecrew family is NOT here — those are vendored from
// JuliusBrussee/caveman and carry a FROZEN SOURCE header, so they belong in the lock.
const KIT_AUTHORED = new Set([
  'debug', 'deploy', 'gstack', 'headroom', 'migrate', 'rtk', 'session-teacher',
]);

const errors = [];

function skillDirs(base) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'SKILL.md')));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Build artifacts, not source. They are regenerated on every run (py_compile rewrites
// .pyc), so pinning them would make the lock fail against itself.
const IGNORED_DIRS = new Set(['__pycache__', 'node_modules', '.pytest_cache']);
const IGNORED_FILES = /\.(pyc|pyo)$|^\.DS_Store$/;

// EVERY file in the skill except SKILL.md (which is `computedHash`). Not just scripts/:
// a skill's `references/*.md` are instructions the agent reads and obeys, so a tampered
// reference file is an injection with the same reach as a tampered script. impeccable
// ships 28 of them; pinning only executables would leave the whole instruction payload
// of a third-party skill unverified.
function skillFiles(skillDir) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name)) walk(path.join(dir, e.name));
      } else if (!IGNORED_FILES.test(e.name)) {
        const rel = path.relative(skillDir, path.join(dir, e.name));
        if (rel !== 'SKILL.md') out.push(rel);
      }
    }
  })(skillDir);
  return out.sort();
}

// --- 1. frontmatter: at line 1, name === dir, description present ---
function checkFrontmatter(base, label) {
  for (const dir of skillDirs(base)) {
    const file = path.join(base, dir, 'SKILL.md');
    const text = fs.readFileSync(file, 'utf8');

    // YAML frontmatter is only frontmatter when it opens the file. All seven caveman
    // skills carried a FROZEN SOURCE comment above it, so the loader never parsed the
    // block: their descriptions showed up in context as the literal string "<!--" and
    // `disable-model-invocation` was silently ignored. Nothing caught it for releases.
    if (!text.startsWith('---\n')) {
      errors.push(`${label}/${dir}: SKILL.md does not start with \`---\` — frontmatter must be the first line, or the loader ignores it entirely (name, description, disable-model-invocation all lost). Move any comment below the frontmatter block.`);
      continue;
    }

    const head = text.split(/^---$/m)[1] || '';
    const name = (head.match(/^name:\s*(\S+)/m) || [])[1];
    if (!name) errors.push(`${label}/${dir}: SKILL.md has no \`name:\``);
    else if (name !== dir) errors.push(`${label}/${dir}: name \`${name}\` != directory \`${dir}\` — skill won't load`);
    if (!/^description:/m.test(head)) errors.push(`${label}/${dir}: SKILL.md has no \`description:\``);
  }
}
checkFrontmatter(AGENTS_SKILLS, '.agents/skills');
checkFrontmatter(CLAUDE_SKILLS, '.claude/skills');
checkFrontmatter(CURSOR_SKILLS, '.cursor/skills');

// --- 1b. agents: same rule, same failure ---
// Agent definitions load the same way skills do. Three cavecrew agents carried the
// FROZEN SOURCE comment above their frontmatter and therefore never loaded at all —
// while dev-workflow.md and gstack-workflow.md instruct the model to spawn
// `cavecrew-reviewer`. Anyone without the caveman plugin was told to call an agent
// that did not exist. Same bug as the skills; it needed the same gate.
const AGENTS = path.join(ROOT, '.claude', 'agents');
if (fs.existsSync(AGENTS)) {
  for (const f of fs.readdirSync(AGENTS).filter(f => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(AGENTS, f), 'utf8');
    const expected = f.replace(/\.md$/, '');
    if (!text.startsWith('---\n')) {
      errors.push(`.claude/agents/${f}: does not start with \`---\` — the agent will not load. Move any comment below the frontmatter.`);
      continue;
    }
    const head = text.split(/^---$/m)[1] || '';
    const name = (head.match(/^name:\s*(\S+)/m) || [])[1];
    if (name !== expected) errors.push(`.claude/agents/${f}: name \`${name}\` != filename \`${expected}\``);
    if (!/^description:/m.test(head)) errors.push(`.claude/agents/${f}: no \`description:\``);
  }
}

// --- 2. lock covers vendored skills, both directions ---
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const locked = Object.keys(lock.skills || {});
const vendored = skillDirs(AGENTS_SKILLS);

for (const skill of vendored) {
  if (!locked.includes(skill)) errors.push(`skills-lock.json: no record for vendored skill \`${skill}\``);
}

// --- 3. locked skills still hash to their computedHash ---
// computedHash is the sha256 of the vendored SKILL.md *in this repo* (kit modifications
// included) — see `hashSemantics` in the lock. Mismatch means the file changed since it
// was last reviewed; that is either an unreviewed upstream bump or a tampered skill, and
// both must be looked at by a human rather than waved through.
for (const skill of locked) {
  const file = [
    path.join(AGENTS_SKILLS, skill, 'SKILL.md'),
    path.join(CLAUDE_SKILLS, skill, 'SKILL.md'),
  ].find(fs.existsSync);

  if (!file) {
    errors.push(`skills-lock.json: record \`${skill}\` points at a skill that no longer exists`);
    continue;
  }

  const expected = lock.skills[skill].computedHash;
  if (!expected) {
    errors.push(`skills-lock.json: record \`${skill}\` has no \`computedHash\``);
    continue;
  }

  const actual = sha256(file);
  if (actual !== expected) {
    errors.push(
      `${path.relative(ROOT, file)}: sha256 does not match skills-lock.json\n` +
      `      expected ${expected}\n` +
      `      actual   ${actual}\n` +
      `      If you changed this skill on purpose, review the diff, then set computedHash to the actual value.`
    );
  }

  checkSkillFiles(path.dirname(file), lock.skills[skill].fileHashes || {});

  // Some skills are vendored once per harness: `npx impeccable` emits a Cursor build
  // that differs from the Claude Code one (different paths, invocation, allowed-tools).
  // Both ship to users and both carry executable code, so both get pinned — verifying
  // only the Claude copy would leave 66 unpinned executables in every Cursor install.
  for (const [dir, v] of Object.entries(lock.skills[skill].variants || {})) {
    const vf = path.join(ROOT, dir, 'SKILL.md');
    if (!fs.existsSync(vf)) {
      errors.push(`skills-lock.json: variant \`${dir}\` of \`${skill}\` no longer exists`);
      continue;
    }
    const got = sha256(vf);
    if (got !== v.computedHash) {
      errors.push(
        `${dir}/SKILL.md: sha256 does not match skills-lock.json (variant of \`${skill}\`)\n` +
        `      expected ${v.computedHash}\n` +
        `      actual   ${got}`
      );
    }
    checkSkillFiles(path.join(ROOT, dir), v.fileHashes || {});
  }
}

// The rest of the skill: scripts AND references. A pinned SKILL.md with an unpinned
// payload is theatre — the description stays innocent while the code that runs, or the
// instructions the agent obeys, get swapped underneath it.
function checkSkillFiles(skillDir, pinned) {
  for (const [rel, want] of Object.entries(pinned)) {
    const sp = path.join(skillDir, rel);
    if (!fs.existsSync(sp)) {
      errors.push(`${path.relative(ROOT, sp)}: pinned in skills-lock.json but missing on disk`);
      continue;
    }
    const got = sha256(sp);
    if (got !== want) {
      errors.push(
        `${path.relative(ROOT, sp)}: sha256 does not match skills-lock.json\n` +
        `      expected ${want}\n` +
        `      actual   ${got}`
      );
    }
  }
  // An attacker does not have to edit a pinned file — adding a new one is enough.
  for (const rel of skillFiles(skillDir)) {
    if (!(rel in pinned)) {
      errors.push(`${path.relative(ROOT, path.join(skillDir, rel))}: skill file not pinned in skills-lock.json`);
    }
  }
}

// --- 3b. third-party skills must be locked (fail closed) ---
// CURSOR_SKILLS is scanned too: a skill dropped there ships to Cursor users just like
// one in .claude/skills, and leaving that tree unscanned is how the Cursor build of
// impeccable stayed unpinned while the Claude one was locked.
const lockedVariantDirs = new Set(
  Object.values(lock.skills).flatMap(r => Object.keys(r.variants || {}))
);
for (const skill of [...skillDirs(AGENTS_SKILLS), ...skillDirs(CLAUDE_SKILLS)]) {
  if (locked.includes(skill) || KIT_AUTHORED.has(skill)) continue;
  errors.push(
    `skills/${skill}: not in skills-lock.json and not listed as kit-authored.\n` +
    `      Third-party skills must be pinned. If this one is ours, add it to KIT_AUTHORED in this script.`
  );
}
// A Cursor copy is a distinct artifact with its own bytes, so a lock record for the same
// *name* proves nothing about it — it must be covered by an explicit `variants` entry.
for (const skill of skillDirs(CURSOR_SKILLS)) {
  const rel = path.relative(ROOT, path.join(CURSOR_SKILLS, skill));
  if (KIT_AUTHORED.has(skill) || lockedVariantDirs.has(rel)) continue;
  errors.push(
    `${rel}: ships to Cursor users but is not pinned.\n` +
    `      A lock record for the name \`${skill}\` does not cover this copy — its bytes differ.\n` +
    `      Add it under \`variants\` on the \`${skill}\` record in skills-lock.json.`
  );
}

// --- 4. install.sh copies only skills that exist ---
const install = fs.readFileSync(INSTALL, 'utf8');
for (const m of install.matchAll(/for skill in ([^;]+); do\s*\n\s*copy_dir "\$SCRIPT_DIR\/(\.[\w/.]+)\/\$skill"/g)) {
  const [, list, base] = m;
  for (const skill of list.replace(/\\\s*\n\s*/g, ' ').trim().split(/\s+/)) {
    if (!fs.existsSync(path.join(ROOT, base, skill, 'SKILL.md'))) {
      errors.push(`install.sh: copies \`${base}/${skill}\` — no SKILL.md there`);
    }
  }
}

// --- 5. symlinks in .claude/skills resolve ---
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
console.log(`skills: ${vendored.length} vendored + ${skillDirs(CLAUDE_SKILLS).length} in .claude — frontmatter, lock (${locked.length} sha256 verified), install.sh and symlinks all valid`);
