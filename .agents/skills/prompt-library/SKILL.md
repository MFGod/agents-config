---
name: prompt-library
description: >
  Explicit-invoke reference: pick and fill a proven Claude Code prompt template
  for a task the user is about to do. Call it when the user asks "how do I prompt
  Claude to X", "what should I ask for", or wants a template for a recurring task
  (onboard, explain code, plan a change, write tests, review, debug, ship,
  automate). 50 templates across the SDLC (discover, design, build, ship,
  operate) live in references/prompts.md — load it to select. The 6 prompting
  patterns behind these templates live in global-standards.md and are always in
  effect; this skill is only the template catalogue.
disable-model-invocation: true
license: MIT
metadata:
  author: anthropic
  version: "1.0"
  source: https://code.claude.com/docs/en/prompt-library
---

# Prompt library — pick a proven prompt, sharpen the ask

A vendored copy of Anthropic's official Claude Code prompt library: 50
copy-paste templates tagged by SDLC phase and category. This is a **catalogue,
invoked explicitly** — it does not fire on its own.

## When to use

- The user explicitly wants a prompt template / "how do I ask Claude to X".
- A recurring task (onboard, plan, test, review, debug, ship, automate) would
  benefit from a proven formulation instead of ad-hoc prompting.

Don't use it when the user already gave a precise, complete instruction — just
do the work. These are starting points, not scripts.

## The 6 patterns live in the rules, not here

The prompting patterns behind these templates (outcome over steps, give it a way
to self-check, point at a reference, state a measurable target, give the
artifact, name the answer format) are in `global-standards.md` and are **always
in effect** — they don't need this skill loaded. Apply them when filling any
template below.

## How to pick a template

Load `references/prompts.md` and select by **SDLC phase**, then category:

| Phase | Use when | Categories |
|-------|----------|------------|
| discover | orienting, understanding, scoping | Onboard, Understand |
| design | planning, prototyping before code | Plan, Prototype |
| build | implementing, testing, refactoring, reviewing, steering | Implement, Test, Refactor, Review, Steer |
| ship | git, release | Git, Release |
| operate | debugging, incidents, data, automating | Debug, Incident, Data, Automate |

## Procedure

- [ ] 1. Identify the user's SDLC phase and category. If unclear, ask one
      narrowing question — don't guess broadly.
- [ ] 2. Load `references/prompts.md`, find the closest template by id/title.
- [ ] 3. Fill the `{slots}` with values from THIS repo (real paths, real issue
      numbers, real metric targets) — not the generic defaults. Keep slots the
      user must decide explicit.
- [ ] 4. Apply the 6 patterns from `global-standards.md` to tighten the result.
      Cut anything the agent would already get right (see `references/prompts.md`
      "Add what the agent lacks" principle).
- [ ] 5. Present the filled prompt to the user, name the pattern(s) it relies
      on in one line, and offer to run it. Don't execute without the user's go.

## Gotchas

- **Templates are starting points, not contracts.** Adapt phrasing to the
  project's real shape; don't paste a template with default slots verbatim.
- **`{slots}` must be filled with project-real values**, or the prompt is noise.
  `path: src/scheduler/queue.ts` is an example, not your repo's path.
- **Don't compete with gstack.** This skill is about *formulating the ask*.
  Once work starts, `gstack-workflow.md` (THINK→PLAN→BUILD→REVIEW→TEST) governs
  execution. Several templates map onto gstack phases — that's a bridge, not a
  conflict.
- **Self-learning overlap.** Templates `turn-a-recurring-task-into-a-skill`,
  `turn-a-correction-into-a-rule`, `capture-what-to-remember` describe *prompts
  the user types*; the `self-learning` skill is the *autonomous harvest loop*.
  Different layers.
- **Source / drift.** Content vendored from Anthropic's published library; it
  drifts as they update the page. `skills-lock.json` records provenance. Re-pin
  periodically.

Full templates with slots, "why this works", and source links:
[references/prompts.md](references/prompts.md).