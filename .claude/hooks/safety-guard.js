#!/usr/bin/env node
// Shared safety guard — works in three hook contexts:
//   CC PreToolUse:          stdin = {"tool_name":"Bash","tool_input":{"command":"..."}}
//                           deny  = {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',...}}
//   Cursor preToolUse:      stdin = {"hook_event_name":"preToolUse","tool_name":"Shell","tool_input":{"command":"..."}}
//                           deny  = {"permission":"deny","user_message":"...","agent_message":"..."}
//   Cursor beforeShellExec: stdin = {"hook_event_name":"beforeShellExecution","command":"..."}
//                           deny  = {"permission":"deny","user_message":"...","agent_message":"..."}
//
// Scope: DROP TABLE/DATABASE + git force-push to protected branches.
// Other destructive ops (git reset --hard, rm -rf, --no-verify) are
// covered by CLAUDE.md rules and model judgment — not blocked here.

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch { process.exit(0); }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) { process.exit(0); }

  // Detect context via hook_event_name (present in Cursor, absent in CC).
  // Primary: hook_event_name === 'preToolUse' (Cursor injects this field).
  // Fallback: tool_name === 'Shell' with no hook_event_name at all — catches future
  // Cursor versions that may drop hook_event_name while keeping tool_name:'Shell'.
  // Fallback is scoped to Shell only so CC's non-Bash tools (Write, Grep, …) still
  // route to the isCC branch (where they exit 0 via the tool_name !== 'Bash' check).
  //
  // beforeShellExecution: some Cursor versions may add tool_name to this event.
  // Explicitly excluded from isCC so cmd is always read from parsed.command.
  const isCursorBeforeShell = parsed.hook_event_name === 'beforeShellExecution';
  const isCursorPreToolUse =
    parsed.hook_event_name === 'preToolUse' ||
    (parsed.tool_name === 'Shell' && !('hook_event_name' in parsed));
  const isCC = !isCursorPreToolUse && !isCursorBeforeShell && 'tool_name' in parsed;

  let cmd = '';
  if (isCC) {
    if (parsed.tool_name !== 'Bash') { process.exit(0); }
    cmd = (parsed.tool_input && parsed.tool_input.command) || '';
  } else if (isCursorPreToolUse) {
    if (parsed.tool_name !== 'Shell') { process.exit(0); }
    cmd = (parsed.tool_input && parsed.tool_input.command) || '';
  } else {
    cmd = parsed.command || '';
  }

  // DROP TABLE / DROP DATABASE — blocked only as a real command token.
  // Anchoring to shell separators prevents false positives from grep/echo content.
  if (/(?:^|&&|\|\||;|\n)\s*drop\s+(table|database)/i.test(cmd)) {
    deny('DROP TABLE/DATABASE');
    return;
  }

  // git push --force to protected branches only (main, master, dev, test, prod)
  // Anchor 'git' to command position — prevents false positives on grep/echo content.
  if (/(?:^|&&|\|\||;|\n)\s*git(?:\s+\S+)*\s+push\b/.test(cmd)) {
    // Extract afterPush from the matched git push command, not the first "push" in the string.
    // cmd.search(/\bpush\b/) would find "push" in e.g. echo/grep content before the actual
    // git push, causing afterPush to contain the wrong portion and miss --force flags.
    const pushMatch = cmd.match(/(?:^|&&|\|\||;|\n)\s*git(?:\s+\S+)*\s+push\b([^&|;\n]*)/);
    const afterPush = pushMatch ? pushMatch[1] : '';

    // --force\S* covers --force, --force-with-lease, --force-with-lease=<refname>.
    const hasForce = /\s-[a-zA-Z]*f[a-zA-Z]*(\s|$)|\s--force\S*(\s|$)|--force\S*$/.test(afterPush);
    // +refspec form: git push origin +HEAD:dev — force without --force flag.
    const hasRefspecForce = /(?:^|\s)\+\S+/.test(afterPush);

    if (hasForce || hasRefspecForce) {
      // Extract the branch name (last non-flag argument after 'push').
      // Protected branches are exact names: main, master, dev, test, prod.
      // Branches like dev-06-fixes, test-coverage, prod-fix-12 must be allowed.
      const nonFlagArgs = afterPush.match(/(?:^|\s)(?!-)\S+/g) || [];
      // Branch is the last non-flag token after push (after trimming whitespace).
      const branchArg = nonFlagArgs.length >= 2
        ? nonFlagArgs[nonFlagArgs.length - 1].trim()
        : null;
      // Strip leading + (refspec force notation), then split on ":" — take remote ref.
      const rawBranchArg = branchArg !== null ? branchArg.replace(/^\+/, '') : null;
      const remoteRef = rawBranchArg !== null ? rawBranchArg.split(':').pop() : null;
      // Normalize refs/heads/main → main to handle full ref format.
      const normalizedRef = remoteRef !== null ? remoteRef.replace(/^refs\/heads\//, '') : null;
      const isProtectedBranch = normalizedRef !== null &&
        /^(main|master|dev|test|prod)$/.test(normalizedRef);
      // HEAD/@: symbolic refs that may resolve to a protected branch at push time.
      const isAmbiguousRef = normalizedRef !== null && /^(HEAD|@)$/i.test(normalizedRef);
      if (isProtectedBranch || isAmbiguousRef || nonFlagArgs.length < 2) {
        deny(isProtectedBranch
          ? 'git push --force to protected branch (main/master/dev/test/prod)'
          : isAmbiguousRef
            ? 'git push --force with symbolic ref (HEAD/@) — may resolve to a protected branch'
            : 'git push --force without explicit remote + branch (implicit upstream may be protected)');
        return;
      }
    }
  }

  process.exit(0);

  function deny(reason) {
    if (isCC) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Blocked by safety-guard: ${reason}. Confirm with user before retrying.`,
        },
      }));
    } else {
      process.stdout.write(JSON.stringify({
        permission: 'deny',
        user_message: `Заблокировано safety-guard: ${reason}`,
        agent_message: `Command blocked by kit safety-guard (${reason}). Confirm with user before retrying.`,
      }));
    }
    process.exit(0);
  }
});
