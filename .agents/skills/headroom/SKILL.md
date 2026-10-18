---
name: headroom
description: >
  Toggle Headroom MCP auto-compression mode on or off.
  Use when user says "/headroom", "/headroom on", "/headroom off",
  "включить headroom", "выключить headroom", "headroom off", "headroom on".
effort: low
---

# headroom

Headroom automatically compresses large tool outputs before they reach the context.

## Commands

- `/headroom` or `/headroom on` — enable
- `/headroom off` — disable

## How it works

The `mode-tracker.js` hook processes the command and updates the `~/.claude/.headroom-active` flag (content: `"on"` or `"off"`) **before** the model replies.

Determine the new status from the user's intent:
- `/headroom off`, "выключить headroom", "disable headroom" → **OFF**
- `/headroom on`, `/headroom`, "включить headroom", "enable headroom" → **ON**

Confirm to the user:
- ON: "Headroom ON. Logs, JSON, search results, command output >100 строк будут сжиматься через headroom_compress."
- OFF: "Headroom OFF. Авто-сжатие отключено."
