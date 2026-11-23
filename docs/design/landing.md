# Landing (research and proposal)

Status: **built in M122** (`docs/milestones/M122.md`) with the decisions: every spot, glide up, a dive still crashes and the land button lands softly. Written as a plan: Playtest note behind it: *landing on a special spot means diving at it, and then you slide off the platform.*

## 1. What we have today (from the code)

`src/gull/flight.ts`, `tuning.flight`, `tuning.walk`, `tuning.landing`:

| Thing | Value | What it means |
|---|---|---|
| Glide | 14 m/s forward, 2.4 m/s sink | a glide ratio of about **6 : 1**: to come down 10 m you travel about 58 m |
| Flare (hold S) | 6 m/s forward, 2.4 m/s sink (1 m/s within 2.5 m of a surface) | a steeper **2.5 : 1**, but nothing tells the player that S is the landing button |
| Dive (Shift) | up to 34 m/s, any angle | the only steep way down, and it lands **hard** (0.4 s to 0.9 s stun) |
| Landing magnet | pulls the **heading** toward a perch top, only within **3.5 m sideways and 4 m above**, only below 16 m/s, and flares in the last 2.5 m | it steers, but it never changes the **sink**, so you have to already be on a perfect line |
| Touchdown | horizontal speed is **kept**; above walking speed (4.5 m/s) it bleeds off at 14 m/s² | from a glide (14 m/s) that is a **skid of about 6.8 m**; from a flare (6 m/s) about **1.1 m**. A statue head or a lamp top is 1 to 3 m across, so **you slide off** |
| Walking off an edge | `mode = 'air'` at once | no ledge guard on small tops |

So the two complaints are both real and both have a mechanical cause: **the only steep descent is the dive**, and **touchdown keeps the glide speed**.

## 2. What other games and real birds do

- **Real birds** do not dive onto a perch. They approach on a curve that bleeds speed and reaches near-zero speed right at the perch; Harris' hawks even swoop **below** the perch and glide **up** to it, so the climb does the braking ([Oxford, hawk perching study](https://www.ox.ac.uk/node/7174954); [Manchester, "why birds speed up to slow down"](https://www.manchester.ac.uk/about/news/why-birds-speed-up-to-slow-down-the-physics-of-landing/); [eLife digest, safe landing](https://elifesciences.org/digests/46415/safe-landing)). That gives us a believable assist: an **arc** onto the spot, not a teleport.
- **Platformers** hide forgiveness where players fail most: coyote time, jump buffering, nudging the player round a corner they clipped ([Celeste and forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/); [Blizzard Watch on Celeste's hidden help](https://blizzardwatch.com/2020/03/13/celeste-developer-game-feel/)). The same idea for us: a short **ledge guard** after landing, and a **landing buffer** (hold the land button early, it still counts).
- **The risk:** too much help feels floaty and takes the skill away, and help should go where players get frustrated, not everywhere ([Wayline on imperfect movement](https://www.wayline.io/blog/imperfect-movement-better-games)); a "snap" made one bird game's targets too easy ([itch.io post](https://itch.io/post/3636422)). So: the assist only for **landing spots** (perches, quest roofs), not for every surface, and the player always starts it.
- **Falcon Age** made the bird's approach and landing a showpiece moment: seeing it grow as it comes in and settle ([Game Developer deep dive](https://gamedeveloper.com/design/game-design-deep-dive-creating-i-falcon-age-s-i-feathered-companion)). A landing should *look* deliberate, not like a crash.

## 3. Options

| | Idea | Fixes "must dive" | Fixes "slides off" | Cost | Risk |
|---|---|---|---|---|---|
| A | **Stick the landing:** touching down on a perch (or after a flare) kills horizontal speed (to 0 on a perch, to walking speed elsewhere) | no | **yes** | S | none; a glide onto open ground still skids a little |
| B | **Ledge guard:** for 0.8 s after landing, and always on small tops, the gull stops at the edge unless you push off for 0.3 s or hop | no | **yes** | S | could feel sticky on roofs; only small tops |
| C | **Wider magnet that also sinks:** the magnet works from 12 m away and 10 m above in a cone ahead, and bends the **sink** onto a glideslope to the spot, not just the heading | **partly** | partly | M | can grab the gull when you only wanted to fly past (only while slow and not flapping, as now) |
| D | **Land here (hold S near a spot):** a ring marks the nearest landing spot ahead; holding S commits to an auto-approach: a hawk-style arc that brakes onto the spot and settles with zero speed; let go or flap to cancel | **yes** | **yes** | M | the most "game-y"; must stay optional and cancellable |
| E | **Teach S:** the tip line and the controls say "S: brake and land" the first time a perch is near | helps | helps | S | none |
| F | **Soft dive landing on a perch:** a dive that ends on a perch top flares automatically in the last 2 m instead of crashing | yes for divers | yes | S | dives at perches become a strategy too |

## 4. Recommendation

Do **A + B + D + E** together (one milestone, M), and keep C and F for later if needed:
1. **Stick the landing (A):** on a perch: horizontal speed 0 on touchdown, a soft landing whatever the speed (below the hard limit). Elsewhere after a flare: speed capped at walking speed.
2. **Ledge guard (B):** on a perch top, or for 0.8 s after any landing, walking stops 0.2 m from the edge; holding the stick outward for 0.3 s, or a hop, steps off.
3. **"Land here" (D):** within 20 m of a landing spot ahead (perches and quest landing spots like the picnic roof), a small ring shows on it; **hold S** to commit: the gull follows an arc (dip below, then glide up to it, braking) and lands with zero speed. Flap or release S to cancel. Touch: the flare button; gamepad: the same as S. A diving gull can also commit (it pulls out into the arc).
4. **Teach it (E):** the first time a landing spot is in range, a tip: "Hold S to land on the ring."
5. **Tuning:** every number in `tuning.landing` (approach range, cone, arc dip, braking, ledge guard time and distance, stick threshold); the debug panel shows them.

**Tests:** pure tests for the arc (it ends on the spot with ~0 speed from a range of start positions and speeds), the stick (no skid on a perch), the ledge guard (stops at the edge, steps off after 0.3 s of pushing), and a browser test: from 20 m out at glide speed, hold S, land on the Havis Amanda perch and stay there.

## 5. Open questions
1. Should **"Land here"** work on every rooftop, or only on perches and quest spots? (Proposal: perches and quest spots; roofs get A and B only.)
2. Is a hawk-style **dip and glide up** the right look, or just a straight braking glide? (The dip looks more like a bird; the straight line is easier to read.)
3. Should a **dive onto a perch** also stick softly (option F)?
