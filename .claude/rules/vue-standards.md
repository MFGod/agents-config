---
paths:
  - "src/**/*.vue"
  - "src/**/*.css"
  - "src/**/*.scss"
  - "src/**/composables/**/*"
  - "src/**/views/**/*"
  - "src/**/stores/**/*"
---

<!-- SYNC: .cursor/rules/vue-standards.mdc -->

# Vue Standards

Extends `global-standards.md`. For React — see `react-standards.md`.

**Stack:** Vue 3, TypeScript, JavaScript, HTML5, CSS3/SCSS, Vite/Webpack, REST API, SSR/SSG/SPA/PWA.

## Architecture

Before making changes, analyze: component tree, data flow, state dependencies, composables, routing, UI patterns, rendering impact.

## Components

- One component = one responsibility. Split smart/dumb. Props: typed, minimal, immutable, with explicit defaults.
- Move logic into a composable at ≥2 use sites; otherwise keep it inline. Exception: complex non-trivial logic over 15 lines may be extracted at a single use site.
- Never: prop drilling beyond 2–3 levels; giant components; hidden mutations; side effects during render.

## Vue 3

- Composition API + `script setup`; typed props/emits.
- `computed` for all synchronous derived state.
- `watch` only for: async operations, DOM side effects, external synchronization (localStorage, WebSocket, router).
- `ref` for primitives, `reactive` for grouped state.

## TypeScript

- `unknown` instead of `any` when handling external data
- Explicit return types on public / exported functions
- `interface` for public contracts; `type` for unions and aliases

## State management (Pinia)

Prefer, in order: local state → composition → composables → Pinia (only when ≥2 unrelated components need the same data).

Pinia: state mutations happen **in actions only**; templates and external code go through actions. Derived state — via `computed` in the store.

## API and forms

- Type responses; handle loading/error/empty/retry.
- Cancellation — `AbortController`: abort the previous request when a new one starts, `controller.abort()` in `onUnmounted`.
- No fetch during render; no silent failures; no ignored race conditions.
- Forms: controlled state, validation, error/loading/disabled. Debounce ≥300ms on search fields; throttle on scroll/resize.

## Styling

- Reusable styles, design tokens, component isolation, mobile-first.
- No: magic numbers, `!important`, duplicated styles, deep nesting.

## Refactoring

**Don't:** create a composable for one-line logic; decompose a block that isn't actually complex.

## Checklist

PERFORMANCE CHECK:
- Heavy components/routes lazy-loaded (`defineAsyncComponent` / router lazy)?
- Needless re-renders eliminated (`v-memo`, `computed`, `shallowRef`)?
- Bundle size checked after adding a dependency?

ACCESSIBILITY CHECK:
- Interactive elements: `aria-label` or visible text?
- Keyboard nav: Tab, Enter, Escape? Focus management after a modal closes?
- Semantic tags, not a `div` standing in for something interactive?
