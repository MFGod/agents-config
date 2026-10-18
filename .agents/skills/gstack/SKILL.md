---
name: gstack
description: >
  Runs the Dynamic Workflow per the gstack methodology:
  Think (+ Phase Assessment) → Plan (FROZEN GATE) → Build (subagent hooks) → Review (cavecrew-reviewer) → Test.
  Core principles: the plan is frozen before any code; phases adapt to the task;
  loop-back BUILD→PLAN on unexpected discoveries; completeness principle.
  Trigger: "/gstack", "полный цикл", "спланируй и реализуй", "gstack методология",
  "Think-Plan-Build", "заморозь план", "completeness principle".
disable-model-invocation: true
effort: high
---

# gstack

Apply when: a new feature/module spanning ≥3 files; an architectural decision; risk to data, migrations, or contracts; the user asks for the full cycle.
**Do not apply to:** fixes of ≤2 files, searches, one-line edits.

Follow `.claude/rules/gstack-workflow.md`:
THINK (Phase Assessment) → PLAN (wait for `"да"` / `"ок"` / `"погнали"`) → BUILD (Completeness Principle + subagent hooks) → REVIEW (cavecrew-reviewer) → TEST.

Loop-back (changes architecture/contracts → the PLAN is updated): `СТОП. LOOP-BACK: <что открылось>. Мини-план: <2–4 шага>. Жду ОК.`
Deviation (tactical → the PLAN is untouched): `СТОП. Нужно отклонение: <что именно>. Предлагаю: <мини-план>. Продолжаю после подтверждения.`
