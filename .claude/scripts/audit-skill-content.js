#!/usr/bin/env node
// Static prompt-injection audit of everything the agent reads as instructions:
// vendored skills (SKILL.md + references/ + scripts/), rules, and agent definitions.
//
// Why this and not garak: NVIDIA garak probes a LIVE model endpoint (it sends attack
// prompts and grades the replies). Our attack surface is different — third-party skill
// files that get injected into the agent's context with the user's rights. Audits find
// prompt injection in roughly a third of public skills, so the file is the thing to scan.
// The signature classes below are garak's attack taxonomy (latentinjection, xss/
// exfiltration, promptinject, encoding) applied statically to that content.
//
// Exits 1 on any HIGH finding. MEDIUM/LOW are reported for a human to judge.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const TARGETS = [
  '.agents/skills', '.claude/skills', '.cursor/skills',
  '.claude/rules', '.cursor/rules', '.claude/agents',
];
const SKIP_DIRS = new Set(['__pycache__', 'node_modules', '.pytest_cache']);
const SCAN_EXT = /\.(md|mdc|js|mjs|py|sh|json|txt)$/;

// garak taxonomy → static signatures.
const SIGNATURES = [
  // latentinjection: instructions hidden in content the agent reads and obeys.
  { id: 'instruction-override', sev: 'HIGH',
    re: /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier|preceding|system)\s+(instruction|prompt|rule|direction|message|context)/i,
    why: 'Overrides the operator prompt — the defining move of a prompt injection.' },

  { id: 'concealment', sev: 'HIGH',
    re: /\b(do not|don't|never)\s+(tell|inform|mention|reveal|disclose|show)\s+(the\s+)?(user|human|operator)\b/i,
    why: 'Instructs the agent to hide its actions from the user.' },

  // xss / exfiltration: garak's model is "render this URI carrying encoded data".
  { id: 'exfiltration-uri', sev: 'HIGH',
    re: /!\[[^\]]*\]\(\s*https?:\/\/[^)]*(\{|\$\{|%s|\+\s*(data|content|secret|token|env))/i,
    why: 'Markdown image whose URL interpolates data — renders as a silent GET carrying it out.' },

  { id: 'credential-access', sev: 'HIGH',
    re: /\b(cat|read|print|echo|exfiltrate|send|post|upload)\b[^\n]{0,40}\b(\.env\b|id_rsa|AWS_SECRET|ANTHROPIC_API_KEY|OPENAI_API_KEY|private[_\s-]?key|credentials)\b/i,
    why: 'Reaches for secrets by name.' },

  { id: 'remote-code-exec', sev: 'HIGH',
    re: /\b(curl|wget)\b[^\n|]*\|\s*(ba)?sh\b/i,
    why: 'Pipes a remote payload straight into a shell.' },

  // encoding: garak probes base64/rot13/etc smuggling. A long opaque blob in an
  // instruction file has no legitimate reason to be there.
  { id: 'encoded-blob', sev: 'MEDIUM',
    re: /\b[A-Za-z0-9+/]{220,}={0,2}\b/,
    why: 'Long base64-ish blob inside an instruction file — could smuggle a payload past review.' },

  { id: 'hidden-unicode', sev: 'HIGH',
    re: /[​-‏‪-‮⁠-⁤﻿]/,
    why: 'Zero-width / bidi control characters — text invisible to a human reviewer but read by the model.' },

  // promptinject: role confusion via fake turn boundaries.
  { id: 'role-injection', sev: 'MEDIUM',
    re: /^\s*(<\|(im_start|im_end|system|endoftext)\|>|\[\/?INST\]|###\s*(System|Human|Assistant)\s*:)/im,
    why: 'Fake chat-turn or role markers — can make injected text read as a system turn.' },

  // Narrowed to actual approval-bypass. "Do not ask about colors" is design guidance,
  // not an attack; matching it produced 21 hits of pure noise, and a scanner that cries
  // wolf gets muted — after which it protects nothing.
  //
  // `unless` is load-bearing here: the naive pattern matched our own NEVER-list
  // ("NEVER delete a branch without explicit confirmation") — the exact opposite of an
  // escalation. A prohibition and a demand share the same keywords; only the negation
  // tells them apart.
  { id: 'autonomy-escalation', sev: 'MEDIUM',
    re: /\b(without (the user's |explicit )?(confirmation|permission|approval|consent)|skip (the )?(confirmation|approval|permission)|auto-?approve|bypass (the )?(check|guard|confirmation))\b/i,
    unless: /\b(never|not|n't|must|require[sd]?|warn|block(s|ed)?|refuse[sd]?|prohibit|forbid|only after|ask)\b[^\n]{0,70}\b(without|skip|auto-?approve|bypass)\b/i,
    why: 'Tries to remove the human from the loop on an action that requires them.' },
];

// Lines that legitimately talk ABOUT these attacks — our own security rules, the
// vendoring checklist, defensive code comments. Without this, the audit flags itself.
const DOC_CONTEXT = /(prompt.?injection|injection|attack|malicious|exfiltrat\w*|adversar\w*|threat|vulnerab\w*|audit\w*|forbidden|red.?flag|signature|garak|is a finding|report it|do not follow|refuse\w*|reject\w*)/i;

// Reviewed by a human and judged benign. Anchored to the sha256 of the matched line, so
// the entry survives the line moving but dies the moment the line's content changes —
// a silent edit under an approved exception is exactly what this must not allow.
// Same fail-closed discipline as skills-lock: known-and-reviewed passes, new stops CI.
const ALLOWLIST = require(path.join(ROOT, '.claude', 'audit-allowlist.json'));
const allowed = new Map(ALLOWLIST.reviewed.map(e => [`${e.id}:${e.lineSha256}`, e]));

const findings = [];
const reviewed = [];
let scanned = 0;

function scan(file) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  scanned++;

  for (const sig of SIGNATURES) {
    lines.forEach((line, i) => {
      if (!sig.re.test(line)) return;
      if (sig.unless && sig.unless.test(line)) return;
      // hidden-unicode is never "documentation" — the point is that you cannot see it.
      if (sig.id !== 'hidden-unicode' && DOC_CONTEXT.test(line)) return;

      const lineSha = crypto.createHash('sha256').update(line.trim()).digest('hex');
      const ok = allowed.get(`${sig.id}:${lineSha}`);
      const hit = {
        sev: sig.sev, id: sig.id, file: rel, line: i + 1,
        why: sig.why, text: line.trim().slice(0, 110), lineSha256: lineSha,
      };
      if (ok) reviewed.push({ ...hit, reason: ok.reason });
      else findings.push(hit);
    });
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); }
    else if (SCAN_EXT.test(e.name)) scan(p);
  }
}

for (const t of TARGETS) walk(path.join(ROOT, t));

const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file));

const high = findings.filter(f => f.sev === 'HIGH');

console.log(`skill-content audit: ${scanned} file(s) scanned across ${TARGETS.length} trees`);
console.log(`  signatures: garak taxonomy (latentinjection, xss/exfiltration, promptinject, encoding)`);
console.log(`  ${reviewed.length} match(es) previously reviewed and allowlisted\n`);

if (!findings.length) {
  console.log('  no unreviewed prompt-injection signatures found');
  process.exit(0);
}

for (const f of findings) {
  console.log(`  [${f.sev}] ${f.id} — ${f.file}:${f.line}`);
  console.log(`         ${f.why}`);
  console.log(`         > ${f.text}`);
  console.log(`         lineSha256: ${f.lineSha256}`);
  console.log(`         If benign, add it to .claude/audit-allowlist.json with a reason.\n`);
}

console.log(`  ${high.length} HIGH, ${findings.length - high.length} MEDIUM/LOW`);
if (high.length) {
  console.error('\nHIGH findings must be reviewed by a human before this content ships.');
  process.exit(1);
}
