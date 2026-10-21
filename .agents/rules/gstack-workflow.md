<!-- SYNC: .cursor/rules/gstack-workflow.mdc -->

# gstack Workflow

When: feature/module ≥3 files; architectural decision; risk to data/migrations/contracts; explicit request for the full cycle.

**Do not apply to:** fixes of ≤2 files, searches, one-liners.

---

## THINK — before any plan

In writing, no code:

- What does "done" mean? Success metric?
- What will break? Regressions?
- What is NOT in scope?
- External blockers (API, team, data)?

### Phase Assessment

State the status of each phase at the end of THINK:

| Phase | Status | Reason |
|-------|--------|--------|
| PLAN | Required / Optional | Required if ≥3 files or architectural decisions |
| BUILD | Always Required | — |
| REVIEW | Required / Skip | Required if there is risk to data, contracts, or security |
| TEST | Required / Skip | Skip only for docs/config; Required when logic changes |

Output: the answers + the phase table. Code only after PLAN.

---

## PLAN — before building

Format from `structured-response.md`:
`ANALYSIS → PLAN (numbered steps: file + what + why) → RISKS → TEST PLAN`

**FROZEN GATE:**
An explicit instruction to proceed (`"да"`, `"ок"`, `"погнали"`, `"приступай"`) authorizes the agreed scope. Reuse authorization already given in the session. Ask for approval only when a material unresolved decision or an action outside that scope requires it.
After authorization: keep the agreed architecture stable; explain any material change with a mini-plan.

---

## BUILD — only after the FROZEN GATE

- One file/layer end to end, no context switching.
- **Completeness Principle:** a file/function is finished before moving to the next.
- No `TODO` / `...` / placeholders without an explicit "next PR".

### Subagent hooks

- Codebase unfamiliar → spawn an Explore subagent for context before writing.
- Mechanical edits (rename, format, mass-replace) → spawn cavecrew-builder.

---

## REVIEW — after BUILD, before TEST

Checklist:

- Layer boundaries intact (per the project's stack rule)?
- Errors explicit — no silent failures?
- No superfluous abstractions/dependencies?
- Input validated, no secrets in code, HTML from an API passed through a sanitizer?

### Automated review

After self-review → spawn the cavecrew-reviewer subagent with the diff or the file list.

---

## TEST — before merge

Follow `dev-workflow.md`:
1. Write/update tests.
2. Run them, show the output.
3. If a test cannot be written — record why.

---

## Loop-back: BUILD → PLAN

When: a discovery changes architecture, contracts, layers, or naming — **the PLAN must be updated**.

Explain the discovery and update the affected plan steps. Continue when the change remains within the user's authorized objective and preserves its constraints. Ask for a decision only when scope, risk or an unresolved tradeoff requires the user; do not treat routine implementation choices as a new approval gate.

---

## Deviation from the plan

For tactical choices that preserve the agreed architecture, use engineering judgment and report material consequences. Re-plan material architectural changes; preserve authorization already given and any genuine explicit approval boundary.

---

## State tracking

Keep the objective, phase, authorization, changed files and unresolved failures in the current client's task state or compaction summary. Use available tools; do not assume another client's TodoWrite or hooks exist.

**Cursor with the kit preCompact hook configured:** persist phase state in `.cursor/hooks/state/gstack.json` before compaction. Claude Code/Codex retain the same facts in their supported task/compaction mechanisms.

```json
{ "phase": "BUILD", "frozen": true, "modified": ["src/auth.ts", "src/models.py"] }
```

When done, remove only temporary state owned by this workflow; preserve user files.
