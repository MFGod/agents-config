#!/usr/bin/env node
// PostToolUse: syntax-check after Edit/Write.
// .js/.mjs/.cjs → node --check | .json → JSON.parse | .sh/.bash → bash -n | else skip.

const { execFileSync } = require('child_process');
const fs = require('fs');

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch { process.exit(0); }

  if (!parsed || (parsed.tool_name !== 'Edit' && parsed.tool_name !== 'Write')) {
    process.exit(0);
  }

  const filePath = parsed.tool_input?.file_path;
  if (!filePath) { process.exit(0); }

  const ext = (filePath.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  let error = null;

  try {
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      execFileSync('node', ['--check', filePath], { encoding: 'utf8', stdio: 'pipe' });
    } else if (ext === 'json') {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else if (ext === 'sh' || ext === 'bash') {
      execFileSync('bash', ['-n', filePath], { encoding: 'utf8', stdio: 'pipe' });
    }
  } catch (err) {
    error = (err.stderr || err.message || String(err)).trim();
  }

  if (error) {
    process.stdout.write(`[post-edit-check] Syntax error in ${filePath}:\n${error}\nFix before proceeding.`);
  }

  process.exit(0);
});
