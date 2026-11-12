@docs/PLAN.md

# Working agreements (short)
- Read `docs/PLAN.md` and the latest `docs/milestones/*.md` at the start of every session.
- One milestone per branch/PR; don't build ahead of the current milestone.
- Every feel parameter goes in `src/core/tuning.ts` (and so the debug panel).
- Pure logic gets Vitest tests; keep rendering code thin.
- Static + offline: no runtime third-party requests. Update README credits and `data/raw/SOURCES.md` whenever data/assets are added.
