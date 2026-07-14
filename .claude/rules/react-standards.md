---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "src/store/**/*"
  - "src/pages/**/*"
  - "src/entities/**/*"
  - "src/hooks/**/*"
---

<!-- SYNC: .cursor/rules/react-standards.mdc -->

# React Standards

Reference implementation: React 18 TWA/VK Mini App (TypeScript strict, MobX, Webpack).
Extends `global-standards.md`. For Vue — see `vue-standards.md`.

**Stack:** React 18, TypeScript strict, MobX 6 + mobx-react, Webpack, React Router 6, axios / `@kts-front/call-api`, Sentry, SCSS modules / styled-components.

## `src/` structure

`main.tsx` (entry) · `vk/App.tsx, tg/App.tsx` (multi-platform) · `pages/` · `components/common/ layout/ modals/` · `store/globals/` (RootStore, ApiStore, BasePageStore) · `store/locals/` (page stores) · `store/models/` · `store/hooks/` · `entities/` · `config/` · `utils/` (lazyWithRetry, performance, defer).

## MobX

- `RootStore` — composition root; page stores `extends BasePageStore` (`store/globals/BasePageStore`).
- Components that read a store must be wrapped in `observer()` from `mobx-react`.
- Business logic and API calls live in stores, not in JSX.
- Derived UI state — `React.useMemo`; do not duplicate store state.

## Components

- `React.FC<Props>` with an explicit type. One component per file (`react/no-multi-comp`).
- Presentational components take no store. Connected ones use `observer` + `use*Store`.
- `clsx` for conditional classes. `lazyWithRetry` + `React.Suspense` for heavy pages.

## Styling (the choice is fixed per project)

Default is `ComponentName.module.scss`. If the project uses styled-components — `*.styles.ts`. Never mix the two in one component.

## API

- HTTP goes through `ApiStore`: `baseUrl` from config, Bearer token in `getAuthorizationCallback`.
- Errors are typed `ErrorResponse`, handled in the store; the UI renders state.
- Never call axios/fetch directly from a component.

## Multi-platform (TWA / VK)

A separate `App.tsx` per platform; `init(platform, App)` in `main.tsx`. Platform branching inside shared components goes only through `appParamsStore` (`store/globals/AppParamsStore`).

## Errors and resilience

- Error boundaries: `withErrorBoundary` on critical trees.
- `ChunkLoadError` — global handler + reload.
- `appState`: loading/success/error — a single source; never a white screen.
- HTML from an API — only via `DOMPurify.sanitize(html)`.

## Hooks

`useEffect` — for sync/subscription/timer/init only, not for derived state or business logic.
`useCallback` — for handlers in observer components (prevents needless re-renders).
Debounce — via `useRef`, not a new timer on every render.
`eslint-disable exhaustive-deps` — only with a comment explaining why.

## Tooling

`yarn tsc:check` before committing; eslint + prettier + stylelint; max-len 100; husky + lint-staged.

## TypeScript

- `unknown` instead of `any` when handling external data
- Explicit return types on public / exported functions
- `interface` for public contracts; `type` for unions and aliases

## Anti-patterns

- API calls in JSX; `useState` for global state on a MobX project; fetch during render.
- Giant components (>200 lines); ignoring chunk errors after a deploy.

## Checklist

REACT HOOKS CHECK:
- `useEffect` limited to sync/sub/timer/init; deps honored; `useCallback` for observer children?

MOBX CHECK:
- Every reader component in `observer()`; logic in stores; derived state via computed?
