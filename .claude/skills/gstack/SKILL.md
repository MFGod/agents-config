---
name: gstack
description: >
  Запускает Dynamic Workflow по методологии gstack:
  Think (+ Phase Assessment) → Plan (FROZEN GATE) → Build (subagent hooks) → Review (cavecrew-reviewer) → Test.
  Ключевые принципы: план замораживается до кода; фазы адаптируются под задачу;
  loop-back BUILD→PLAN при неожиданных открытиях; completeness principle.
  Trigger: "/gstack", "полный цикл", "спланируй и реализуй", "gstack методология",
  "Think-Plan-Build", "заморозь план", "completeness principle".
disable-model-invocation: true
effort: high
---

# gstack

Применяй при: новая фича/модуль ≥3 файлов; архитектурное решение; риск для данных, миграций, контрактов; пользователь просит полный цикл.
**Не применяй:** фикс ≤2 файлов, поиск, однострочные правки.

Следуй `.claude/rules/gstack-workflow.md`:
THINK (Phase Assessment) → PLAN (жди `"да"` / `"ок"` / `"погнали"`) → BUILD (Completeness Principle + subagent hooks) → REVIEW (cavecrew-reviewer) → TEST.

Loop-back (меняет архитектуру/контракты → PLAN обновляется): `СТОП. LOOP-BACK: <что открылось>. Мини-план: <2–4 шага>. Жду ОК.`
Отклонение (тактическое → PLAN не трогается): `СТОП. Нужно отклонение: <что именно>. Предлагаю: <мини-план>. Продолжаю после подтверждения.`
