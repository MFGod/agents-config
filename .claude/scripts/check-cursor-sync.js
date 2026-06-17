#!/usr/bin/env node
// Checks that PAIRED .claude/rules/*.md files are reflected in .cursor/rules/*.mdc.
// For each paired file: strips frontmatter/.mdc from .mdc, normalizes .md↔.mdc
// references, then verifies every non-empty line of .md exists in .mdc.
// Exits 1 if drift detected, 0 if clean.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CLAUDE_RULES = path.join(ROOT, '.claude', 'rules');
const CURSOR_RULES = path.join(ROOT, '.cursor', 'rules');

// Lines to ignore during comparison (SYNC markers, blank lines).
const SYNC_RE = /^<!--\s*SYNC:/;

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  return end === -1 ? text : text.slice(end + 4);
}

function normalizeLines(text, ext) {
  const stripped = stripFrontmatter(text);
  return stripped
    .split('\n')
    .map(l => {
      // normalize cross-references: .mdc→.md so both sides compare equal
      if (ext === 'mdc') return l.replace(/\.mdc\b/g, '.md');
      return l;
    })
    .filter(l => l.trim() !== '' && !SYNC_RE.test(l.trim()));
}

const mdFiles = fs.readdirSync(CLAUDE_RULES).filter(f => f.endsWith('.md'));

let failed = 0;

for (const mdFile of mdFiles) {
  const mdcFile = mdFile.replace(/\.md$/, '.mdc');
  const mdPath = path.join(CLAUDE_RULES, mdFile);
  const mdcPath = path.join(CURSOR_RULES, mdcFile);

  if (!fs.existsSync(mdcPath)) continue; // CURSOR-ONLY or not ported yet — skip

  const mdLines = new Set(normalizeLines(fs.readFileSync(mdPath, 'utf8'), 'md'));
  const mdcText = stripFrontmatter(fs.readFileSync(mdcPath, 'utf8'));
  const mdcLines = new Set(normalizeLines(mdcText, 'mdc'));

  const missing = [...mdLines].filter(l => !mdcLines.has(l));

  if (missing.length > 0) {
    console.error(`\nDRIFT: .claude/rules/${mdFile} → .cursor/rules/${mdcFile}`);
    console.error(`  ${missing.length} line(s) in .md missing from .mdc:`);
    missing.slice(0, 5).forEach(l => console.error(`    - ${l.slice(0, 100)}`));
    if (missing.length > 5) console.error(`    ... and ${missing.length - 5} more`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) out of sync. Update .cursor/rules/*.mdc to match .claude/rules/*.md`);
  process.exit(1);
}

console.log(`cursor-sync: all paired rules in sync`);
