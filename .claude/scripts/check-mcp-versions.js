#!/usr/bin/env node
// Checks that MCP server package versions in .mcp.json and .cursor/mcp.json
// exist in their respective registries (npm for npx, PyPI for uvx).
// Exits 1 if any package is unreachable (yanked or typo).

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MCP_FILES = ['.mcp.json', '.cursor/mcp.json'];

// Extract { name, version, tool } entries from a parsed mcpServers object.
function extractPackages(servers) {
  const entries = [];
  for (const [, cfg] of Object.entries(servers)) {
    const cmd = cfg.command;
    const args = cfg.args || [];
    if (cmd === 'npx') {
      // npx [-y] [@scope/name@version] → first arg that contains @<ver> or is not a flag
      const pkg = args.find(a => !a.startsWith('-'));
      if (pkg) entries.push({ raw: pkg, tool: 'npm' });
    } else if (cmd === 'uvx') {
      // uvx [--from pkg==ver] name | uvx pkg==ver
      const fromIdx = args.indexOf('--from');
      const raw = fromIdx !== -1 ? args[fromIdx + 1] : args[0];
      if (raw) entries.push({ raw, tool: 'pypi' });
    }
  }
  return entries;
}

// npm view <pkg>@<ver> version — exits 0 if exists.
function checkNpm(raw) {
  // raw may be "@scope/name@ver" or "name@ver"
  const res = spawnSync('npm', ['view', raw, 'version'], { encoding: 'utf8' });
  return res.status === 0 && (res.stdout || '').trim() !== '';
}

// PyPI JSON API: https://pypi.org/pypi/<pkg>/<ver>/json → 200 if exists.
// Extras (PEP 508: `headroom-ai[mcp]==0.26.0`) are part of the requirement, not of
// the distribution name — PyPI 404s on them. Strip before querying.
function checkPypi(raw) {
  const match = raw.match(/^([A-Za-z0-9_.-]+)(?:\[[A-Za-z0-9_,.-]+\])?==(.+)$/);
  if (!match) return true; // no version pinned, skip
  const [, pkg, ver] = match;
  const url = `https://pypi.org/pypi/${encodeURIComponent(pkg)}/${encodeURIComponent(ver)}/json`;
  const res = spawnSync('curl', ['-sf', '--max-time', '10', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8' });
  return res.status === 0 && (res.stdout || '').trim() === '200';
}

let failed = 0;
const seen = new Set();

for (const mcpFile of MCP_FILES) {
  const fullPath = path.join(ROOT, mcpFile);
  if (!fs.existsSync(fullPath)) continue;
  const cfg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const servers = cfg.mcpServers || {};
  for (const entry of extractPackages(servers)) {
    if (seen.has(entry.raw)) continue;
    seen.add(entry.raw);
    process.stdout.write(`  checking ${entry.tool}: ${entry.raw} ... `);
    let ok = false;
    try {
      ok = entry.tool === 'npm' ? checkNpm(entry.raw) : checkPypi(entry.raw);
    } catch { ok = false; }
    if (ok) {
      process.stdout.write('OK\n');
    } else {
      process.stdout.write('NOT FOUND\n');
      console.error(`  ERROR: ${entry.raw} not found in registry`);
      failed++;
    }
  }
}

// install.sh prints the MCP servers it just wired up. That list is hand-maintained, so it
// drifts: it advertised `chrome-devtools`, which no mcp.json has ever configured, and it
// omitted `playwright` from the Cursor list, which .cursor/mcp.json does configure. A user
// reading either statement is misled about what they actually got.
const install = fs.readFileSync(path.join(ROOT, 'install.sh'), 'utf8');
for (const file of MCP_FILES) {
  const servers = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')).mcpServers);
  const block = install.match(new RegExp(`${file.replace(/[./]/g, '\\$&')}\\):\\\\n"([\\s\\S]*?)\\n  fi`));
  // Fail closed. If this check cannot find the block it is meant to police, it must say
  // so — silently skipping would let the very drift it exists to catch back in unseen.
  if (!block) {
    console.error(`  ERROR: could not locate the ${file} server list in install.sh — this check can no longer verify it. Fix the pattern or the install.sh block.`);
    failed++;
    continue;
  }
  const advertised = [...block[1].matchAll(/printf "\s+([\w-]+)\s+—/g)].map(m => m[1]);
  if (advertised.length === 0) {
    console.error(`  ERROR: found the ${file} block in install.sh but parsed zero server names from it — the pattern has rotted.`);
    failed++;
  }
  for (const name of advertised) {
    if (!servers.includes(name)) {
      console.error(`  ERROR: install.sh advertises MCP server \`${name}\` for ${file}, but it is not configured there`);
      failed++;
    }
  }
  for (const name of servers) {
    if (!advertised.includes(name)) {
      console.error(`  ERROR: ${file} configures \`${name}\`, but install.sh never tells the user about it`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} MCP problem(s). Fix versions in .mcp.json / .cursor/mcp.json, or the server list printed by install.sh`);
  process.exit(1);
}
console.log('mcp-versions: all packages verified; install.sh server list matches both mcp.json files');
