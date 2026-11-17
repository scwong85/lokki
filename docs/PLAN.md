# Lokki — Project Plan (for Claude Code)

> Read this file fully before doing any work. It is the source of truth for scope, decisions and milestones.
> Work on **one milestone at a time**. Do not build ahead of the current milestone. If something here seems wrong, propose a change in the PR description instead of silently deviating.

---

## 1. Project in one paragraph

**Lokki** ("gull" in Finnish) is a browser-based 3D game in the spirit of *Untitled Goose Game*, but you are a **seagull causing havoc in downtown Helsinki**. You complete a to-do list of funny quests (snatch ice cream from tourists at the Market Square, poop on your nemesis, swap sweets, steal a student cap…) while the city fights back with an escalating arms race of deterrents. Completing quests unlocks skills. Tone: gentle slapstick, no real harm to animals or people.

- **Purpose:** portfolio piece (public GitHub repo, playable static build).
- **Owner/dev:** one developer using Claude Code; no deadline ("develop whenever").
- **Platform:** desktop browser, **mouse + keyboard first**; phones and tablets in landscape with touch controls (M11); gamepad on the shared input layer (M12); online two-player co-op (M14).
- **Delivery:** static site (`dist/`), tested locally first, hosted later (GitHub Pages / Netlify / any static host).
- **Art direction:** **low-poly, pastel**, flat shading, soft fog, simple shadows. No art pipeline at first: everything is built from primitives and procedural animation; hand-made glTF can replace it later without gameplay changes.

---

## 2. Decisions already made (do not re-ask)

| Topic | Decision |
|---|---|
| Name | Lokki |
| Repo | Public, MIT licence, created by the user. Suggested repo name `lokki` |
| Language / tooling | TypeScript, Vite, npm, Vitest, ESLint, Playwright (optional, smoke tests) |
| Renderer | Three.js, **WebGL2 as baseline**; WebGPU only as a later optional upgrade |
| Physics | Rapier (`@dimforge/rapier3d-compat`, WASM), fixed timestep, ideally in a worker later |
| Language of UI | English only, with a few Finnish flavour words |
| Controls | Keyboard + mouse; touch on phones (M11); gamepad (M12) |
| Review flow | One branch + one PR per milestone (`mN-short-name`). User pulls and plays locally |
| Playtest feedback | Debug panel has a **"Copy tuning as JSON"** button; user pastes it back into chat/notes |
| Map data (M3) | Helsinki open 3D city model for building footprints/heights + OpenStreetMap (Overpass) for roads, parks, coastline |
| Scope cuts | None. All milestones stay |

---

## 3. Game design (reference)

### 3.1 Design pillars
1. **Movement is the toy.** Flight must feel good before anything else is built.
2. **Systemic comedy.** Objects have tags; NPCs have simple needs/senses/reactions; gags emerge from interactions (as in Untitled Goose Game).
3. **The city learns.** Deterrents work until gulls "learn" them. Difficulty is an arms race, not a number.
4. **Readable and kind.** Pastel, funny, low-stakes. No gore, no cruelty to animals, no real named people, parody brand names only.

### 3.2 Core loop
Scout from the air → pick tasks from the to-do list → act (dive, snatch, carry, poop) → **Heat** rises → NPCs/deterrents escalate → complete list → unlock harder variant + a skill.

- **UI is minimal:** no HUD clutter. A to-do list (paper-note style), a small Heat indicator, a timer only during timed quests.
- After a level is cleared, unlock **extra objectives** and a **speedrun** variant (mirrors Untitled Goose Game's post-game).

### 3.3 Flight (the key design risk)
- **Flap** to climb (costs stamina), **glide** to cover distance, **committed dive** (cannot cancel quickly) for snatches and poop shots, precise **landing**, and **walking/hopping** on the ground.
- **Perch points** and **thermals** over warm rooftops; **wind** that affects glide and poop aim.
- Camera: third-person chase camera with lag, no motion sickness (damped roll, FOV kick on dive only).
- All feel parameters live in one `tuning` object, editable live in the debug panel.

### 3.4 Heat and deterrents (arms race)
- **Heat** (0–100) rises with mischief, falls when out of sight. Thresholds escalate NPC response: tourists → vendors → the Warden → city counter-measures.
- Deterrents introduced in order: **scare lines (strings)** above stalls (collision + penalty; real Helsinki measure), spikes, fake owl/hawk kite, **nets** (gulls learn to fly under them, so they get weaker with repetition), vendor with spray bottle, the **Gull Warden** (hi-vis inspector; real city job inspired "gull guards"), and finally a gull-hunting drone.
- **Learning mechanic:** each deterrent has a `learned` counter; after N successful bypasses its effectiveness drops and the city introduces a counter-measure.
- **Hawk-eye skill** reveals hidden/transparent lines and nets (glint).

### 3.5 Nemesis
**The Gull Warden** — invented name, never a real person. Recurring across districts. Poop on the Warden is the recurring boss-style task (moving target, carries an umbrella).

### 3.6 Skills / progression
Flight (faster flap, longer glide) · Hawk-eye (spot traps) · Fat bird (carry heavier items, trays) · Mimic (crow/baby/ringtone calls to lure NPCs) · Flock call (summon a few gulls as distraction) · Disguise (act like a pigeon to slip past the Warden).

### 3.7 Districts
| District | Flavour | Signature challenge |
|---|---|---|
| **Kauppatori (Market Square)** — first and only district until M9 | Orange tents, ferries, tourists | Ice cream, fried vendace, scare lines, nets |
| Senate Square / Cathedral | Steps, wedding photos | Photobomb, poop-on-statue puzzles |
| Esplanadi | Park cafés, buskers | Busker's hat, picnic raids |
| Katajanokka / harbour | Icebreakers, cruise ships | Ferry-riding quest, fish theft |
| Railway station | Stone giants with lamps | Perch-based puzzles |
| Suomenlinna (unlock) | Fortress, tour groups | Tour-guide chaos |

Seasonal variants for later: **Vappu** (1 May student caps), autumn **herring market**, winter Christmas market.

### 3.8 Quest ideas (Kauppatori pack, M7)
- **Ice-cream snatch** against a timer (first quest, M5). Tourist shields it with their body; a distraction is needed.
- **Salmiakki swap** — replace a tourist's sweets with salty liquorice and watch the reaction.
- **Cap heist** — steal the student cap from the Havis Amanda statue before the crowd arrives (Vappu variant).
- **Blind-date wrecker** — ruin a meeting at a landmark clock.
- **Cinnamon bun ring** — get a bun past three vendors in three stages.
- **Map sabotage** — drop a tourist's map in the sea, send them to the wrong ferry.
- **Nemesis bombing run** — hit the moving Warden.
- **Multi-objective finale** — e.g. free the pastry + collapse the chair stack + poop on the Warden before the ferry horn.
- **Good-bird quests** for contrast (return a lost child's toy).

### 3.9 Real-world lore that informs design (verified)
- Gulls snatching ice cream and snacks at Helsinki's Market Square is real and famous; the Finnish verb *lokittaa* ("to gull") means pilfering.
- The city used gull guards, scare lines, spikes and a trial net; lines worked better than nets because gulls learn to fly under nets; gulls also learn from each other. This is the basis of the "city learns / gulls learn" mechanic.
- Helsinki hosts well over a thousand gull pairs; the city's own litter-free campaign uses gulls as its mascot.

---

## 4. Technical design

### 4.1 Stack and versions
- Node **>= 22** (Vite 7 needs Node >= 20.19 / 22.12), npm.
- `three`, `@types/three`, `@dimforge/rapier3d-compat`, `vite`, `typescript`, `vitest`, `eslint`, `playwright` (dev, optional).
- Build tools for data pipeline (M3): `proj4`, `fast-xml-parser` (CityGML), `earcut`, `@gltf-transform/core` + CLI. Prefer Node scripts; avoid Python.

### 4.2 Suggested repo layout
```
lokki/
├─ CLAUDE.md                 # short pointer: "@docs/PLAN.md" + working agreements
├─ docs/
│  ├─ PLAN.md                # this file
│  └─ milestones/M0.md …     # goal, exit criteria, playtest notes (user fills)
├─ data/
│  ├─ raw/                   # committed snapshots of fetched map data (+ SOURCES.md)
│  └─ generated/             # built chunks (glTF/JSON), committed or built in CI
├─ scripts/                  # build-time data pipeline (Node/TS)
├─ src/
│  ├─ core/                  # loop (fixed timestep), input, time, events, assets
│  ├─ render/                # scene, camera, materials (pastel palette), fog, shadows
│  ├─ physics/               # Rapier world, colliders, character/flight body
│  ├─ gull/                  # flight controller, procedural model + animation, tuning
│  ├─ world/                 # city chunks, landmarks, streaming/culling
│  ├─ gameplay/              # props+tags, interaction, NPC brains, heat, deterrents, quests
│  ├─ ui/                    # to-do list, heat meter, debug panel, menus
│  ├─ data/                  # quest/deterrent/skill definitions (plain TS data)
│  └─ main.ts
├─ tests/                    # vitest (logic) + playwright smoke
├─ index.html, vite.config.ts, tsconfig.json, README.md, LICENSE (MIT)
```

### 4.3 Architecture rules
- **Fixed timestep** (e.g. 60 Hz simulation, render interpolation). Simulation code must not depend on frame rate.
- **Data-driven content:** quests, deterrents, skills, props are plain typed definitions in `src/data/`. Gameplay logic reads them; no hard-coded quest logic scattered in scenes.
- **Props have tags** (`edible`, `shiny`, `noisy`, `throwable`, `fragile`, …); NPCs react to tags.
- **NPC brain:** small utility/behaviour-tree: senses (sight cone, hearing), needs/cares ("things I care about"), states (idle, eat, notice, chase, panic, recover). Each NPC type has a table of *what it cares about* and *how it reacts when that is disturbed*.
- **Tuning:** a single typed `tuning` object per system; debug panel (e.g. lil-gui or a tiny custom panel) edits it live; **"Copy tuning as JSON"** exports it; JSON can be committed as defaults.
- **Determinism where cheap:** seeded RNG for anything affecting gameplay so bugs are reproducible.
- **No secrets, no external runtime services.** The built game must run fully static and offline after load. *Exception planned for M14: online co-op may use a small signalling/relay service to connect players; single player stays offline.*

### 4.4 Performance budget (targets, validate in M3)
- 60 fps on a typical laptop with integrated graphics at 1080p.
- < ~200 draw calls; instance repeated props; merge static building meshes per chunk; frustum cull chunks; cheap blob shadows or one low-res shadow map.
- Keep memory in check; dispose geometries/materials of unloaded chunks.

### 4.5 Art direction (pastel low-poly)
- Single shared palette module (`render/palette.ts`): soft sea-blue water, cream/peach/mint/lilac buildings, terracotta roofs, warm sun, pastel sky gradient. Flat shading, no textures initially, gentle fog for depth, optional outline pass later.
- Seagull: simple chunky low-poly body built from primitives; procedural animation (wing flap/glide pose, leg tuck, head tilt, beak open).
- NPCs: capsule-ish low-poly people with colour-coded roles (tourist, vendor, busker, Warden), simple procedural walk and reaction poses.
- Keep all colours/materials in one place so the look can be changed globally.

### 4.6 Map data pipeline (M3)
- **Sources:** Helsinki 3D city model (CityGML 2.0; buildings LoD1 flat roofs and LoD2 roof shapes; terrain), downloadable from the City of Helsinki open data (WFS endpoint `https://kartta.hel.fi/3d/citydb-wfs/wfs`, use WFS version 2.0.0; CityGML tiles at `http://3d.hel.ninja/data/citygml/`); **OpenStreetMap via Overpass API** for roads, parks, coastline/water.
- **Licences/attribution:** Helsinki 3D model is **CC BY 4.0**; OSM is **ODbL**. Add a "Data credits" section in README and an in-game credits screen. Record exact sources/dates in `data/raw/SOURCES.md`.
- **Procedure:** fetch once → commit raw snapshot in `data/raw/` → `scripts/` generates stylised low-poly chunks (extruded footprints with heights, simplified roofs, ground, water, park patches) → output to `data/generated/` as compact glTF/JSON → game loads chunks at runtime. Never call Overpass/Helsinki servers at runtime.
- **Coordinates:** Helsinki data uses a Finnish local projection (confirm the exact EPSG code from the data when starting M3) — convert with `proj4` to local metres around a chosen origin (Kauppatori ≈ 60.167 N, 24.955 E). 1 unit = 1 metre throughout the game and physics.
- **Scope:** ~500 m around Kauppatori for M3. Expand later. Hand-place landmarks (Cathedral, orange tents, ferry, Havis Amanda statue) as stylised props.
- If the sandbox cannot reach the data servers, the user fetches the files locally and commits them to `data/raw/`; the pipeline must work from the committed snapshot alone.

### 4.7 Testing strategy
- **Vitest** for pure logic: flight math, heat rules, NPC state machines, quest state machines, data pipeline transforms.
- **Playwright smoke test** (if Chromium available): load page, wait for ready flag, assert canvas rendered and no console errors, take a screenshot into `tests/__screenshots__/` (not asserted pixel-exact).
- Claude cannot "feel" gameplay — rely on the user's playtest notes and exported tuning JSON.

### 4.8 Licensing and content safety
- Code: MIT. Do not copy Untitled Goose Game assets, art, sounds, or characters; no honk-gag imitation beyond a generic bird call.
- Use **parody brand names** for ice cream, pastries etc. No real brands, no real people. The Warden has an invented name.
- Audio/art from CC0 sources only (e.g. Kenney, OpenGameArt CC0) with credits in README.

---

## 5. Milestones

Sizes are rough guesses for evening-length sessions with Claude doing most of the typing (S ≈ 1, M ≈ 2–3, L ≈ 4+).
Each milestone ends with: a playable hosted/local build, a `docs/milestones/Mx.md` with exit criteria + empty "Playtest notes" section, and a short GIF for the portfolio.
**Decision gates** after M1 and M5: stop and ask the user whether to continue, change course, or cut scope.

### Status tracker
- [x] M0 Foundations
- [x] M1 Flight feel (graybox) — **gate 1 passed**
- [x] M2 The gull
- [x] M3 Helsinki blockout
- [x] M4 Interaction core
- [x] M5 First NPC + quest — **gate 2 passed**
- [x] M6 Heat and deterrents
- [x] M7 Market Square quest pack
- [x] M8 Skills and saving
- [x] M9 Portfolio polish
- [x] M10 Visual detail
- [x] M11 Input layer + mobile landscape
- [x] M12 Level framework (two-gull-ready)
- [x] M13 Market Square Act 1 (levels 1–4)
- [x] M14 Online co-op
- [x] M15 Polish pass (playtest feedback)
- [x] M16 Controls and flow polish
- [x] M17 Market Square Act 1, part 2: levels 5–8
- [x] M18 Market Square Act 2: skill levels 9–14
- [x] M19 Act 3, themed days, part 1: levels 15–18
- [x] M20 Act 3, part 2: levels 19–22, the end of the Market Square
- [x] M21 Senate Square, part 1: levels S1–S3
- [x] M22 Senate Square, part 2: levels S4–S6
- [x] M23 Senate Square, part 3: levels S7–S10, the end of the district
- [x] M24 Esplanadi, part 1: levels E1–E3
- [x] M25 Co-op synergy core + juice pass
- [x] M26 Co-op controls on touch and gamepad
- [x] M27 Havoc Hour prototype: chain scoring on the Market Square — **decision gate 3** (merged; playtest says OK, chain cue made bigger in M28)
- [x] M28 World enrichment W1: sky and light, horizon backdrop, fewer draw calls
- [x] M29 World enrichment W2: district colours, mansard roofs, courtyards, lit windows
- [x] M30 Roads (start of W3) and playtest fixes: Thermal Express dome, backwards bike
- [x] M31 Roads part 2: tram line, zebra crossings, manholes
- [x] M32 World enrichment W4 start: swaying trees, bobbing boats, glowing lamps
- [x] M34 World enrichment rest of W2: ground-floor variety, awnings, balconies, corner turrets
- [x] M35 World enrichment rest of W4: flags, steam, petals, cloud shadows
- [x] M36 World enrichment W5 start: ambient birds, the tram runs in every level
- [x] M37 World enrichment W6: landmark kit (Cathedral portico, Empire style, fountain splash)
- [ ] M38 Graphics G4: the post look (ink outline, vignette, optional tilt-shift; built on `m38-post-look`, awaiting playtest)

### M0 — Foundations (S)
**Goal:** a running skeleton you can build on.
- Vite + TypeScript project, ESLint, Vitest with one passing test, MIT `LICENSE`, `README.md` (including data-credits placeholder), `CLAUDE.md` importing `docs/PLAN.md`, this plan committed as `docs/PLAN.md`, `docs/milestones/M0.md`.
- Fixed-timestep loop decoupled from rendering; input layer (keyboard + mouse, pointer lock optional); asset/event basics.
- Capsule "gull" on a pastel ground plane, pastel sky gradient and fog, third-person follow camera.
- Debug overlay: FPS, frame time, live tuning panel with "Copy tuning as JSON".
- Playwright smoke test if Chromium is installed.
- **Exit criteria:** `npm run dev` shows the capsule moving smoothly at 60 fps; `npm run build` produces a static `dist/` that opens locally (`npm run preview`); lint and tests pass.

### M1 — Flight feel, graybox (M) — **Decision gate 1**
**Goal:** moving around is already fun.
- Flap/climb with stamina, glide, committed dive, landing, ground walking/hop, simple wind, perch detection.
- Chase camera tuned for comfort. Greybox course: rooftops, courtyard, "market" to dive into, a few targets.
- Everything tunable live; export tuning JSON.
- **Exit/evaluation:** 5 minutes of aimless play is fun; a target can be hit by diving; landing on a ledge feels fair; no motion sickness. If not fun → redesign flight before anything else.

### M2 — The gull (S–M)
- Procedural low-poly seagull with flap/glide poses, leg tuck, head tilt, beak open, blob shadow.
- Placeholder CC0 sounds (flap, screech) with a tiny audio manager.
- **Exit:** reads as a seagull, animation sells the flight.

### M3 — Helsinki blockout (L)
- Data pipeline per §4.6; pastel low-poly Kauppatori area (~500 m): buildings by height, water, ground, parks, a few hand-placed landmarks (Cathedral, orange tents, ferry).
- Static colliders from the same data; frustum culling, instancing, chunk streaming if needed.
- **Exit:** recognisably Kauppatori from the air; stable 60 fps on integrated graphics; pipeline reproducible from `data/raw/`.

### M4 — Interaction core (M)
- Beak grab / carry / drop / toss for props; prop tags; Rapier-driven props.
- Poop with aim reticle, wind drift, splat decals.
- Sandbox area with food, hats, bins to test emergent gags.
- **Exit:** player can invent gags with a few props.

### M5 — First NPC and quest (L) — **Decision gate 2**
- Tourist NPC with senses/needs/reactions (eat, walk, notice, chase, panic).
- To-do list UI, quest state machine, timer, win/lose.
- Quest 1: **ice-cream snatch** within a time limit; tourist shields it, distraction needed.
- **Exit/evaluation:** the core loop (scout → dive → snatch → escape) is fun on its own; short playtest with a friend.

### M6 — Heat and deterrents (M–L)
- Heat meter and thresholds; vendor NPC reacts.
- Scare lines (collision + penalty) → nets → the Warden; deterrent learning mechanic; minimal Hawk-eye hint.
- **Exit:** difficulty ramp feels fair and funny, not frustrating.

### M7 — Market Square quest pack (L)
- 5–6 quests from §3.8, one multi-objective finale, level-complete screen.
- **Exit:** each quest is distinct; a full level takes about 15–20 minutes.

### M8 — Skills and saving (M)
- Skill unlocks (flight, hawk-eye, carry, mimic…), localStorage save/load, replay variants (extra objectives, speedrun).

### M9 — Portfolio polish (M)
- Title screen, short in-world tutorial, audio pass, juice (particles, screen shake, camera), loading screen, options menu.
- README with architecture notes, GIFs, data credits (CC BY 4.0 Helsinki, ODbL OSM, CC0 assets); credits screen; deploy to a static host.

### M10 — Visual detail (M–L)
**Goal:** the city and its people read as detailed and charming up close, without leaving the pastel low-poly style or the performance budget (§4.4).
- **Lighting pass:** soft shadow map around the player, ambient occlusion, tone mapping, hemisphere light, optional thin outline pass; a "Graphics: low / high" option.
- **Procedural buildings:** pitched/hipped roofs on simple footprints and parapets elsewhere; runtime-generated window texture tiled per floor and bay; ground-floor shopfronts and awnings; cornices, plinths, chimneys; seeded Helsinki facade colours. More detailed hand-built landmarks (Cathedral, Uspenski, City Hall, Old Market Hall, Havis Amanda).
- **People:** CC0 rigged low-poly character models (e.g. Kenney / Quaternius) loaded as glTF with walk/idle/run animations, recoloured in code per role (tourist, vendor, Warden), seeded variation; gameplay brains unchanged. Model files and licences recorded in `data/raw/SOURCES.md` and README credits.
- **Set dressing:** instanced benches, trees, bollards, bikes, café umbrellas, boats.
- **Exit:** before/after screenshots show a clear jump in detail; still 60 fps / < ~200 draw calls on integrated graphics at 1080p (high), low preset as fallback; no gameplay regressions.

### M11 — Input layer + mobile landscape (M)
**Goal:** play in a phone or tablet browser in landscape (see `docs/spikes/mobile-landscape.md`).
- One input layer: keyboard/mouse plus virtual sources (held keys, taps, analog stick, look deltas) that touch controls (and later a gamepad) feed; gameplay code unchanged.
- Touch controls: floating stick, drag-to-look, FLAP, DIVE (slide to aim), POOP, context GRAB/DROP, TOSS, ability and hawk-eye buttons, a ☰ menu for everything else.
- Phone HUD: compact to-do note, no keyboard hints, panels that fit 340 px of height and close by tapping, touch wording in the tips, safe areas.
- Mobile defaults: low graphics preset, shorter view distance; browser quirks (no page scroll/zoom, rotate card in portrait, fullscreen + landscape lock where allowed, Add to Home Screen manifest, audio on first touch, release input when hidden).
- **Exit:** the user can play a quest start to finish on their own phone in landscape; controls feel usable; frame rate acceptable.

### M12 — Level framework, two-gull-ready (M–L)
**Goal:** turn the single Market Square level into a framework for many short levels, built from the start for two gulls and for online play. Design: `docs/design/levels-kauppatori.md` (sections 1–2, 6–8); co-op background: `docs/spikes/multiplayer.md`.
- **Levels as data** (`src/data/levels/`): cast, props, deterrents, start heat, to-dos (2–4, about 5 minutes), hidden `???` to-dos, time of day, rewards; a level loader that builds a level from its definition.
- **Level select** (a pastel postcard of the Market Square), **stars** per level (clear · all to-dos incl. hidden · par time), **per-level saves**; **skills unlock by finishing levels** instead of per quest. Today's eight-quest level stays as a **free-play sandbox**.
- **Two-gull-ready:** a list of gulls instead of one (flight, interaction, carrying and poop per gull; tourists and city defence sense the nearest or most suspicious gull; shared to-do and heat; per-player HUD bits).
- **Network-ready state:** stable IDs for gulls, props and people; gameplay changes go through events; the game state can be captured as a snapshot; one authority decides outcomes (grabs, snatches, hits). No networking yet.
- **Gamepad support** on the M11 input layer, and a **debug second gull** (gamepad, same screen, `?coop`) to test two-player logic without networking.
- **Exit:** the sandbox plays exactly as before; a stub level loads from data and can be won; a second gull on a gamepad can grab, poop and complete to-dos alongside player 1; tests cover the level loader, multi-gull targeting and snapshots.

### M13 — Market Square Act 1: levels 1–4 (L)
**Goal:** the first four real levels from `docs/design/levels-kauppatori.md`, each about 5 minutes, single player, each teaching one mechanic with a headline puzzle.
- L1 **Snack Attack** (flight and dive-snatch: "Say cheese!"), L2 **Bombs Away** (poop and wind: "The Clean Freak"), L3 **Nosy Parkers** (sight and hearing: "Bottle Service"), L4 **Butterfingers** (carry and swap: "Bait and Switch").
- New behaviours they need (selfie countdowns, the sign-polishing vendor, the food blogger, ...), hidden `???` to-dos, skill rewards per level.
- Every puzzle rated **low or medium precision** with the forgiving tools from the design doc (big zones, long telegraphed timings, instant retry, touch assist).
- **Landing assist** (from the M12 playtest: landing on the Havis Amanda statue was very hard): bigger perch zones on small targets, a gentle "landing magnet" that pulls a slow, descending gull onto a nearby perch, and a marked landing spot.
- **Exit:** each level is distinct, fun and about 5 minutes on PC and phone; the user can finish all four without frustration.

### M14 — Online co-op (L–XL)
**Goal:** two players on two devices play the M13 levels together. Design: `docs/spikes/multiplayer.md`.
- **WebRTC peer-to-peer**, host-authoritative: the host runs the game; the guest sends inputs and receives snapshots (~20 Hz) with interpolation; each player's own gull is predicted locally so flying never lags.
- **Lobby with room codes**, join/leave/disconnect handling, host-only saving, pause rules.
- **Co-op twists** for levels 1–4 (co-op variants of to-dos, co-op-only hidden to-dos, scaling for two).
- Works on PC and phone (touch controls from M11).
- **Decisions needed before starting:**
  1. **Connection approach.** Proposed: a small serverless signalling function we own (free tier; the user creates the provider account), with **copy-paste codes** as a server-free fallback; a TURN relay for networks that need one.
  2. **The offline rule** (§4.3, §6.4) is relaxed **for online multiplayer only**: single player stays fully static and offline.
- **Exit:** the user and a friend finish a level together over the internet (PC–PC and phone–PC), with no noticeable lag on their own gull and a clean reconnect after a dropped connection.

### M15 — Polish pass from playtest feedback (M)
**Goal:** fix the things the user noticed while playtesting M10 and M11 (see their playtest notes). Can be scheduled earlier or split if something becomes urgent.
- **Windows:** more variation in window spacing and styles (per building: bay width, window shapes and sizes, some blank walls and accent floors).
- **Streets feel empty:** more street life and furniture (walking pedestrians and cyclists, lamp posts, signs, café tables, parked bikes and delivery vans, planters).
- **Swimming:** hide or fully tuck the legs while swimming, so the gull floats instead of standing in the water.
- **Floating items:** visibly bob and rock on the waves (they float but look static; the bob is too small or the physics body sleeps).
- **Running tourists:** fix the arm and hand positions in the run animation (the arm overrides fight the run clip).
- **Remove the static ice cream** (confirm with the user which one at the start).
- **Menus:** Esc opens the options; the options menu gets a "Skills & gull looks" entry (K stays as a shortcut).
- **Touch camera:** faster drag-to-look (and a touch look-speed slider in Options).
- **Controller in menus** (M12 playtest): navigate the title screen, options, skills and other panels with the D-pad/stick, A to confirm, B to go back.
- **Controls screen** (M12 playtest): show the controller mapping (and keyboard and touch) in the options, including which buttons trigger the skills.
- **Touch buttons:** better default positions for Flap, Dive, Poop, Grab, and a way to adjust them (layout presets or drag-to-arrange, left-handed mirror).
- **Exit:** the user re-checks each item on PC and phone.

### M16 — Controls and flow polish (S–M)
From the M14/M15 playtests: host picks the level, target lock (Tab), quicker air turns, ground jump, fairer "unseen" snatch. Details: `docs/milestones/M16.md`.

### M17 — Market Square Act 1, part 2: levels 5–8 (L)
**Goal:** finish Act 1 (design: `docs/design/levels-kauppatori.md`, Act 1). L5 **The City Strikes Back** ("Spray Tan": the vendor's spray soaks the rich tourist), L6 **Owl Be Back** ("Borrowed Authority": the plastic owl scares the bread granny), L7 **The Warden** ("Lunch Break": his umbrella is down at lunch), L8 **Harbour Day** ("Message in a Bottle": the current carries it to the ferry before the horn). Rewards: Hawk-eye, Fat bird, Disguise, Flock call. Details: `docs/milestones/M17.md`.

### M18 — Market Square Act 2: skill levels 9–14 (L)
Each level lends you the skill it teaches (Mimic, Hawk-eye, Fat bird, Flock call, Disguise, Strong wings + thermals) and builds a puzzle around it. Details: `docs/milestones/M18.md`.

### M19 — Act 3, themed days, part 1: levels 15–18 (M–L)
Vappu Eve, Herring Market, Wedding Bells, Frozen Harbour. Details: `docs/milestones/M19.md`.

### M20 — Act 3, part 2: levels 19–22 (L)
The Rival (Kalle), Night Market (dusk, sleeping vendors), The Drone, and the Great Kauppatori Heist. Details: `docs/milestones/M20.md`.

### M21 — Senate Square, part 1: S1–S3 (M–L)
Cheese Run, Say Pigeon!, Ding Dong, plus the Cathedral steps and the bell system. Details: `docs/milestones/M21.md`.

### M22 — Senate Square, part 2: S4–S6 (M–L)
Tram Surfing, Turf War, The Emperor's New Look, plus trams (a moving roof) and the Pigeon Gang. Details: `docs/milestones/M22.md`.

### M23 — Senate Square, part 3: S7–S10 (M–L)
Concert Night, Christmas Market, The Library Rule, and the finale The Key to the City. Details: `docs/milestones/M23.md`.

### M24 — Esplanadi, part 1: E1–E3 (M–L)
Don't Block My Sun (shadows wake sunbathers), Who's a Good Boy? (dogs and fetch), Splash Zone (sprinklers), plus the Cloud Glide skill. Details: `docs/milestones/M24.md`.

### M25 — Co-op synergy core + juice pass (M–L)
Taunt (decoy and thief), mid-air passes, spotter and bomber, rescue, emotes; district actors synced to online guests; squash and stretch, emotes over heads, particles, slow motion. Details: `docs/milestones/M25.md`.

### M26 — Co-op controls on touch and gamepad (S)
Taunt and emote buttons for phones, stick clicks on the controller. Details: `docs/milestones/M26.md`.

### M27 — Havoc Hour prototype (S–M) — **Decision gate 3**
A three-minute chaos run with chain scoring and a results card. Details: `docs/milestones/M27.md`. Plan: `docs/design/havoc-hour.md`.

### M28 — World enrichment W1: sky and light (M)
Sky dome with sun and clouds, sky presets as level data, tinted lighting, a horizon backdrop, one mesh per building chunk (about 30 fewer draw calls), a render-budget test; plus the turning and Havoc cue fixes. Details: `docs/milestones/M28.md`. Plan: `docs/design/world-enrichment.md`.

### M29 — World enrichment W2: roofs and colour (M)
District palettes, mansard roofs with landing slabs, courtyard yards, lit windows at dusk and night. Details: `docs/milestones/M29.md`.

### M30 — Roads and playtest fixes (S–M)
Streets drawn as roads (asphalt, pavements, kerbs, dashed centre lines); the Thermal Express dome landing and the backwards bike fixed. Details: `docs/milestones/M30.md`.

### M31 — Roads, part 2 (S)
Tram rails and sleepers on Senate Square, zebra crossings and manholes. Details: `docs/milestones/M31.md`.

### M32 — World enrichment W4 (start): things that move (S)
Trees sway, boats bob, street lamps glow at dusk, all in shaders or one hidden-by-day mesh. Details: `docs/milestones/M32.md`.

### M34 — World enrichment, rest of W2 (M)
Doors, gateways and café fronts on ground floors, awnings, balconies, corner turrets. Details: `docs/milestones/M34.md`.

### M35 — World enrichment, rest of W4 (S–M)
Flags that flutter, steam over the stalls, blossom in the park, drifting cloud shadows. Details: `docs/milestones/M35.md`.

### M36 — World enrichment W5 (start): a busier city (S)
Circling birds, and the Senate Square tram runs in every level. Details: `docs/milestones/M36.md`.

### M37 — World enrichment W6: landmark kit (S)
Cathedral portico, Empire-style buildings, fountain splash. Details: `docs/milestones/M37.md`.

### M38 — Graphics G4: the post look (S)
Ink outline, vignette, saturation and optional tilt-shift on the high preset, with an Options toggle. Details: `docs/milestones/M38.md`.

### After M38 (backlog)
 World enrichment rest of W2, then W3 to W6 (`docs/design/world-enrichment.md`): streets and squares, things that move, a busier city, landmark kit.
 Plans: `docs/design/fun-todos.md` (F2–F6), `docs/design/graphics-refresh.md` (G2–G6).
 Esplanadi E4–E10 (`docs/design/levels-esplanadi.md`), Katajanokka (`docs/design/levels-katajanokka.md`), each level designed with a co-op variant; the shared systems they need (moving platforms, NPC schedules, Kalle the rival gull, the drone, seasons); local split-screen co-op (optional); optional WebGPU renderer.

---

## 6. Working agreements for Claude Code

1. **Start each session by reading this file and the latest `docs/milestones/*.md`.** Update the status tracker (§5) when a milestone is complete.
2. **One milestone per branch/PR**, named `mN-short-name`. PR description: what was built, how to run it, how it maps to the exit criteria, known issues, and a checklist for the user's playtest.
3. **Do not implement future milestones early.** Small refactors that unblock the current milestone are fine; note them in the PR.
4. **Keep it static and offline-capable.** No runtime calls to third-party servers; fonts and assets bundled. (Online co-op in M14 is the one planned exception, once the user approves the connection service.)
5. **Ask before** adding a heavy dependency, changing the stack, or cutting scope. Cheap, reversible choices: decide and note them in the PR.
6. **Every feel parameter goes in the tuning object** and the debug panel. Never bury magic numbers in logic.
7. **Write tests for pure logic**; keep rendering code thin and logic testable.
8. **Commit style:** small, descriptive commits; never commit large binaries without a note in `data/raw/SOURCES.md` or the README.
9. **Attribution:** whenever data or assets are added, update README credits and `data/raw/SOURCES.md` in the same PR.
10. **If blocked** (network allowlist, missing tool), say exactly what is blocked and what the user needs to do; continue with what is possible.

---

## 7. Environment

- Claude Code cloud environment. Setup script: `setup-seagull-dev.sh` (installs Node 22 if missing, global `typescript` and `@gltf-transform/cli`, optional Playwright + Chromium, then project deps if `package.json` exists). Env switches: `INSTALL_PLAYWRIGHT=0`, `SKIP_PROJECT_DEPS=1`.
- **Domain allowlist** (required for M0: first four):
  - `registry.npmjs.org`, `github.com`, `codeload.github.com`, `objects.githubusercontent.com`
  - Fallbacks/optional: `raw.githubusercontent.com`, `nodejs.org`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `archive.ubuntu.com`, `security.ubuntu.com`
  - M3 map data: `overpass-api.de`, `kartta.hel.fi`, `3d.hel.ninja`
  - M9 assets: `kenney.nl`, `opengameart.org`
  - (Exact Playwright/Ubuntu hostnames are unverified; if a download fails, the log names the blocked host.)

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Flight is not fun | Build and tune it first (M1) with decision gate; redesign before content |
| Animation/art cost | Procedural primitives first; swap in models only if time allows |
| City data pipeline eats time | Small area (~500 m), committed raw snapshot, stylised simplification, fallback to OSM-only |
| Performance on integrated GPUs | Budgets in §4.4, measure in M3, instancing/merging/culling |
| Systemic NPC bugs | Simple brains, seeded RNG, state-machine unit tests |
| Crowded genre (other seagull games exist) | Differentiate with Helsinki setting, learning-deterrents arms race, instant browser play |
| IP/legal | Parody brands, no Goose Game assets, CC0 audio/art only, credits for CC BY / ODbL data |

---

## 9. Sources (research basis)

- City of Helsinki 3D data: https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d and https://avoindata.fi/data/en/dataset/helsingin-3d-kaupunkimalli
- Yle on Kauppatori gull measures: https://yle.fi/a/3-5372754
- Verkkouutiset on lines vs nets: https://www.verkkouutiset.fi/a/hu-torin-lokkiongelmaan-loytyi-tehokas-keino-olivat-todella-aggressiivisia/
- MTV Uutiset on gulls learning deterrents: https://www.mtvuutiset.fi/artikkeli/lokkien-harski-hyokkays-kesken-haastattelun-tallentui-videolle-katso-miten-toimittajan-jaatelo-lahtee-parempiin-suihin/7844568
- MyHelsinki on "lokittaa": https://edit.myhelsinki.fi/de/node/61459
- Untitled Goose Game design: https://gamedeveloper.com/design/behind-the-honk-an-i-untitled-goose-game-i-q-a and https://nintendowire.com/news/2019/09/20/review-untitled-goose-game/
- Three.js vs PlayCanvas (WebGPU/WebGL2): https://app.cinevva.com/guides/playcanvas-vs-threejs
- Rapier + Three.js: https://abratabia.com/threejs/physics.php
- Competitors: Goeland (https://www.gamingonlinux.com/2024/10/goeland-is-like-untitled-goose-game-but-youre-a-seagull-in-a-town-thats-a-bit-too-peaceful/page=1/), Glutton Gull (https://freshlyforged.itch.io/glutton-gull), Seagull Simulator (https://naves-02.itch.io/seagull-simulator)
