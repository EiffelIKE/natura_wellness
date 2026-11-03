# Natura Wellness – Frontend Test

Customer-facing pages for a fictional supplement brand:
Part A, "Manage my subscription" (src/part-a), and Part B, a pixel-perfect buy box (src/part-b).
Stack: Vite, React 19, TypeScript, CSS Modules. Vitest + Testing Library, Playwright + axe-core, ESLint + Prettier.

## Commands

npm run dev | npm run check (typecheck + lint + format + unit + e2e)

## Rules

- No new dependencies without human confirmation.
- Specs are the source of truth. Update the spec before the code drifts from it. Workflow: SPECS/README.md.
- After each completed task, add an entry to SPECS/CHANGELOG.md (agent work log, newest first).
- src/api/ is read-only. Part B text comes from src/part-b/copy.ts.
- Semantic HTML first, ARIA only where HTML falls short. Labels, keyboard support, focus management and live regions are required.
- After finishing core functionality, ask the human which edge cases and e2e flows to cover.
- After finishing a feature or fix, run `npm run check` and fix every failure.
