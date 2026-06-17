---
name: headroom
description: >
  Toggle Headroom MCP auto-compression mode on or off.
  Use when user says "/headroom", "/headroom on", "/headroom off",
  "включить headroom", "выключить headroom", "headroom off", "headroom on".
effort: low
---

# headroom

Headroom автоматически сжимает большие tool outputs перед передачей в контекст.

## Команды

- `/headroom` или `/headroom on` — включить
- `/headroom off` — выключить

## Поведение

Хук `mode-tracker.js` обрабатывает команду и обновляет флаг `~/.claude/.headroom-active` (content: `"on"` или `"off"`) **до** того как модель отвечает.

Определи новый статус по намерению пользователя:
- `/headroom off`, "выключить headroom", "disable headroom" → **OFF**
- `/headroom on`, `/headroom`, "включить headroom", "enable headroom" → **ON**

Подтверди пользователю:
- ON: "Headroom ON. Logs, JSON, search results, command output >100 строк будут сжиматься через headroom_compress."
- OFF: "Headroom OFF. Авто-сжатие отключено."
