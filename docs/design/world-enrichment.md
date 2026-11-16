# World enrichment: research and strategy

Status: **proposal**, nothing built. Scope: how to make the city itself (buildings, roads and ground, ambient life, atmosphere) look richer and more alive, inside the pastel low-poly style (PLAN §4.5) and the budget (§4.4: 60 fps on integrated graphics at 1080p, under about 200 draw calls, a working low preset for phones). Static and offline, CC0 assets only, Three.js only.

This goes deeper on the world side of `docs/design/graphics-refresh.md` (its G2 sky, G3 water and ground, G5 landmarks). It does not repeat G1 (juice, built in M25), G4 (post-processing) or G6 (UI).

How to read the claims: "from the code" means I read it in this repo. "Sourced" means a page I opened or a search summary of it (section 6 says which). "Judgement" means my own opinion, not measured. I did not run the game, the build or the tests, so there are no new measurements here.

## 1. Where the world stands today

From the code and `data/generated/kauppatori.json`:

- **Data.** A 1.12 km square around Kauppatori: 397 buildings (footprint rings plus a height of 4 to 36 m derived from floor counts), 4 land polygons, 113 street polygons, 20 parks, 19 hand-placed landmarks. All from City of Helsinki open data. **There is no OpenStreetMap data in the repo** (`data/raw/SOURCES.md`: Overpass was unreachable in M3). The street layer is whole street **areas** with names (814 vertices in total), not centrelines, so there is no information about lanes, pavements, crossings or tram tracks.
- **Buildings** (`src/world/city.ts`, `facade.ts`, `src/render/facadeTextures.ts`). Extruded footprints merged per 160 m chunk into two meshes (upper floors with a 64x384 window atlas of six styles, ground floors with one 64x64 shopfront tile). Wall colour is one of eight pastels picked by a hash of the building id, so colour has no relation to place or era. Each building has its own bay width, a main and an accent window style, and some blank walls. Flat-roofed buildings of 6 m or more get a cornice and a parapet. Baked ambient occlusion is one gradient on the ground floor only.
- **Roofs.** Pitched (gable or hip, with dormers and a chimney) only for near-rectangular four-corner footprints under some size limits, and then only 70% of those. Every other footprint, which includes all the big courtyard blocks that make up most of central Helsinki, has a flat painted roof with a few boxes, chimney stacks, skylights and the odd antenna. Roof collision matches the drawing and ridges are perches.
- **Ground** (`flatLayer` in `city.ts`, `src/render/groundTextures.ts`). Three flat layers separated by polygon offset: land (cobbles, including under buildings and in courtyards), streets (speckled asphalt, kerb to kerb including the pavements), parks (grass). Each is one 256 px tile repeated in world space. No kerbs, markings, rails, crossings or manholes. Each landmark "mat" is its own mesh and draw call.
- **Set dressing** (`dressingPlan.ts`, `dressing.ts`). Eleven instanced types, one draw call each: 260 trees (one model: two icosahedra on a trunk, three near-white tints), benches, bollards, bikes, umbrellas, 14 boats, lamps, planters, café tables, signs, vans. Nothing moves: no tree sway, boats do not bob. Market tents are one instanced mesh with a static pennant.
- **Street life** (`src/world/streetLife.ts`). Wandering pedestrians (the CC0 rigged human) and cyclists (six meshes each), moved and drawn only within `street.cull` (150 m). Half as many on low.
- **Landmarks** (`landmarks.ts`). Stacks of extruded prisms. The Cathedral is stacked octagons with a green dome and gold top; Uspenski is a restyled registry building with onion domes. City Hall, the Presidential Palace and the Old Market Hall are ordinary buildings (M10 could not match them to footprints).
- **Water** (`src/render/water.ts`). One flat 8 km plane; waves and sparkles are colour changes in the fragment shader; a foam strip and a stone quay edge are built from the land outline.
- **Sky and light** (`scene.ts`, `graphics.ts`). The sky is a two-stop gradient set as `scene.background`. A plain texture background is drawn as a screen-aligned image, so the gradient does not move when the camera pitches: there is no real horizon, sun or cloud. Linear fog from 150 to 700 m in the horizon colour, camera far plane 650 m. One white-and-cream hemisphere light and one sun with a fixed direction; one 2048 shadow map in a 140 m box on high. Night is a boolean (`setNight`): darker lights and another gradient, no lit windows or lamps.
- **Map edge.** Buildings stop at 560 m but the land polygons run on to 1300 m, so from the air the city ends in bare cobbles that the fog only partly hides.
- **Budget.** The last recorded numbers are from M10: 178 to 190 draw calls at the market on high, 127 to 139 on low, about 160k triangles. Street life (M15), the Senate Square actors (M21 to M24) and particles and emotes (M25) came after that and nobody has re-measured. **Assume there is no spare draw-call budget on high until measured.** On high, every shadow-casting mesh is drawn twice (once into the shadow map).

Where the cheap wins are (judgement):

1. Anything static can be added to the existing chunk buffers for **zero** new draw calls: roofs, cornices, awnings, turrets, kerbs, decals. The budget pressure is on moving and instanced things, not on static detail.
2. The gull sees roofs more than facades, and roofs are the plainest part of the city.
3. Colour by district costs nothing and would make the place recognisable.
4. The sky fills a third of most frames and is a fixed gradient.
5. Nothing in the world sways, bobs or flaps except people.

## 2. Findings by area

Cost columns: **calls** is the change in draw calls on the high preset (shadow pass included where it applies); **effort** is S (under one session), M (two or three), L (four or more). All costs are estimates, not measurements.

### 2.1 Buildings

| Technique | What and why | Calls / effort | Where it fits |
|---|---|---|---|
| **District palettes** | Pick wall, trim and roof colours from a palette chosen by where the building stands, not a global hash. Senate Square: pale yellow and cream with white trim (Engel's Empire style). Esplanadi: cream, stone and pale grey. Katajanokka: Jugend earth tones (ochre, salmon, grey-green) over a granite-grey plinth. Market front: pale blue, pale yellow, white. Keep the pastel saturation. Biggest gain in "this is Helsinki" for the least work. | 0 / S | `FACADES` in `facade.ts` becomes `palettes[district]`; district from a few hand-drawn zones in `data/landmarks.json` or by street name. Build script could bake a `d` field per building. |
| **Inset roofs for irregular footprints** | For footprints that are not rectangles, shrink the roof outline inwards by 2 to 3 m and raise it 1.5 to 2.5 m, giving a sloped skirt around a flat top (a low mansard). Works with courtyard holes. Fall back to today's flat roof when the inset fails. Turns the flat "lids" on the big blocks into the pitched sheet-metal roofs the real city has. | 0 / M | A pure `insetRing()` plus `mansardRoof()` in `facade.ts` with Vitest tests; drawn in `building()` in `city.ts`; one extra collision slab so landing still matches. A full straight-skeleton roof is not worth the effort (judgement). |
| **Roof colour and seams** | Roof colours from the district palette (dark red, green, grey, near-black tin; a few patina-green copper roofs on landmarks). A "standing seam" stripe row in the atlas so roofs are not blank from above. | 0 / S | New atlas row; UVs on roof triangles in `city.ts`. |
| **More roof clutter** | Dormers on mansard skirts, roof hatches, walkways and ladders, vent cowls, flagpoles, an occasional roof terrace with planters. Context rules: clutter near edges facing streets, none on tiny roofs. | 0 / S to M | Extends the clutter block in `building()`; small items draw-only (`triR`) so the physics mesh stays light. |
| **Courtyards** | Footprints with holes have inner yards that today show cobbles. Fill each hole with a yard surface (gravel or grass tint) and drop a tree, bike shed or bins. Very visible from the air. | 0 / S | Hole rings are already in `b.rings`; a flat polygon into the ground buffer plus `planDressing` candidates. |
| **Bigger atlas: doors and ground-floor variety** | Add rows: door bay, arched gateway, café front with a striped blind, plain rusticated plinth with small windows, bank-like tall windows. Split each ground-floor wall into at most three runs (side, centre, side) so the centre can take a door or gateway. Removes the "one shop tile everywhere" look. | 0 / M | `facadeTextures.ts` (rows), `windowPlan` grows a `groundPlan`, `wallBand` reused for the ground floor. See 2.5 on atlas limits. |
| **Bay rhythm strips** | A row may be several bays wide (for example 256 px: window, window, balcony, window), repeated along the wall. Gives rhythm without one quad per bay. | 0 / S | Same atlas; `u` divided by the strip length. |
| **Protruding detail, sparingly** | Real geometry only where the silhouette benefits: bay windows and balconies on some long walls, corner turrets with a cone or small dome on convex street corners in the Jugend zone, pilasters and a pediment on Empire-zone long walls, awnings and hanging signs over some shop bays. Limit the small items to buildings within about 250 m of play areas. | 0 / M | All merged into the chunk `upper` buffer in `city.ts`; placement rules pure in `facade.ts`. Signs use drawn icons (fish, cup, pretzel), not words, which also avoids brand questions. |
| **Richer baked AO and gradients** | Darken under cornices and awnings, at inside corners and on courtyard walls; lighten the top of walls slightly; tint the wall foot towards the ground colour (fake bounce light) instead of towards black. Soft and free. | 0 / S | `wallQuad` and `wallBand` already take per-vertex colours; `render.ao` stays the dial, with one or two more tuning values. |
| **Contact shadow strip** | A thin dark, soft-edged strip on the ground along every footprint edge, so buildings sit on the ground instead of floating on it. | +1 (one merged, multiply-blended mesh, no shadow casting) / S | Built from footprints next to `shoreStrips`-style code; could instead be baked into the ground colour if the ground is re-tessellated. |
| **Lit windows at dusk and night** | An emissive map with the same layout as the atlas (glass areas warm, the rest black), with strength driven by the sky preset. A hash of the bay and floor in the shader lights only some windows. Cosy, and makes the night levels look designed. | 0 / S to M | `upperMat.emissiveMap` plus a small `onBeforeCompile` patch (the pattern `water.ts` already uses). This is the "night that glows" item of G2. |

What central Helsinki looks like, for the palettes (see section 6 for what is sourced):

- **Senate Square** is a planned Empire (late neoclassical) ensemble by Carl Ludvig Engel, built 1818 to 1852: the white Cathedral as focal point, with the Government Palace and the University main building as a matching pair on either side (sourced). Their pale yellow walls with white columns and trim, and the Cathedral's green domes with gold stars, are from general knowledge.
- **Katajanokka** has a district of Jugend (Art Nouveau) blocks from 1901 to 1910 with asymmetric facades, rounded towers, decorated gables and small turrets (sourced). Plastered walls in earth colours over rough granite ground floors are general knowledge.
- **Market front and Esplanadi**: a pale blue City Hall, the pale yellow Presidential Palace, the striped brick Old Market Hall, linden avenues and gravel paths on Esplanadi, granite setts on the squares. All general knowledge, not verified this session; check against photos before fixing colours.

### 2.2 Roads and ground

The brief assumed OSM street data. We do not have it, which shapes this section: lanes, crossings and tracks cannot be read from data today. Three ways forward, in order of preference:

1. **Derive what we can from the street polygons** (no new data): pavements and kerbs by insetting, squares by shape.
2. **Hand-author the few lines that matter** (tram tracks, a dozen crossings) in `data/landmarks.json`, as the tram already does with its straight track (`src/gameplay/tram.ts`).
3. **Fetch more data later** if wanted: OSM via Overpass for centrelines, tram rails and crossings (ODbL, needs attribution and a credits update; `overpass-api.de` is on the PLAN §7 allowlist but was unreachable in M3), or further City of Helsinki layers. I believe the city publishes a street-tree register on the same WFS server, which would give real tree positions for Esplanadi, but I could not check that this session.

| Technique | What and why | Calls / effort | Where it fits |
|---|---|---|---|
| **Pavement and carriageway split** | Inset each street polygon by about 2.5 m: the outer band is paving slabs, the inner part asphalt, with a kerb between (a 10 cm step drawn as a thin vertical strip). Polygons that are squares (compact shape or named "-tori") stay fully cobbled. Streets stop being one grey sheet. | 0 to +1 / M | Reuses `insetRing()` from the roof work; build in `scripts/build-world.ts` or at load in `city.ts`. Keep the kerb visual only so NPC walking and prop physics do not change. |
| **Surface variety** | More runtime canvas tiles: granite setts in a running bond for squares, larger slabs for pavements, sand-coloured gravel for park paths, smoother asphalt. A second, large-scale noise multiply hides the tile repeat on big squares. | 0 / S | `groundTextures.ts`; noise multiply via `onBeforeCompile` on the ground materials. |
| **One ground mesh** | Merge land, streets, parks and all landmark mats into one or two meshes. The mats alone are one call each today. | saves a few / S | `flatLayer` callers in `buildCity()`. Different repeating tiles in one mesh needs an array texture (WebGL2 `sampler2DArray`) and a per-vertex layer number; otherwise keep three meshes and just merge the mats. |
| **Painted decals** | Zebra crossings, stop lines, bike-lane paint, parking bays, manhole covers, drain grates, as flat quads and discs in one merged opaque mesh just above the ground. Cheap detail right where the camera is when walking. | +1 / S to M | New `src/world/groundDecals.ts` with a pure placement plan like `dressingPlan.ts`; needs hand-authored or derived positions (crossings where street polygons meet). |
| **Tram rails and wires** | Two thin dark strips in a paler concrete bed along hand-authored polylines; overhead wire as one `LineSegments` object with instanced poles. Trams are one of the most "Helsinki" things there is. | +2 / S to M | Polylines in `data/landmarks.json`; the existing Senate Square tram track gets rails for free. Wires must not look like scare lines (see open questions). |
| **Quay detail** | A stone wall face below the quay edge, mooring rings, ladders, tyre fenders, steps down to the water. The harbour edge is on screen constantly. | 0 to +1 / S | Extends `shoreStrips` in `water.ts` and the bollard pass in `dressingPlan.ts`. |
| **Puddles** | Flat patches in the sky colour, slightly transparent, after sprinklers or on "rainy" presets. | +1 / S | Same decal system; already listed in G3. |

### 2.3 Ambient life

| Technique | What and why | Calls / effort | Where it fits |
|---|---|---|---|
| **Tree variety and sway** | Three or four silhouettes (round linden, slim birch with a white trunk, broad maple, a few spruces) and stronger tint variation. Wind sway in the vertex shader: sideways offset growing with height, phase from the instance position. | +2 to +6 (new types, each also in the shadow pass) / S to M | `model('tree')` and `TINTS` in `dressing.ts`; shader patch as in `water.ts`. Keep the sway small so the shadow and the perch collision still agree, or give the shadow pass the same patch via `customDepthMaterial`. |
| **Seasons through tint** | Per-level tree and grass palettes: spring blossom, summer, autumn (herring market), bare branches for winter levels. | 0 / S | Instance colours in `dressing.ts`, a field on `LevelDef`. |
| **Grass tufts and flower beds** | Small flat-shaded tufts (three-blade cones, not alpha-tested cards, which fight the style and cost overdraw) and blobs of flowers, instanced, in parks near play areas only. | +1 to +2, no shadows / S | New types in `dressingPlan.ts` with their own limits; off on low. |
| **Bobbing boats and far ships** | Boats rock and rise with the same wave function as floating props. A ferry crossing slowly in the distance, small sails far out, a cruise ship silhouette at Katajanokka. | 0 to +2 / S | 14 matrix updates per frame in `dressing.ts` (or a shader patch); far ships as one merged mesh moved on a loop. |
| **Flags and bunting** | Cloth as a subdivided strip waved by a sine in the vertex shader, pinned at the pole edge. Finnish flags on the quay, pennants on the tents (the tent pennant is static today), bunting and string lights between stalls. | +1 for all flags (one merged mesh) / S | New `src/world/flags.ts`; the tent pennant moves there. |
| **Steam and smoke** | Slow emitters on food stalls, the coffee cart, the ferry funnel and, in winter levels, chimneys. | 0 (reuses the M25 particle pool) / S | `src/render/puffs.ts` plus a list of emitter spots from landmarks; hard cap in tuning. |
| **Weather particles** | Generalise the snow cloud into presets: snow, lime blossom, autumn leaves. | 0 (replaces `Snow`) / S | `src/render/snow.ts` becomes a small `weather.ts`. |
| **Ambient birds** | Distant gulls circling over the harbour and roofs, sparrows that hop near café tables and scatter when you land. One instanced mesh with the wing flap done in the vertex shader. | +1 to +2 / M | New `src/render/ambientBirds.ts`; flight paths pure and seeded. Must look different from the gameplay Pigeon Gang and the Flock call decoys. |
| **Lamp glow at dusk** | Lamps are already instanced. At dusk and night: bright bulbs, an additive glow quad per lamp, and soft light pools on the ground. No real lights. | +2 in dusk and night levels only / S | `dressing.ts` (bulb colour), one instanced glow mesh, one merged additive decal mesh. |
| **Static crowd poses** | Bake a few poses of the rigged human (sitting, queuing, leaning on a rail) into plain geometry at load, then instance them on benches, at stalls and at tram stops. Fills the squares without skinned meshes or brains. | +1 per pose / M | `npcModel.ts` gets a `bakePose()`; placement in `dressingPlan.ts`. Cosmetic only, like street life. |
| **Ambient trams** | One or two trams on a hand-authored loop, stopping at stops, bell on departure. | +1 to +2 / M | Reuses `Tram` logic from `src/gameplay/tram.ts` with a polyline; `TramView` in `senateFx.ts` (due an art pass in G5). |
| **Cars** | A few cars on carriageways. | +1 / M to L | Needs lanes we do not have and they would drive through pedestrians. Lowest value for the effort (judgement); parked vans, cyclists and trams carry the street. |
| **Ambient sound zones** | Looping beds tied to places and cross-faded by distance: market chatter, water lapping and rigging, park birdsong, tram squeal, a distant ferry horn, cathedral bells. Sound sells "alive" as much as anything drawn. | 0 / S to M | The existing audio manager; CC0 recordings only, recorded in `data/raw/SOURCES.md`. |

### 2.4 Atmosphere and light

| Technique | What and why | Calls / effort | Where it fits |
|---|---|---|---|
| **Real sky dome** | A large inside-out sphere that follows the camera, with a small shader: three pastel stops by elevation, a soft sun disc and glow. Fixes the screen-fixed gradient and gives a horizon. A custom shader is better here than the bundled `Sky.js`, which is physically based and hard to keep pastel (judgement). | +1, replaces the background / S | `createScene()` in `scene.ts`. |
| **Sky presets as data** | Morning, noon, golden hour, dusk, night: sky stops, fog colour, sun colour and direction, hemisphere colours, emissive strength. Already planned in G2 (`LevelDef.sky`). | 0 / S | `setNight` grows into `setSky(preset)`; values in `tuning.render` or a `data/skies.ts`. |
| **Tinted hemisphere light (coloured shadows)** | Sky colour from above, warm ground colour from below, instead of white and cream. Shadowed sides go lilac-blue instead of grey. This is most of the "fake global illumination" look for free. | 0 / S | `hemi` in `scene.ts` and `graphics.ts`. |
| **Height fog** | Fog that is thicker low and far, so the distance melts into a pastel haze while roofs stay clear. | 0 / S to M | Patch `THREE.ShaderChunk` fog chunks once before materials compile, so every built-in material gets it; factors in `tuning.render`. |
| **Horizon backdrop** | A ring of plain, fog-tinted block silhouettes and low islands beyond the 560 m edge, so the city does not end in bare ground when seen from the air. | +1 / S to M | New merged mesh in `city.ts`, seeded, no collision. |
| **Cloud shadows** | Slow soft patches of shade drifting over ground and roofs: a scrolling noise sampled at world position and multiplied into the lighting. Makes the whole scene feel in motion. G2 describes this as a texture on the light; as far as I know Three.js only supports that for spot lights, so shader injection is the route (general knowledge). | 0 / M | One shared helper that patches the ground and building materials; off on low. |
| **Low-poly clouds** | A handful of instanced flat-shaded cloud shapes drifting on the dome. | +1 / S | In G2 already. |
| **Water shore mask** | Draw the land polygons to a small canvas once, blur it, and use it in the water shader as a distance-to-shore value: paler shallow water, animated foam bands, calmer water in the harbour. | 0 / S to M | `water.ts`; complements G3's water list. |
| **Colour grading and outline** | Left to G4. Two cost notes for that milestone: a normal-based outline needs a second render of the scene (roughly doubling draw calls), so prefer a depth-only edge pass or inverted-hull outlines on characters and props only; and the lighting presets above already do much of what a grade would (judgement). | n/a | `graphics-refresh.md` G4. |

### 2.5 Budget techniques

- **Measure first, and automate it.** Add fixed camera views to the Playwright smoke test that record `renderer.info` draw calls and triangles for high and low (the six M10 views), so each milestone has a before and after. Nothing here should start without a fresh baseline.
- **Rule of thumb for where things go.** Static and unique: merge into the chunk buffers (zero calls). Static and repeated: `InstancedMesh` (one call per type). Moving but simple: vertex-shader motion on a merged or instanced mesh. Only truly independent actors get their own meshes.
- **Reclaim calls before spending them** (judgement, to be confirmed by measuring):
  - Put the shopfront tile into the window atlas as one more row and merge each chunk's `ground` and `upper` meshes into one. That halves building draw calls in both the main and the shadow pass.
  - Merge landmark mats into the ground mesh.
  - Cyclists are six meshes each; merge to two.
  - Ripple rings, ping rings and decoy gulls are separate meshes; pool them as instanced meshes.
- **Shadow casters are the hidden cost.** On high, each caster is drawn twice. New small detail should not cast; the contact strip and baked AO stand in. Only trees, buildings, tents, boats and large moving things need real shadows.
- **`BatchedMesh`** (in core Three.js) draws many different geometries that share one material in one call, with per-object frustum culling, sorting, per-object colour and visibility (sourced from the Three.js docs). It could turn the eleven dressing types into one or two calls. Caveats: the installed Three.js falls back to one draw per object when the browser lacks `WEBGL_multi_draw` (read in `node_modules/three/src/renderers/WebGLRenderer.js`), and forum reports of its real-world speed are mixed (search summaries only). Treat it as an optimisation to try and measure, not something to depend on. `InstancedMesh` stays the default for one repeated shape.
- **Atlas limits.** The window atlas is one column because it repeats horizontally per bay; cells can only be added as rows (rows may be several bays wide). Mipmaps blur neighbouring rows together, which the white margins hide today. If the atlas outgrows this, move to an array texture (WebGL2), which repeats cleanly per layer.
- **Detail by distance, decided at build time.** Small items (awnings, signs, tufts, manholes) only within a radius of play areas, as `planDressing` already does with "nearest the market wins". This is simpler and more predictable than runtime LOD. At this map size impostors are probably not needed (judgement).
- **Low preset.** Merged static detail costs no calls, so phones keep it. Low turns off: grass tufts, ambient birds, cloud shadows, glow quads; halves weather particles and ambient vehicles. Triangle count needs watching on phones more than calls; suggest recording it and agreeing a ceiling after the baseline.

### 2.6 CC0 asset sources

| Pack | Licence | Use here |
|---|---|---|
| Kenney, City Kit (Roads), 90 files, v2.x adds road signs and traffic lights | CC0, confirmed on kenney.nl | Reference for road furniture; possibly signs and traffic lights |
| Kenney, City Kit (Commercial), 50 files | CC0, confirmed on kenney.nl | Probably not: modern generic blocks, not Helsinki |
| Kenney, Nature Kit, 330 files | CC0, confirmed on kenney.nl | Tree and rock shapes if the procedural ones fall short |
| Kenney, Watercraft Kit, 45 files (sails and flags separate) | CC0, confirmed on kenney.nl | Boats and far ships |
| Quaternius packs (nature, animals, vehicles) | CC0 for the pack already used (per `data/raw/SOURCES.md`); the site was blocked this session, so other packs are **unverified** | Pigeons, dogs, vehicles in G5 |

Recommendation (judgement): keep buildings, roads and ground procedural. Kit buildings would not match the real footprints or the Helsinki look, and kit models bring their own colours that would need remapping to `palette.ts`. Use kits only for small self-contained props, record each in `data/raw/SOURCES.md` and the README, and confirm the licence on the download page at the time.

## 3. What makes the reference games look rich

1. **Restraint beats detail.** Untitled Goose Game uses low-poly meshes, flat colours and no textures on purpose, and spends its effort on composition (sourced). Lesson: add shape and silhouette (roofs, turrets, awnings), not surface noise.
2. **Take the palette from the real place.** A Short Hike built its palette from autumn photos of the Canadian Shield; Alba took its colours from photos shot on location and from Sorolla's paintings (both sourced). Lesson: sample the district palettes from photos of Helsinki, not from a generic pastel set.
3. **Gradients give big flat things form.** Alba found large assets needed more definition in shadow and added gradient palettes and decals on top of solid colour (sourced). Lesson: vertical gradients on walls, tinted wall feet, contact strips, a few painted decals.
4. **Let context place the detail.** Townscaper's charm comes from rules that react to neighbours: same-coloured houses join into a terrace, removing support makes stilts appear (sourced). Lesson: decoration rules that read the surroundings (turrets on street corners, clutter by roof edges, yards in holes, awnings facing squares) look hand-made.
5. **A small fixed palette with a few accents.** Townscaper's is described by its author as a rainbow plus two greys and white (sourced). Lesson: a short list per district and a single strong accent (the orange tents) reads better than eight unrelated pastels everywhere.
6. **Light does the mood.** Tiny Glade is reported to tie window light and shadows to a moving sun (fan wiki, unverified); Alba's palette is said to shift through the day (review, sourced). Lesson: sky presets, coloured shadows and lit windows change every pixel for little work.
7. **Everything wobbles a bit.** Lil Gator Game leans on exaggerated animation and wobble bones (sourced, about characters). Lesson, extended to the world by judgement: flags, trees, boats, steam and birds should all move slightly, all the time.
8. **A clean edge to the world.** Islanders and Dorfromantik present the world as a tidy diorama with crisp geometric shapes (reviews, sourced, plus general knowledge). Lesson: give the map a deliberate edge (haze, backdrop silhouettes, open sea) instead of letting it run out.

## 4. Recommended roadmap

Ordered by visible gain per unit of effort (judgement). Each is one branch and PR with before and after screenshots and the recorded draw calls and triangles.

### W1: baseline, sky and light (S to M)
- Performance capture in the smoke test; record the current numbers.
- Reclaim calls: shop row in the atlas and one mesh per chunk, mats merged, cyclists merged.
- Sky dome with sun, sky presets as level data, tinted hemisphere light, height fog, horizon backdrop, low-poly clouds.
- **Budget risk:** low. Net draw calls should fall. **Relation:** this is the core of **G2 and replaces its first half**.

### W2: roofs, colour and facades (M to L)
- District palettes; inset roofs on irregular footprints; roof seams and more roof clutter; courtyards.
- Richer baked AO and gradients; contact shadow strip.
- Atlas growth: doors, gateways, ground-floor variants, bay rhythm strips.
- Lit windows for dusk and night levels.
- Near play areas: awnings, hanging signs, corner turrets, a few balconies.
- **Budget risk:** low for calls (+1), medium for triangles (measure on low). Gameplay risk: roof collision changes where gulls land, so perches need a re-check. **Relation:** new work; the lit windows **finish G2**.

### W3: streets and squares (M)
- Pavement and carriageway split with kerbs; surface variety and tile-repeat hiding; squares in setts, park paths in gravel.
- Painted decals, manholes, tram rails and wires on hand-authored lines; quay details; puddles.
- **Budget risk:** low (+3 to +5). **Relation:** **replaces the ground half of G3.**

### W4: things that move (M)
- Tree variety, sway and seasonal tints; tufts and flower beds; bobbing boats; flags and bunting; steam; weather presets; lamp glow at dusk; ambient sound zones; cloud shadows.
- **Budget risk:** medium. This is where calls are spent (+8 to +12 on high, fewer on low); most items are individually switchable. **Relation:** takes the seasonal touches from **G2**; runs alongside **G3's water** work, which can be done in the same milestone with the shore mask.

### W5: a busier city (M to L)
- Static crowd poses, ambient birds, ambient trams on a loop, far ferry and ships; cars only if still wanted.
- **Budget risk:** medium to high; needs the W1 reclaim to have worked. **Relation:** uses the tram, pigeon and people art from **G5**, so do it after or with G5's actor pass.

### W6: landmark kit (M to L)
- Reusable parts (columns and portico, pediment, dome, steps, tower) and restyles for City Hall, the Presidential Palace, the Old Market Hall, the Government Palace and University, plus what Esplanadi and Katajanokka need (a harbour wheel, terminal, park pavilion).
- **Budget risk:** low (merged into chunks). **Relation:** this **is G5's landmark polish**, moved here; G5 keeps the gull and actors.

G4 (post-processing) is best after W2 and W3, when the scene content has settled. G6 (UI) is independent.

## 5. Open questions and decisions for the owner

1. **Order.** W1 before W2, as proposed, or roofs and colour first? Both are safe; W1 also sets up the measurements.
2. **District palettes or free pastels?** Real colours make Senate Square mostly pale yellow and white: more recognisable, less candy-coloured. A middle way is real hues at pastel strength with a few free accents.
3. **Roof collision.** Inset roofs change landing surfaces on most big buildings. Accept and re-test perches, or make the new roofs visual only at first (the gull would then sink slightly into the skirt)?
4. **More map data.** Is refetching worth it: OSM for centrelines, rails and crossings (ODbL, credits change), or more City of Helsinki layers such as a tree register (existence unverified)? The plan above works without either.
5. **Tram wires and scare lines.** Overhead wires near play areas could be mistaken for the scare-line deterrent. Keep wires away from quest areas, style them clearly differently, or skip them?
6. **Ambient cars.** Skip (my recommendation), or include a few on one or two streets?
7. **Ambient birds.** Are extra gulls and sparrows welcome, or do they muddle the Pigeon Gang, Kalle and the Flock call?
8. **Kits or procedural.** Stay procedural for the city and allow CC0 kit models only for small props and far ships?
9. **Target hardware and ceilings.** Which machine is the "integrated graphics" reference, and what triangle ceiling should the low preset hold on your phone? The 200 draw-call target is clear; triangles have no agreed number.
10. **Scope against the district levels.** Do W1 and W2 now, before Esplanadi and Katajanokka levels, so those districts are built in the new look?

## 6. Sources

Opened and read this session:
- https://kenney.nl/assets/city-kit-roads (CC0, 90 files, version notes)
- https://kenney.nl/assets/city-kit-commercial (CC0, 50 files)
- https://kenney.nl/assets/nature-kit (CC0, 330 files)
- https://kenney.nl/assets/watercraft-kit (CC0, 45 files)
- https://raw.githubusercontent.com/mrdoob/three.js/dev/docs/pages/BatchedMesh.html.md (BatchedMesh features and limits)
- The installed Three.js source in `node_modules/three` (multi-draw fallback, bundled add-ons) and this repo's code, data and docs.

Search summaries only (the search tool returned a summary; I did not open the page, so treat details as second-hand):
- Three.js forum threads on BatchedMesh and InstancedMesh: https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221 and https://discourse.threejs.org/t/why-did-the-performance-worsen-significantly-when-i-used-multidrawinstances-in-batchedmesh/78581
- Untitled Goose Game art style: https://wikipedia.com/wiki/Untitled_Goose_Game and https://polycount.com/discussion/comment/2729453 (forum opinion)
- A Short Hike: https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A and https://80.lv/articles/gdc-a-short-hike-postmortem
- Alba: https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/
- Townscaper: https://www.pcgamer.com/townscaper-review and https://www.mcvuk.com/business-news/when-we-made-townscaper/
- Tiny Glade: https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games (the ivy and window-light details came from a fan wiki and are unverified)
- Lil Gator Game: https://gamedeveloper.com/design/the-exaggerated-animations-and-tottering-wobble-bones-of-lil-gator-game
- Islanders and Dorfromantik: review summaries only
- Senate Square and Engel: https://finland.fi/life-society/helsinkis-senate-square/ and https://historia.hel.fi/en/alueet/southern/the-senate-square
- Katajanokka Jugend: https://finland.fi/arts-culture/eye-catching-helsinki-architecture-exploring-more-finnish-art-nouveau-marvels/ and https://hel.fi/hel2/kaumuseo/jugend/jugend_kavely_en_ve.pdf
- Kenney kit on itch.io: https://kenney-assets.itch.io/city-kit-roads

Blocked this session (host not on the session's network allowlist, or refused): quaternius.com, threejs.org, en.wikipedia.org, finnisharchitecture.fi, 80.lv, ustwogames.co.uk, opengameart.org (HTTP 403).

Not verified, from general knowledge:
- Helsinki colours and materials: pale yellow Empire facades with white trim, the Cathedral's green domes and gold stars, the pale blue City Hall, the pale yellow Presidential Palace, the striped brick Old Market Hall, Jugend plaster colours and granite plinths, granite setts on the squares, linden avenues and gravel paths on Esplanadi, the harbour observation wheel at Katajanokka.
- That the City of Helsinki publishes a street-tree register on its WFS server.
- That Three.js directional lights cannot project a texture (only spot lights can), and the cost notes on outline passes.
- Quaternius licence terms beyond the one pack already recorded in `data/raw/SOURCES.md`.
- All draw-call, triangle and effort figures for proposed work are estimates. The only measured numbers are the M10 ones, which are now out of date.
