# Graphics refresh: plan

Status: **proposal**, nothing built. Goal: make Lokki look more appealing and feel more fun to watch, without leaving the pastel low-poly style (PLAN §4.5) or the performance budget (§4.4: 60 fps on integrated graphics, < ~200 draw calls, a working low preset for phones).

## 1. Where we are

Built in M10: one soft shadow map that follows the gull, neutral tone mapping, AO baked into building vertex colours, procedural facades with a window atlas, CC0 rigged people, instanced set dressing. Left out then: any post-processing (no outline, no bloom, no screen-space AO).

What reads as weak today:

| Area | Problem |
|---|---|
| **New level actors** (tram, pigeons, dogs, sunbathers, stage, statue, cart) | Plain boxes and spheres added quickly in M21–M24; they look like placeholders next to the M10 city |
| **The gull** | Chunky primitives, stiff: no squash/stretch, no expression, landing and snatching have little visual punch |
| **Feedback ("juice")** | Snatches, splats, woken sunbathers, pigeon scatter, bell rings mostly show a toast. Little happens *in the world* |
| **Sky, light and water** | One fixed daytime look (plus a simple night). Flat sky gradient, no clouds, no sun glow; water is a flat animated plane |
| **Ground** | Large flat single-colour areas (squares, lawns, streets) |
| **UI** | Functional paper note and toasts; level select and level-complete cards are plain |

## 2. Principles

1. **Juice before fidelity.** Motion, reactions and feedback make a game look fun; polygons do not. Spend first on things that move.
2. **Stay stylised.** Flat shading, pastel palette, soft shapes. No realistic textures, no PBR.
3. **Everything behind the quality preset.** High gets the post effects; low (phones) keeps today's cost.
4. **No new heavy dependencies.** Three.js only; post effects via its bundled `EffectComposer` passes or small custom shaders. Assets stay CC0 and bundled (offline rule).
5. **Every look parameter in `tuning.render`** so you can adjust it live and paste the JSON back.

## 3. Proposed milestones

Each is one branch/PR, with before/after screenshots in `tests/__screenshots__/` and a draw-call and frame-time check.

### G1 — Juice pass (M) — *recommended first*
The cheapest change with the biggest effect on "fun".
- **Gull animation:** squash and stretch on take-off, landing and snatch; anticipation crouch before a hop; head tracking of the locked target or nearest snack; blinking eyes; a happy wiggle when a to-do completes; wing-tip trails in a dive.
- **Hit effects:** feather puff on collisions, crumbs when food is grabbed, a bigger cartoon splat with a short drip, a star burst on a successful snatch, dust puff on landing, water rings and droplets when swimming or when props hit the sea.
- **NPC reactions in the world:** comic-style emotes over heads (`!`, `?`, `zzz`, anger scribble, hearts for the Pigeon Gang), replacing some toasts; arms-up panic and stumble poses.
- **Camera:** small impact shake (exists; extend to snatch and splat), a short slow-motion beat (about 0.15 s) on a snatch, a gentle zoom when a to-do completes.
- **To-do feedback:** the paper note stamps a tick with a pop; a small confetti burst on level complete.
- Cost: almost all instanced quads or pooled particles; a few extra draw calls.

### G2 — Sky, light and atmosphere (M)
Makes every screenshot prettier at once.
- **Sky dome** with a three-stop pastel gradient, a soft sun disc with glow, and **drifting low-poly clouds** (instanced, cast soft moving ground shadows as a cheap scrolling texture on the light).
- **Time-of-day presets as data** per level: morning (peach), noon (today's look), golden hour, dusk, night. `LevelDef.night` becomes `LevelDef.sky: 'morning' | 'noon' | 'golden' | 'dusk' | 'night'`. Fog colour, sun colour and angle, hemisphere tint all follow the preset.
- **Night that glows:** lit windows on facades (atlas already has window cells), warm lamp pools on the ground, string lights at the market and concert.
- **Height fog and distance haze** tinted by the sky, so the city fades into pastel instead of clipping.
- **Seasonal touches:** falling lime blossom in Esplanadi, snowfall already exists, autumn leaves for the herring market.

### G3 — Water and ground (S–M)
- **Water shader:** soft stylised waves (vertex displacement), a foam line along the shore and around floating things, sparkles toward the sun, depth-tinted colour, simple fake reflection of the sky colour. Boats and the ferry bob.
- **Ground detail:** cobblestone and paving patterns as a tiled procedural texture (like the window atlas, generated at runtime), painted tram rails and zebra crossings, grass tufts and flowers as instanced cards on lawns, puddles after sprinklers.
- **Blob shadows** softened and tinted instead of black.

### G4 — Post-processing "look" (S–M, high preset only)
- **Thin ink outline** (depth + normal edge detect, one full-screen pass): the single biggest step toward a "finished illustrated" look.
- **Soft bloom** on the sun, water sparkles, lit windows and lamps.
- **Colour grading** per sky preset (a small LUT or lift/gamma/gain), a slight vignette.
- **Optional tilt-shift blur** when gliding high: the city looks like a miniature. Toggle in Options.
- Risk: fill-rate on integrated GPUs. Mitigation: render the passes at half resolution, measure, and keep everything off on the low preset. If the outline costs too much, fall back to inverted-hull outlines on characters only.

### G5 — Character and actor art pass (M–L)
- **Gull model v2:** rounder body, real wing shape with feather tips, webbed feet, bigger expressive eyes; skins (already supported) get proper patterns.
- **Replace placeholder actors** from M21–M24 with proper low-poly builds: tram (windows, pantograph, driver), pigeons (wings, bobbing walk), dog (ears, wagging tail, run cycle), sunbathers (use the CC0 rigged people in a lying pose), Santa, the conductor, stage and jumbotron with a live picture-in-picture of the gull.
- **People variety:** more outfits and hair colours from the existing CC0 set, role props (cameras, phones, guitars), simple facial expressions via swapped face decals.
- **Landmark polish:** Cathedral dome and columns, emperor and poet statues as real silhouettes, Havis Amanda fountain with water jets.
- If hand-made glTF is wanted here, sources stay CC0 (Kenney / Quaternius) and are recorded in `data/raw/SOURCES.md`.

### G6 — UI and presentation (S–M)
- **Level select as an illustrated map** of the three districts with a little gull that flies between levels, stars drawn as stickers.
- **Polaroid pop-ups** for photo moments (planned in the Senate Square design, not built): a snapshot of the frame with the gull in it. Collected in an album.
- **Level-complete card** with the best polaroid, a stamp animation and star stickers.
- **Title screen** with the gull flying over the live city, a logo with a wobble.
- Consistent hand-drawn-style icons for skills and touch buttons.

## 4. Suggested order and why

| Order | Milestone | Why here |
|---|---|---|
| 1 | G1 Juice pass | Biggest "fun" gain per hour; no risk to performance; helps every existing level |
| 2 | G2 Sky and light | Biggest "appeal" gain; gives each level its own mood from data |
| 3 | G5 (actors only) | The Senate Square and Esplanadi placeholders are the most visibly unfinished art |
| 4 | G3 Water and ground | Fills the large flat areas |
| 5 | G4 Post look | Needs measuring on your hardware; best done once the scene content has settled |
| 6 | G6 UI | Polaroids and the map tie it together for the portfolio |

G1 and G2 together are roughly the size of M10 and would already change how the game reads in a GIF.

## 5. Budget guardrails

- Track draw calls and frame time in the debug overlay before and after each milestone; record them in the milestone doc.
- Particles and emotes: pooled, instanced, hard caps in tuning.
- Post passes: high preset only, half-resolution where possible, each with its own Options toggle.
- Phone (low preset) must stay within today's frame time; new content there is limited to animation, emotes and sky colours.

## 6. Decisions needed from you

1. **Order:** start with G1 (juice), or would you rather see the sky and lighting (G2) first?
2. **Outline look (G4):** do you want the inked-outline style at all? It changes the identity of the game more than anything else here.
3. **Models (G5):** stay fully procedural, or allow more CC0 glTF models for the gull and animals?
4. **When:** pause the district levels now (Esplanadi E4–E10 and Katajanokka remain), or finish Esplanadi first and then do the graphics pass?
