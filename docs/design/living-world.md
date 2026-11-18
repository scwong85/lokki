# A living world: visible items, people with routines, crowds you can move

Status: **plan, nothing built.** From the Act 2 playtest: items are hard to notice, almost everybody stands still, group objectives have people waiting in place, and the levels should invite experiments.

## 1. What we have today (so the plan fits)

- Most cast members in the stages are `stationary: true` (about 26 across the Act 1 and Act 2 stage files and the mischief levels). That is deliberate for puzzles (a queue, a photographer, a vendor), but it makes every level feel like a diorama.
- Ambient `streetLife` walkers and cyclists exist, but they only decorate (no senses, no effect).
- People have senses, moods, stations (comfort food), the lure (taunt), follow and conga, a patrol route, dancing, contagion, reactions. The ingredients for "a person doing something" mostly exist; what is missing is **a reason to move** (routines) and **a reason to come together** (attractors).
- Items: props are plain meshes; the ink outline only exists on the high graphics preset; quest markers point at places, not at loose items.

## 2. Make items easy to notice

| Idea | What it is | Cost |
|---|---|---|
| **Item sparkle** | Loose, pickable props (and items held by people that an objective wants) get a soft sparkle and a slow bob and turn. The one the current step wants is brighter and visible from 40 m; others only within 12 m. Fades out when carried. | S |
| **Wanted-item pulse** | The item the current step asks for pulses gently, and a small world marker with a short label hovers over it (like the place markers). | S |
| **Scout pulse (key)** | One key sends out a ring that lights up every grabbable item and every reactive object (jukebox, bell, switch) for three seconds, with a cooldown. No skill needed; Hawk-eye makes it longer and also shows deterrents. | S–M |
| **Always-on outline for items** | A cheap rim highlight on props, also on the low preset (a second back-face pass, props only). | S |
| **Options** | "Highlight items": off, subtle, strong (default subtle). | S |
| **Bigger, brighter items** | Scale small quest props up about 25% and push their colours (the ring, the key, the cap, the baton). | S |

## 3. People with routines (a busier, believable square)

A **routine** is a short loop of steps: go to a place, wait or do something, go on. It replaces `stationary` for most people; anything that disturbs them (a noise, a splat, a snatch, the gull close) interrupts them, and when they calm down they **return to their routine** instead of wandering at random.

Step kinds: `go` (a point of interest), `sit` (a bench), `queue` (join a stall's queue and leave with the goods), `photo` (pose, take a picture of a landmark), `chat` (stand facing a partner), `feed` (throw crumbs to pigeons), `sweep`, `deliver`, `busk` (play music at a spot), `watch` (look at a busker, a statue, the tower).

Archetypes for the squares we have (each a data entry, with a seeded random start so no two squares are in step):
- Market: strollers between the stalls, queuers at the ice cream stall, vendors who restock and wipe, a family with a map who stop at every landmark, a man who feeds pigeons, a delivery trolley.
- Senate Square: tour group following a guide with a flag, graduates arriving for their photo, a couple on a bench, a busker on the steps, workers carrying planks.
- Esplanadi (later): joggers, dog walkers (the dog roams), picnickers who unpack, a busker with an audience.

Rules so puzzles keep working:
- **Anchored** characters (a puzzle's photographer, the conductor, the cart vendor while he sells) stay; everyone else gets a routine.
- A puzzle character may have a routine with a **fixed spot at the moment that matters** (the inspector's patrol is already this).
- Points of interest are level data (`places`), so a stage can say where benches, the stall and the photo spot are.
- Deterministic (seeded) and capped (about 25 active people); far-away people are cheap (no senses).
- Co-op: positions are already in the snapshots; routines run on the host.

## 4. Crowds you can move: attractors

An **attractor** is something people with a matching `likes` walk towards when it is on, in range, and they are not busy. When they arrive they **gather** (stand in a loose circle, watch, dance, eat) and they leave when it stops.

| Attractor | Likes | Examples |
|---|---|---|
| Music | music lovers, kids | the **jukebox** (made portable as a boom box: a heavy prop that needs Fat bird, set down and pecked: everybody within 25 m comes and dances), a busker, a radio the gull drops |
| Food trail | hungry people, pigeons | crumbs or buns dropped in a line lead a queue (a Pied Piper that needs no taunt) |
| Spectacle | everybody | the bell, the ferry horn, a fountain surge, a sprinkler burst, a fight between two vendors |
| Shiny | tourists | glasses, a mirror or a coin dropped where a gull wants them |
| Gossip | talkers | one angry tourist tells the next (the rumour mood from the chain plan) |
| Noise and fright | the nervous | a honk, a crash: people drift **away** (a repulsor) |

New objective kinds that use it (the engine already has `npcsInZone`):
- *Gather five people at the fountain* (any attractor will do: the player invents how).
- *Empty the market square* (repulsors) so you can take the stall.
- *Keep the crowd happy for 20 seconds* (a timed gather).
Each has at least two intended solutions and a third the player invents, which is what the puzzle research asks for.

## 5. More ideas to make levels invite experiments

1. **Every object has three answers.** Peck it, drop something on it, carry it somewhere. A short list per prop kind, with one funny reaction each (bins tip, parasols close, hats blow off, chairs stack).
2. **Chain-reaction recogniser.** When three or more reaction events follow one another within ten seconds, the game says "Chain reaction!" with slow motion and a polaroid. It rewards the "Rube Goldberg" moment.
3. **The mess meter and badges** (from the physics plan): first domino, biggest panic, the most people in one photo, a tram delivery. A tally you can chase and share.
4. **Timetables.** The ferry arrives (a crowd comes off), the bell, the tram, a busker's set, a brass band parade, a shower of rain (umbrellas open, puddles form: slip works), a gust (napkins fly, hats blow off).
5. **Memory and rumour.** People who saw you steal keep their food close for a few minutes and warn the next person; a wanted poster appears after a big mess (the city learns).
6. **Idle nudges.** If the player stands around for a minute, a small question appears ("Have you tried pecking the jukebox?"), a world sparkle on something unused. Never forced.
7. **Sandbox tools as toys.** The portable boom box, a beach ball, balloons on strings, a trolley you can tug: things the stages do not need, but that make the gull want to try.
8. **Wildlife with opinions.** Pigeons follow crumbs, ducks follow a bun trail, dogs bark at the honk (the dog call exists).
9. **Photo hunts.** Optional "take a photo of..." goals (a polaroid of the gull on the statue's head, of three people dancing), which is also what players share.
10. **Hidden `???` with a trail.** A faint sound or sparkle near a secret so exploration is rewarded.
11. **Co-op roles.** One gull is the lure (the jukebox, the crumbs), the other the thief; attractors give the lure a physical tool.

## 6. Build plan

| # | Milestone | Content | Size |
|---|---|---|---|
| M80 | **Seeing things** | item sparkle, wanted-item pulse and label, the scout pulse key, the Highlight items option, brighter quest props | S–M |
| M81 | **Routines** | the routine runner (go, sit, queue, photo, chat, watch), points of interest in level data, interruptions and returning, retrofitting the Act 1 and Act 2 stages (puzzle people anchored) | M–L |
| M82 | **Attractors and gatherings** | attractor system, the portable boom box and crumb trails, repulsors, the three gather objectives, a stage rebuilt to use them (the Jukebox Hero and Rush Hour objectives) | M–L |
| M83 | **Experiments** | chain-reaction recogniser, mess meter and badges, timetables (ferry crowd, rain, gust), idle nudges | M |

Each milestone ships with tests (routines and attractors are pure logic), a showcase stage, and a playtest card.

## 7. Risks

| Risk | Answer |
|---|---|
| Moving people break puzzles that rely on them standing there | anchored characters; chains use `follows` and `reactions` on roles, not coordinates; a regression run over every stage |
| Performance | cap active routines, far people simple, one shared path cache |
| Chaos makes the game hard to read | routines are calm and slow; the interesting people stay marked; the scout pulse |
| Too many systems at once | one milestone at a time, M80 first (cheap, helps every stage) |

## 8. Decisions (made)

1. Order M80 items, M81 routines, M82 attractors, M83 experiments.
2. Portable boom box: heavy, needs Fat bird, set down and pecked.
3. Item highlight is subtle by default.
4. The scout pulse is Hawk-eye.
