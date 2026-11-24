# Polyfork: can it improve Lokki's graphics? (research draft, M125 plan)

Status: **draft, not verified against the site.** polyfork.dev could not be read from the sandbox
(DNS failure, then the host was added to the environment allowlist but the fetch was refused
by the permission classifier). Everything below the "Known" line comes from third-party pages
(Product Hunt, AppSumo, hunted.space).

## Known
- Polyfork is a small, new library of low-poly 3D assets that "ship as small programs, not frozen
  meshes": a knob (size, colour, variant) rebuilds the model.
- A founder reply (12 Oct 2026) says HD versions with textures are being rolled out (`/assets?cat=hd`).
  HD textures do not fit our flat pastel look; we would stay in the low-poly category.

## Unknown (must be read from polyfork.dev before any decision)
1. Licence: commercial use, attribution, and **redistribution inside a public MIT repo** (a
   deal-breaker if files may not be committed or served from `dist/`).
2. Formats: glTF/GLB/OBJ, or only code/a runtime? If a runtime library, the "static and offline" rule
   (CLAUDE.md) needs it bundled, with no runtime requests to polyfork.dev.
3. Price, and whether purchased assets can sit in a public repository.
4. Which categories exist (people, boats, trees, benches, bikes, food?).

## Fit
- Good candidates (all procedural today): street furniture, trees, boats, bikes, café umbrellas,
  stalls, food props. Parametric models match our tuning/seeded-variation approach.
- Keep out: the gull and NPCs (rigged, role-coloured in code; CLAUDE.md M10 plan uses CC0 rigs).
- Everything must be recoloured through `render/palette.ts` so it stays pastel and flat-shaded.

## Plan if the licence allows it
1. R0 (S): read licence, formats, categories; pick 5 to 10 assets; record in `data/raw/SOURCES.md`
   and README credits.
2. R1 (S): import pipeline: GLB (via `@gltf-transform`) to instanced meshes, merged per chunk,
   palette remap; draw-call budget test must still pass.
3. R2 (M): swap procedural props one category at a time behind a tuning flag; before/after
   screenshots; Playwright smoke.
4. Fallback if the licence forbids redistribution: Kenney / Quaternius CC0 packs (already allowed hosts).

## Decision needed from the user
Allow me to read polyfork.dev (or paste its licence and asset-format pages here), and say whether a
paid asset library is acceptable for a public portfolio repo.
