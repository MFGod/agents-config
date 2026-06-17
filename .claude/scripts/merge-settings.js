#!/usr/bin/env node
// Merges missing hooks from a template into an existing settings.json.
// Idempotent: hooks already present (matched by command string) are not duplicated.
// Only touches hooks.* arrays; all other fields in target are preserved.
//
// Usage: node merge-settings.js <target-settings.json> <template-settings.json>
// Exit 0 on success, 1 on error.

const fs = require('fs');

const [, , targetPath, templatePath] = process.argv;
if (!targetPath || !templatePath) {
  process.stderr.write('Usage: merge-settings.js <target> <template>\n');
  process.exit(1);
}

let target, template;
try { target = JSON.parse(fs.readFileSync(targetPath, 'utf8')); }
catch (e) { process.stderr.write(`Cannot read ${targetPath}: ${e.message}\n`); process.exit(1); }
try { template = JSON.parse(fs.readFileSync(templatePath, 'utf8')); }
catch (e) { process.stderr.write(`Cannot read ${templatePath}: ${e.message}\n`); process.exit(1); }

const templateHooks = template.hooks || {};
if (!target.hooks) target.hooks = {};

let added = 0;
const normalizeCmd = s => (s || '').trim().replace(/\s+/g, ' ');

for (const [event, templateEntries] of Object.entries(templateHooks)) {
  if (!Array.isArray(templateEntries)) continue;

  for (const templateEntry of templateEntries) {
    const matcher = templateEntry.matcher;
    const templateHookList = Array.isArray(templateEntry.hooks)
      ? templateEntry.hooks.filter(h => h.command)
      : [];

    // Skip placeholder entries with no actual hooks (e.g. PostToolUse in template)
    if (templateHookList.length === 0) continue;

    // Only initialize target event array when there are hooks to merge.
    // If the user hand-edited the value to a non-array, warn and skip rather than clobber.
    if (!Array.isArray(target.hooks[event])) {
      if (target.hooks[event] !== undefined) {
        process.stderr.write(`Warning: hooks.${event} is not an array in ${targetPath} — skipping merge for this event\n`);
        continue;
      }
      target.hooks[event] = [];
    }

    // Find matching entry in target by matcher value (normalize null/undefined → same key)
    let targetEntry = target.hooks[event].find(e => (e.matcher ?? null) === (matcher ?? null));
    if (!targetEntry) {
      targetEntry = matcher ? { matcher, hooks: [] } : { hooks: [] };
      target.hooks[event].push(targetEntry);
    }
    if (!Array.isArray(targetEntry.hooks)) targetEntry.hooks = [];

    for (const hook of templateHookList) {
      const exists = targetEntry.hooks.some(h => normalizeCmd(h.command) === normalizeCmd(hook.command));
      if (!exists) {
        targetEntry.hooks.push({ ...hook });
        added++;
      }
    }
  }
}

const origMode = (() => { try { return fs.statSync(targetPath).mode & 0o777; } catch (_) { return 0o600; } })();
// If targetPath is a symlink (e.g. dotfile manager), resolve to the real file to avoid replacing the symlink.
let writePath = targetPath;
try {
  if (fs.lstatSync(targetPath).isSymbolicLink()) {
    writePath = fs.realpathSync(targetPath);
  }
} catch (_) {
  // targetPath doesn't exist yet — will be created as a new regular file
}
const tmp = writePath + '.tmp.' + process.pid;
try {
  fs.writeFileSync(tmp, JSON.stringify(target, null, 2) + '\n', { mode: origMode });
  fs.renameSync(tmp, writePath);
} catch (e) {
  try { fs.unlinkSync(tmp); } catch (_) {}
  process.stderr.write(`Cannot write ${targetPath}: ${e.message}\n`);
  process.exit(1);
}

if (added > 0) {
  process.stdout.write(`merged ${added} hook(s) into settings.json\n`);
} else {
  process.stdout.write(`settings.json already up to date\n`);
}
