# Implementation plans (for later)

Status: **plans only**, nothing here is built. This turns three proposals into work that can be picked up one milestone at a time:

- **A. Havoc Hour** (`havoc-hour.md`): chaos chains, director, front page, daily edition, nest.
- **B. Co-op and to-dos** (`fun-todos.md`): F2 two-gull carry and stack, F3/F5 to-do passes, F4 share kit, F6 photo mode and awards.
- **C. Graphics** (`graphics-refresh.md`): G2 sky and light, G3 water and ground, G4 post look, G5 actor art, G6 UI.

A fourth plan, world enrichment (buildings, roads, ambient life), is being researched separately and will land in `world-enrichment.md`; its implementation plan should be added here once that research is in.

Each milestone below follows the working agreements in `PLAN.md` §6: one branch and PR (`mN-short-name`), feel parameters in `src/core/tuning.ts`, pure logic with Vitest tests, thin rendering, a `docs/milestones/Mx.md`, static and offline.

---

## 0. Tech stack and ground rules (all plans)

### Stack (unchanged)
| Layer | Choice | Notes |
|---|---|---|
| Language, build | TypeScript 6, Vite 8, npm, Node >= 22 | As today |
| Rendering | Three.js 0.187, WebGL2 | Post effects use Three's bundled `three/addons` (`EffectComposer`, `RenderPass`, `ShaderPass`, `UnrealBloomPass`, `OutputPass`). No new package |
| Physics | Rapier (`@dimforge/rapier3d-compat`) | Two-gull carry uses a Rapier joint (see B1) |
| Tests | Vitest (logic), Playwright (smoke, single worker, software GL) | As today |
| Net | WebRTC data channel, host-authoritative snapshots, optional Cloudflare Worker for room codes | As today; new state rides in the snapshot |
| Storage | `localStorage` via `src/core/save.ts` | Save version bump with a migration (see 0.3) |

### New browser APIs (all built in, no dependency)
| API | Used for | Fallback |
|---|---|---|
| `HTMLCanvasElement.toBlob` | Polaroids, front page and record card as PNG | Always available |
| `navigator.share` with files, `navigator.canShare` | Share sheet on phones | A "Save image" download link and "Copy link" |
| `canvas.captureStream()` + `MediaRecorder` (WebM) | Replay clips (optional, B3) | Hide the button where `MediaRecorder` or the WebM type is unsupported (notably some Safari versions: check at runtime with `MediaRecorder.isTypeSupported`) |
| `Intl.DateTimeFormat` | The newspaper date line | Always available |

No analytics, no accounts, no leaderboards server. If a global leaderboard is ever wanted it is a separate decision (it breaks the offline rule and needs the Worker).

### 0.1 Dependencies
None of these plans needs a new runtime dependency. If an implementer believes one is needed (for example a GIF encoder), stop and ask first (`PLAN.md` §6.5). WebM via `MediaRecorder` avoids a GIF encoder.

### 0.2 Shared prerequisites (do these first, once)

| # | Prerequisite | Why | Where |
|---|---|---|---|
| P1 | **Run log**: a typed, timestamped list of gameplay events (`{t, kind, by, x, z, tags[]}`) fed from the one place quest events are raised today (`notes(quests.onEvent(...))` call sites in `main.ts`) | Havoc scoring, headlines, awards, record card and replay markers all read the same log | New `src/gameplay/runLog.ts` (pure) + a single `raise(event, meta)` helper in `main.ts` that calls `quests.onEvent` and appends to the log |
| P2 | **Split `main.ts`** (about 2,000 lines) into systems with a common interface `{ setup(level), step(dt), stepRemote(dt), render(dt), snap(), applySnap(s), dispose() }` | Havoc Hour needs to start and stop casts at runtime; every new feature currently adds to one file | New `src/systems/` (tram, pigeons, sunbathers, dogs, sprinklers, bells, kalle, coop, juice); `main.ts` keeps the loop and wiring. Pure refactor with no behaviour change; the existing 390 unit and 65 smoke tests are the safety net |
| P3 | **Capture service**: render the current frame (or an offscreen camera) to a canvas and return a PNG blob | Polaroids, front page photo, record card | New `src/render/capture.ts`; needs `preserveDrawingBuffer` avoided by rendering to a `WebGLRenderTarget` and reading pixels |
| P4 | **Save v2**: add `havoc`, `nest`, `album`, `awards` with a `migrate(v1)` and tests | Persistent collection and daily history | `src/core/save.ts`, `tests/unit/skills-save.test.ts` |

P2 is the only risky one. Do it as its own milestone before Havoc H2, in small commits (one system per commit), running the full gate after each.

### 0.3 Save format v2 (sketch)
```ts
interface SaveDataV2 extends Omit<SaveData, 'version'> {
  version: 2;
  havoc: { best: number; bestRank: number; runs: number; daily: Record<string /* yyyy-mm-dd */, { score: number; rank: number; headline: string }> };
  nest: string[];            // collected item ids
  album: { id: string; level: string; caption: string; at: number }[];  // metadata only; images are regenerated or kept in IndexedDB later
  awards: Record<string, number>;   // award id -> times earned
}
```
Images are not stored in `localStorage` (size limits). The album keeps captions and regenerates a placeholder; storing PNGs in IndexedDB is an optional follow-up.

---

## A. Havoc Hour

### A0. Architecture

```
src/gameplay/havoc/
  scoring.ts      pure: base values, chain window, multiplier, style tags
  director.ts     pure: seeded scheduler over an event pool, pacing rules
  kits.ts         data: event kits (what to spawn, where, how long, what it scores)
  headlines.ts    pure: run log -> headlines, rank
  daily.ts        pure: date -> seed, share line
src/systems/havocRun.ts   glue: owns a run (clock, kits alive, score), talks to systems via P2 interface
src/ui/havocHud.ts        chain meter, style tag pop-ups, scoop ticker, clock
src/ui/frontPage.ts       the newspaper (DOM + canvas export)
src/data/havoc/           values.ts (scores), kits/*.ts, headlines.ts (templates), nestItems.ts
```

#### Scoring (pure, `scoring.ts`)
```ts
interface ScoreEvent { t: number; kind: string; by: number; indirect?: boolean; tags?: StyleTag[] }
interface ChainState { mult: number; kinds: Set<string>; lastT: number; points: number; best: number }
function applyEvent(s: ChainState, e: ScoreEvent, cfg: HavocTuning): { gained: number; mult: number; tags: StyleTag[]; broke: boolean }
function breakChain(s: ChainState): number  // on a deterrent hit; returns banked points
```
Rules: chain window `tuning.havoc.chainSeconds` (6); multiplier +1 per *new kind* in the chain, capped (`maxMult` 10); repeats score base only; `indirect` doubles the base; teamwork kinds (`coop:*`) add +2. All numbers in a new `tuning.havoc` group.

Style tags come from metadata already available at the event site: unseen (NPC suspicion 0), mid-air (gull mode), height of release for splats, under a net zone, during a photo countdown.

**Indirect attribution** (the chain-reaction bonus) is the subtle part: mark an event `indirect` when its cause is an actor the player set in motion within the last N seconds. Implement with a small "cause" stamp: when the player triggers an actor (throws the ball, pecks the valve, stops the tram), that actor carries `causedBy = {gull, t}`; events the actor raises copy it.

#### Director (pure, `director.ts`)
```ts
interface Kit { id: string; district: District; anchor: {x:number; z:number}; duration: number; weight: number; needs?: string[] /* story level ids that unlock it */; near?: string[] /* kits it pairs well with */ }
class Director { constructor(seed: number, kits: Kit[], cfg); step(dt, ctx: { gull: P2; chainHot: boolean; idleFor: number; alive: string[] }): DirectorAction[] }  // {start: kitId} | {stop: kitId}
```
Seeded with `src/core/rng.ts`. Pacing: an event every `eventEvery` (35 s ± jitter), at most `maxAlive` (3) at once, prefer kits near the player and near a live kit (`near`), send a tempting one when `idleFor > 20`, add a complication (Warden, Kalle) when `chainHot`.

#### Kits
A kit is a level set-up in portable form: `spawn(ctx)` returns the handles it created (NPC ids, prop ids, system instances) and `despawn()` removes them. Most content already exists as `LevelDef` fragments (`extraTourists`, `extraProps`, `tram`, `pigeons`, `dogs`, ...). Add a helper `kitFromLevel(def, pick)` so kits are mostly data. Requires P2 (systems that can be added and removed while running) and two small additions: `NpcManager.remove(id)` with a walk-away exit, and prop despawn with a fade.

#### Front page
- `headlines.ts`: templates with slots and conditions, for example `{ when: (r) => r.count('snatch:icecream') >= 5, text: (r) => `GULL STEALS ${r.count(...)} ICE CREAMS; VENDORS DEMAND ACTION`, weight }`. Pick the lead from the best chain, then 2–4 distinct secondary ones. Pure and unit-tested with fixed run logs.
- `frontPage.ts`: a DOM newspaper for the screen; for sharing, draw the same layout to a 1200×1500 canvas (masthead, date, headlines, the photo from P3, rank stamp, URL) and export with `toBlob`. Fonts: bundled, already-licensed system stack or one bundled OFL serif (check licence, add to README credits).
- Auto-photo: when a chain reaches a new best, ask P3 for a frame from a side camera 6 m from the gull.

#### Net
Host runs the run. Snapshot gains `hv: { t, score, mult, chainT, alive: string[] }`; kit spawns and stops go as events (`{k:'kit', id, on}`), and the guest spawns the same kit from data (deterministic placement from the seed). Style tags and headlines are sent as events/at the end.

### A1. Milestones

| # | Contents | Key files | Tests | Size |
|---|---|---|---|---|
| **H0** | Prerequisites P1 (run log) and P4 (save v2) | `runLog.ts`, `save.ts` | Log append/query, save migration | S |
| **H1** | **Prototype**: `scoring.ts`, `havocHud.ts`, a "Havoc Hour" entry that runs the existing sandbox for 3 or 5 minutes with chain scoring and a plain results card. No director | `scoring.ts`, `havocHud.ts`, `tuning.havoc` | Chain window, multiplier on new kinds only, break on hit, indirect double, cap; smoke: a run starts, scores and ends | S–M |
| — | **Decision gate**: is chaining fun? Tune from playtest JSON, or stop | | | |
| **H2a** | P2 refactor (systems out of `main.ts`) | `src/systems/*` | Existing suite unchanged | M |
| **H2b** | Director + market kits (wedding, owl, Warden shift, Kalle, drone, herring stall), final bell freeze | `director.ts`, `kits.ts`, `NpcManager.remove` | Seeded schedule is reproducible; pacing rules; kits spawn and despawn cleanly (no leaked props/NPCs) | M–L |
| **H3** | Front page: headlines, rank, auto-photo (P3), share (PNG + link) | `headlines.ts`, `frontPage.ts`, `capture.ts` | Headline selection from fixed logs; rank thresholds; smoke: page renders and export yields a non-empty PNG | M |
| **H4** | Senate Square and Esplanadi kits live in one run; co-op scoring and two-gull front page; snapshot `hv` | `kits/*`, `snapshot.ts` | Co-op chain uses both gulls' kinds; online smoke: guest sees score and kits | L |
| **H5** | Daily edition (`daily.ts`), archive screen, scoops, the nest scene and collection | `daily.ts`, `nest.ts`, UI | Same date gives same seed and schedule; nest set bonuses | M |

Performance guard for H2b and H4: the director caps live actors; kits despawn beyond 150 m; record draw calls and frame time in each milestone doc.

---

## B. Co-op and to-dos

### B1. F2: two-gull carry, stack, tug of war (M–L)

**Two-gull carry**
- Data: `PropDef.twoGull?: true` and mass above `carryMax` (whole cake, salmon, bench, barrel, sledge).
- Physics: while both beaks hold it, the prop stays a **dynamic** Rapier body attached to each gull by a spring-like constraint. The gulls are not Rapier bodies (custom flight), so implement the link in our own step: each tick apply a force on the prop toward the midpoint of the two beaks, and feed a pull back into each gull's flight (`FlightInput.tow: {x,y,z}`) proportional to stretch. If stretch exceeds `tuning.coop.carryBreak` the weaker grip lets go. This avoids Rapier joints against kinematic proxies and keeps flight deterministic.
- Flight: `stepFlight` gets an optional `tow` acceleration and extra `carryMass` split between the gulls.
- Net: the host owns the prop; the guest already sends its gull state each tick. Tow on the guest's own gull is computed locally from the snapshot prop position (same pattern as the tram roof carry in M25) so flying never lags.
- Files: `src/gameplay/duoCarry.ts` (pure: stretch, forces, break rule), `interaction.ts` (second holder on a prop), `flight.ts` (`tow`).
- Tests: stretch and break maths; both holders needed to lift; drop when one lets go; snapshot round-trip of `by2`.

**Stack** (one gull on the other's back)
- A gull's back becomes a small moving perch: reuse `World.movers` (added for the tram roof) with a box that follows the lower gull; the upper gull is carried with `gull.carry()`.
- The pair counts as "tall": a `stacked` flag raises reach (grab height), weight for pressure triggers (`gullInZone` with `weight: 2`), and a combined silhouette for the disguise gag.
- Net: stacking is derived from positions on each side; no new state.

**Tug of war**
- Both beaks on the same normal prop: if pulled apart beyond a threshold it "tears" for props with `PropDef.tears?: [PropType, PropType]` (sausage chain, scarf, newspaper), otherwise it pings to the stronger pull. Against NPCs: `Npc.heldBy` plus a gull pulling starts a short tug timer the second gull can break.

### B2. F3 and F5: to-do passes (L each)
- Pure data work in `src/data/levels/*`: replace the remaining generic co-op twists and add the solo to-dos from the tables in `fun-todos.md`.
- Each new to-do needs an event. About two thirds can use existing events plus the M25 co-op events (`coop:decoy`, `coop:pass`, `coop:volley`, `coop:spotted`, `coop:rescue`). The rest need small new triggers; group them:

| New trigger or event | Used by | Where |
|---|---|---|
| `pincer` (two gulls call from opposite sides of an NPC within 2 s) | Surround Sound, Echo, Pincer Flock, Two Queues | `coopPlay.ts` |
| `propOnProp` (prop A resting on prop/landmark B) | Owl Post, Hat Trick, Fish Slap | `triggers.ts` |
| `npcSprayedNpc`, `npcsCollide` | Friendly Fire, queue knots | `vendor.ts`, `npcs.ts` |
| `rhythm` (inputs on the beat for N bars) | Duet, Backing Dancers | needs the beat clock from Esplanadi E6 |
| `noFlapDelivery`, `stillFor` (stand still N s in a zone) | Hot Delivery, Mannequin, Bookworm | `triggers.ts` |
| `heatAtEnd` | Clean Getaway | `level.ts` |

- Do it in two passes: Market Square (22 levels) first, then Senate Square and Esplanadi. Each level's new to-dos get a unit test that the level still builds and a smoke test that fires the event.
- Keep "about four to-dos per level": the level loader test enforces `main + secret <= 4`, so a new solo to-do **replaces** a weaker one rather than adding a fifth.

### B3. F4: share kit (M, plus M for clips)
| Piece | Plan |
|---|---|
| Polaroids and album | P3 capture on photo moments (`selfieClick` with the gull in frame) and on level complete; draw a polaroid frame and caption on a 2D canvas; album screen in `src/ui/album.ts`; save metadata (0.3) |
| Criminal record card | 2D canvas, 1200×630 (unfurls well): gull skin mugshot (render the gull model to a small target), awards, stats from the run log, URL |
| One-link invite | `?join=<room>` already has the pieces (room service in `server/signal`); add the query handling to open the lobby prefilled, and a "Copy invite link" button. Copy-paste codes keep working as the fallback |
| Link previews | Static Open Graph tags and a 1200×630 image in `index.html` / `public/`. No server needed |
| Replay clips (optional) | Keep a ring buffer of the last ~8 s of snapshots on the host (the snapshot format exists). "Save clip" replays them through the renderer with a cinematic camera while recording `canvas.captureStream(30)` with `MediaRecorder` to WebM, then offers download/share. Feature-detect; hide if unsupported. Audio is out of scope for v1 |

Risk: reading pixels from WebGL needs care (render to a target, flip rows, correct colour space). Budget a day for P3.

### B4. F6: photo mode, daily, awards (M)
- Photo mode: pause the sim, free camera (reuse the look input), pose selector for the gull, sky preset slider (needs G2), caption stickers, capture via P3.
- Awards (`awards.ts`, pure): computed from the run log at level end ("Butterbeak": most drops; "Human Shield": most hits taken; "Wingman": most rescues). Shown on the level-complete card and the record card.
- Daily mischief is superseded by the Havoc Hour daily edition (A, H5); build only one of them.

### B5. Controls debt (S, do early)
Taunt (T) and emotes (1–4) are keyboard only. Add touch buttons (a taunt hold button and an emote wheel in `touchControls.ts`), gamepad mapping (`gamepad.ts`: taunt on a shoulder button, emotes on the D-pad while not in a menu), and rows in the controls panel. Co-op on phones is not complete without this.

---

## C. Graphics

All of C sits behind the quality preset in `src/render/graphics.ts`. Extend `GraphicsLevel` from `'low' | 'high'` to `'low' | 'medium' | 'high'` (medium = shadows, no post), with each post effect also individually switchable in Options.

### C1. G2: sky, light, time of day (M)
- `src/render/sky.ts`: a sky dome mesh with a small gradient shader (three colour stops, sun disc and glow), replacing the flat background. One draw call.
- `src/data/skies.ts`: presets as data: `{ top, horizon, ground, sunColor, sunDir, hemiSky, hemiGround, fogColor, fogNear, fogFar, exposure, windowGlow }`. `LevelDef.night?: boolean` becomes `LevelDef.sky?: SkyId` (keep `night` as an alias for one release).
- `setNight()` in `scene.ts` generalises to `applySky(preset, blend)`, with a lerp so Havoc Hour can move from afternoon to dusk during a run.
- Clouds: 20–30 instanced low-poly blobs drifting on the wind vector (`gull/wind.ts`); cloud shadows as a scrolling low-res noise texture multiplied into the ground/roof materials via `onBeforeCompile` (no shadow-map cost).
- Lit windows at night: the facade atlas (`facadeTextures.ts`) gets an emissive twin; `windowGlow` scales `emissiveIntensity`; per-building random on/off baked into vertex colour alpha.
- Tests: preset table is complete and valid; blend is monotonic; smoke screenshots for each preset.

### C2. G3: water and ground (S–M)
- `water.ts`: move to a `ShaderMaterial` (or `onBeforeCompile`) with two summed sine waves in the vertex shader, foam where depth is small (bake a "distance to shore" value into vertex attributes from the land polygons at build time in `scripts/`), sun sparkle term, sky-colour fake reflection. Buoyancy already uses a wave function: keep both reading the same parameters in `tuning.water`.
- Ground: extend `groundTextures.ts` with runtime canvas tiles (cobbles, paving, asphalt, grass) and assign by land-use; crossings and tram rails as merged decal strips built from the OSM street lines.
- Grass tufts and flowers: one `InstancedMesh` of crossed quads per chunk, culled by distance, off on low.

### C3. G5: actor art pass (M–L)
- Replace the box-built actors in `src/world/senateFx.ts` one by one (tram, pigeons, dog, sunbathers, stage, statues). Each view keeps its constructor and `update()` signature, so gameplay is untouched.
- Prefer procedural builds in the style of `gull/model.ts`. Where a rigged animal is clearly better (dog), use a CC0 glTF (Quaternius/Kenney) through the existing loader in `world/npcModel.ts`, and record it in `data/raw/SOURCES.md` and the README.
- Gull v2 in `gull/model.ts` + `pose.ts`: eyes with blink and look-at (head tracks the lock or nearest snack), wing with feather tips. Pose stays a pure function with tests.

### C4. G4: post look (S–M, high preset only)
- `src/render/post.ts`: `EffectComposer` with `RenderPass` → outline `ShaderPass` (edge detect on depth + normals; needs a normal pre-pass or `MeshNormalMaterial` override render at half resolution) → `UnrealBloomPass` at half resolution with a high threshold → colour grade + vignette `ShaderPass` → `OutputPass`.
- Tone mapping moves from the renderer to `OutputPass` when the composer is active; verify colours match the non-post path.
- Measure on integrated graphics before committing to the outline. Fallback: inverted-hull outlines on characters only (cheap, no pass).
- Tilt-shift when gliding high: one extra blur pass, option off by default.
- Tests: composer on/off toggles without errors; smoke screenshots for high and low.

### C5. G6: UI and presentation (S–M)
- Level select as an illustrated map: DOM/SVG, three districts, level pins from `LEVELS`, stars as stickers. Controller navigation through the existing `MenuNav`.
- Level-complete card with polaroid (needs B3), stamp animation, awards (needs B4).
- Title: the live city behind the logo exists; add the logo wobble and a "Havoc Hour" entry once A/H1 exists.

---

## D. Suggested overall order

Dependencies first, then the cheapest test of the biggest idea, then things that make it look and share well.

| Step | Milestone | Depends on | Why here |
|---|---|---|---|
| 1 | B5 Controls debt (touch and gamepad taunt/emotes) | M25 | Small; co-op on phones is incomplete without it |
| 2 | H0 + **H1 Havoc prototype** | P1, P4 | Cheapest test of the highest-leverage idea; decision gate after |
| 3 | C1 Sky and light | — | Biggest visual gain; needed by photo mode and dusk in Havoc |
| 4 | H2a Refactor `main.ts` into systems | — | Unblocks kits; lowers the cost of everything after |
| 5 | H2b Director and market kits | H1 gate passed, H2a | The mode becomes real |
| 6 | B3 Share kit (polaroids, record card, invite link, previews) + H3 Front page | P3 | Shareable output; they share the capture and canvas code |
| 7 | B1 Two-gull carry and stack | M25 | Signature co-op verbs; new Havoc combo finishers |
| 8 | C3 Actor art, C2 Water and ground | — | Polish what players now see constantly |
| 9 | H4 Open Helsinki + co-op Havoc | H2b, B1 | The full mode |
| 10 | B2 To-do passes (Market, then the rest) | B1 | Story levels catch up with the new verbs |
| 11 | H5 Daily and nest, B4 photo mode and awards, C4 post look, C5 UI | earlier steps | Retention and finish |
| — | Remaining districts (Esplanadi E4–E10, Katajanokka) | — | Can be interleaved; each also yields new Havoc kits |

If the H1 gate fails (chaining is not fun even after tuning), skip steps 5, 9 and the Havoc half of 11; everything in B and C still stands on its own.

## E. Risks that apply across the plans

| Risk | Mitigation |
|---|---|
| `main.ts` refactor breaks behaviour | One system per commit; full gate after each; no behaviour changes mixed in |
| Full Playwright run is slow (about 25 minutes, software GL) | Run only the affected spec while developing; full run before each push; consider tagging slow online tests so a quick tier exists |
| Pixel capture and `MediaRecorder` differ across browsers | Feature-detect; PNG path first; clips are optional |
| Draw-call and fill-rate budget | Record numbers per milestone; post effects high-only and individually switchable; instanced detail culled by distance |
| Snapshot growth with more synced state | Send slow-changing state at a lower rate or only on change; measure bytes per snapshot in `tests/unit` |
| Scope creep across three plans | The order in D; one milestone per PR; decision gate after H1 |
