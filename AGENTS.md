# AGENTS.md

Guidance for autonomous coding agents working in `C:\Dev\sgw-utils`.

## Project Snapshot

- Stack: React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui + Base UI.
- Package manager: Bun only in this environment (assume Node/npm are unavailable).
- Build output: `dist/`.
- Path alias: `@/*` maps to `src/*`.
- Strictness: TypeScript strict mode is enabled.

## Install And Run

- Install dependencies: `bun install`.
- Start dev server: `bun run dev`.
- Build production assets: `bun run build`.
- Preview built app: `bun run preview`.
- Lint project: `bun run lint`.

## Build / Lint / Test Commands

### Standard Commands

- Dev: `bun run dev`
- Build: `bun run build`
- Lint all: `bun run lint`
- Preview: `bun run preview`
- Use Bun commands only (`bun`/`bunx`), not `node`, `npm`, or `npx`.

### Single-Target Commands

- Lint one file: `bunx eslint src/components/calculators/planet-upgrade-calculator.tsx`
- Lint multiple files: `bunx eslint src/App.tsx src/main.tsx`
- Type-check app config only: `bunx tsc -p tsconfig.app.json --noEmit`
- Type-check node/vite config only: `bunx tsc -p tsconfig.node.json --noEmit`

### Tests (Current State)

- There is currently no test framework or test script but there's no need for tests as this is a small personal project

## CI Notes

- GitHub Actions workflow: `.github/workflows/deploy-pages.yml`.
- CI installs with `bun install --frozen-lockfile`.
- CI build command: `bun run build -- --base "$BASE_PATH"`.
- Deployment targets GitHub Pages.

## Code Style Guidelines

### UI And Styling

- Use existing shadcn/ui + Base UI building blocks before adding new primitives.
- Prefer Tailwind utility classes and existing design tokens.
- Reuse CSS variables defined in `src/index.css`.
- Preserve existing visual language unless task explicitly requests redesign.

## File-Specific Conventions

- `src/App.tsx`: treat `CATEGORIES` as the top-level calculator/category registry; add new categories and wire calculator components there.
- `src/components/ui/*`: generated/adapted UI primitives; change carefully and consistently.
- `src/components/calculators/*`: domain calculation logic and calculator UI.
- `src/lib/utils.ts`: shared utility helpers (currently `cn`).
- `src/index.css`: theme tokens and base utility layers.

## Agent Workflow Expectations

- Before editing, inspect nearby code for established patterns.
- Make minimal, targeted diffs unless a larger refactor is requested.
- Run lint and relevant type checks after changes.
- Update this file whenever tooling, scripts, or conventions change.
