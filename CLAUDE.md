# Agents-config — Claude Code Rules

You are a senior engineer. **Reply in Russian.**

- Intention-revealing naming; early return over nesting
- Inline when <2 uses; abstract on real need, not for "architecture"
- Backward compatibility unless told otherwise
- Atomic minimal changes; no hidden side effects, no magic values
- Fail fast; errors must be actionable
- Before non-trivial edits: study dependencies, layer boundaries, regression risk
- Validate input; sanitize external data; no secrets in code
- New dependency only on real need; weigh maintenance and bundle impact
- **Non-trivial task** (≥3 files, new domain logic, regression risk, public API) → apply `structured-response`. Tests/refactoring/security → apply `dev-workflow`.

---

## Kit Agents-config

No `.claude/kit-meta.json` → create `{ "installedAt": "<today, ISO 8601>", "kitVersion": "<contents of .claude/kit-version>" }`, report in one line.
To check for updates: `bash install.sh <target>` — install.sh checks GitHub and notifies automatically.

---

## Project profile

No `.claude/rules/project-profile.md` and this is the first non-trivial task — study the repo (README, manifest, `src/`, CI), then create it (≤50 lines): purpose, stack, structure, branches, what not to touch, tests. Draft → wait for confirmation. Critical unknown → ask before editing. Do not recreate it unasked.

---

## Self-learning: golden paths into skills

The `self-learning` meta-skill captures a proven procedure (golden path + dead ends) as an Agent Skill — the next session starts with the route in hand instead of rediscovering it.

Triage:
- **Multi-step procedure** (deploy, reach DB, migrations, live verification) → skill (`.claude/skills/` project, `~/.claude/skills/` global).
- **Single fact / one-liner** (env var, path, gotcha) → Claude Code native memory (`~/.claude/projects/.../memory/`), **not** a skill. For other agents — `AGENTS.md`/notes.
- **One-off** → skip.

Promotion gate (all 3, else not a skill — leave a tentative note): **passing check** (test/build/repro green) + **named failure pattern** + **≥1 ruled-out dead-end**.
**Never write secrets** — only where to find them (env var, selector, MCP tool, vault). See `global-standards.md`.

### Skill revision — the reverse procedure

`self-learning` only **adds**. With no reverse gear the skill set grows until it starts doing harm: every skill's `description` sits in the context of **every** session, and overlapping descriptions make the agent pick the wrong skill. A set that only grows will eventually cost more than it saves.

Run a revision at **≥15 project skills** or once a quarter — whichever comes first. For each:

1. **Is the golden path still alive?** Do the commands work, do the paths exist, does the tool still ship? Stale → delete (with confirmation). A skill that confidently describes a dead path is **worse than no skill**: the next session will believe it.
2. **Has it ever fired?** Never invoked since creation — candidate for removal.
3. **What does it overlap with?** Two skills for one job — keep one. If both are needed, separate the `description`s so the choice is unambiguous.
4. **Should it self-invoke at all?** Skill covers a committed direction or a narrow niche → `disable-model-invocation: true`. Then it stays out of auto-selection and stops confusing the model.

Deleting a skill is irreversible — show the list, wait for an explicit "yes".

---

## Design skills: which one, when

Default entry point is **`impeccable`** (subcommands craft / audit / critique / polish / harden / animate). It is the only design skill the model auto-selects for general UI work. The niche ones are a deliberate call — invoke them by name.

| Task | Skill | Auto? |
|------|-------|-------|
| "fix / build the UI", no direction named | `impeccable` + subcommand | auto |
| Why users don't convert; rationale for a UX decision | `ux-core` | auto |
| Choosing a palette / font pairing / chart type / stack | `ui-ux-pro-max` | auto |
| New landing page / portfolio from scratch | `/design-taste-frontend` | explicit |
| Upgrading an existing site | `/redesign-existing-projects` | explicit |
| "Looks cheap", needs a premium visual | `/high-end-visual-design` | explicit |
| UI polish, deciding "does this need animation" | `/emil-design-eng` | explicit |
| A committed visual direction | `/minimalist-ui`, `/industrial-brutalist-ui` | explicit |

Rules:
- **One visual skill at a time.** Overlapping descriptions are not a reason to pull in three at once.
- `ux-core` **composes** with any visual skill: it supplies the "why", not the "how it looks". Not a replacement.
- The `design-critic` agent is a gate **before** implementing a major section (3 alternatives, benchmarked against Linear/Stripe/Vercel). The `before-after-reviewer` agent scores **after**. Both run in a separate context and don't eat the main one.
- **Explicit-only is not a demotion — it is what makes the table above true.** A skill marked `disable-model-invocation` drops out of auto-selection *and* out of the session context entirely; its `description` stops competing with `impeccable` and stops being paid for every session. If a task needs one, say so and invoke it by name.

---

## Token Efficiency: Headroom + Caveman

**Headroom** compresses INPUT (tool outputs, file reads → LLM). **Caveman** compresses OUTPUT (Claude's replies). Together — optimization in both directions.

| Mode | Headroom | Caveman |
|------|----------|---------|
| Debug / investigation | careful (detail can be lost) | lite or OFF |
| Routine / batch / production | ON | full |

MCP headroom: `headroom_compress`, `headroom_retrieve`, `headroom_stats`. Large tool outputs (searches, logs, listings) → `headroom_compress`; restore via `headroom_retrieve`.

---

## Context Compaction

When Claude Code auto-compacts the context, carry the following into the top of the new one:

- Current gstack phase (THINK / PLAN / BUILD / REVIEW / TEST) and FROZEN GATE status.
- List of files changed/created this session.
- Open test failures or blockers, if any.
- Any decisions the user made explicitly (scope, architecture, changes ruled out).

---

## Conditional rules (stack-rules)

Stack rules attach **automatically** by file type (`paths:` frontmatter). Several can activate at once when paths overlap.

| File | When it loads (auto-attach) |
|------|-----------------------------|
| `.claude/rules/react-standards.md` | `*.tsx`, `*.jsx`, `src/store/`, `pages/` |
| `.claude/rules/vue-standards.md` | `*.vue`, `*.css`, `*.scss`, `composables/`, `views/`, `stores/` |
| `.claude/rules/python-fastapi-standards.md` | `src/main.py`, `core/`, `*service*`, `*client*`, `*router*` |
| `.claude/rules/python-django-standards.md` | `config/`, `src/api/`, `src/engine/`, `src/workers/` |
| `.claude/rules/testing-standards.md` | `tests/**`, `test/**`, `**/test_*`, `**/*_test.*`, `**/*.test.*`, `**/*.spec.*` |

Always active:

| File | When to apply |
|------|---------------|
| `.claude/rules/structured-response.md` | refactoring, new feature, architecture, large PR |
| `.claude/rules/dev-workflow.md` | tests, refactoring, security, dependencies |
| `.claude/rules/gstack-workflow.md` | full feature cycle (Think→Plan→Build→Review→Test) |
| `.claude/rules/git-conventions.md` | commits, branches, PRs, merges, any git work |
| `.claude/rules/external-content.md` | web pages, MCP results, API responses, tickets — anything fetched from outside the repo |
