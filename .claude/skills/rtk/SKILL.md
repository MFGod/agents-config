---
name: rtk
description: >
  Toggle RTK (Rust Token Killer) pre-execution command compression on/off.
  Use when user says "/rtk", "/rtk on", "/rtk off",
  "включить rtk", "выключить rtk", "rtk off", "rtk on".
effort: low
---

# RTK (Rust Token Killer)

RTK перехватывает Bash-команды через PreToolUse hook и переписывает их для сжатия вывода.
Работает на уровне выполнения команд — независимо от Caveman и Headroom.

## Команды

- `/rtk` или `/rtk on` — включить переписывание
- `/rtk off` — выключить

## Режимы

| Режим | Поведение |
|-------|-----------|
| `on` | Переписывание: `git status` → `rtk git status` |
| `off` | Команды выполняются без изменений |

## Поведение

Хук `mode-tracker.js` обрабатывает команду и обновляет флаг `~/.claude/.rtk-active`
**до** того как модель отвечает. Флаг читается в `rtk-rewrite.sh` при каждом вызове Bash.

Определи новый статус по намерению пользователя:
- `/rtk off`, "выключить rtk", "disable rtk" → **OFF** — сообщи: "RTK OFF. Команды выполняются без переписывания."
- `/rtk on`, `/rtk`, "включить rtk", "enable rtk" → **ON** — сообщи: "RTK ON. Bash-команды автоматически оптимизируются."

## Статистика

```bash
rtk gain           # сбережения токенов за сессию
rtk gain --graph   # ASCII-график за 30 дней
```
