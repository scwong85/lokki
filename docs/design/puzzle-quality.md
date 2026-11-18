# Puzzle quality: fun to solve and funny to watch

Status: **research and plan, nothing built.** Question: do our objectives give both the satisfaction of solving a puzzle and the laugh of the scene it causes? What makes that happen, and how do we get more of it?

The web research was thin and mostly blogs and interviews; the claims marked **(web)** have some source behind them, the rest is established design practice and our own audit. Sources are at the end.

## 1. What the research says

**The reward of a puzzle is the insight (web).** The "aha" is the payoff everything else supports: a moment when the player sees how the system works and feels clever. Good solutions are surprising in the moment and inevitable in hindsight. Jonathan Blow's framing: an aha is not assembling pieces, it is seeing the world a little more clearly. The opposite is *process*: a sequence of chores whose answer you already know. Fairness matters: rules are consistent and readable, ambiguity is the enemy, one new concept at a time, and the player should reach the answer by reasoning, not guessing.

**Comedy in these games is setup and punchline, and the punchline is other people (web).** House House (Untitled Goose Game): "it has a set-up and a punchline"; the goose is funny because of how the groundskeeper and villagers *respond* ("it's often the groundskeeper's responses that make the goose seem so bad"); the tasks are comically naughty, not hard; failure is never punishing ("never that feeling of, oh no, I died"); each area is a small sandbox with a to-do list, and finishing a task changes the space.

**The gag has to be designed in (web).** Octodad and Goat Simulator set up a stage with systems and then step back; their makers tune the balance between physical comedy and frustration for years. Surprise helps both scripted and emergent humour. Hitman is cited as funny because open, pliable systems let a plan go wrong in a Mr Bean way.

**Several solutions are good, but brute force removes the insight (web).** Open solution spaces make players invent unexpected approaches, but a puzzle that can be brute forced gives no aha. Hints should come from the world (dialogue, environment) and the rules must stay consistent.

**Not in the sources (design practice we should apply anyway):** the best gags are *player-authored*: the player made a plan and the world carried it out, so the laugh and the pride arrive together. Cause and effect has to be *visible* (a camera beat, a sound and an emote per link) or the chain reads as luck. The reaction has to be *big and slow enough to enjoy*, then followed by a quiet beat.

## 2. A test for every objective: the joke card

Write each objective as three lines. If a line cannot be written, the objective is not finished.

1. **The joke:** the funny picture that results, in one sentence, with a person in it. ("A tourist in a top hat gets sprayed in the face by the vendor who was aiming at me.")
2. **The insight:** the one thing the player works out that makes it happen. ("The spray goes through whoever stands in front of me.") Only **one** per objective; the other steps are consequences, not new problems.
3. **The reaction:** what people and the world do to *show* it (gasp, point, laugh, chase, fall, a bell). Minimum two reactions from two different sources, one of them a witness.

Then the checks:
- **Plan:** the player can decide *when* and *how* to trigger the punchline (set a trap and wait, line up a timing, pick a victim), not just walk to a marker.
- **No padding:** a "get away with it" step is not a chain step. Use it only when the chase *is* the joke.
- **Fail soft:** a miss resets one person, is quick to retry, and ideally is funny too.
- **Hint ladder:** note text, then marker, then the world demonstrates it (the tourist sets up the situation by himself).
- **Accomplishment beat:** after the punchline the camera lingers, a polaroid fires, and the note shows a stamp. (We have the polaroid and stamp; the lingering camera and the recap are missing.)

## 3. Audit of the Act 1 objectives

Scores: **Insight** (one clear aha), **Reaction** (people react visibly), **Plan** (the player authors the timing), **Padding** (steps that are only fetching). Verdict: keep, tune, or rewrite.

| Stage | Objective | Insight | Reaction | Plan | Padding | Verdict |
|---|---|---|---|---|---|---|
| 1.1 | Breakfast (snatch, roof, escape) | selfie timing (good) | weak: she just loses it | yes | roof landing and escape are filler | **tune**: the victim chases and buys comfort food |
| 1.1 | Souvenir (map to sea, wrong ferry) | none new | yes: he walks to the wrong ferry | low | one step | **keep**, add a witness (ferry crew shouts) |
| 1.1 | Neighbours (land, bun, ferry) | none | **none** | no | all of it | **rewrite** |
| 1.2 | Clean Freak | yes (scrubbing window) | yes | yes | escape | **keep**, drop escape |
| 1.2 | Bottle Service | yes (noise turns her) | yes | yes | escape | **keep**, drop escape |
| 1.2 | Honk! | yes (backs turned) | yes (cones fly) | some | escape | **keep**, drop escape; add witnesses |
| 1.3 | Tug of War | yes (air vs ground items) | some | yes | long, three items in a row | **tune**: shorten to one item per beat with a different person reaction |
| 1.3 | Spray Tan | yes | yes | yes | lunch, escape | **keep** (best of the set) |
| 1.3 | Peekaboo | yes (hide, then BOO) | yes | yes | escape | **keep**, drop escape |
| 1.4 | Map and Cone | yes (lure) | yes (three reactions) | yes | escape | **keep** (the model chain) |
| 1.4 | Wet Floor | yes (trap) | yes | yes | escape | **keep** |
| 1.4 | Jukebox Hero | yes (dancers do not guard) | yes | some | escape | **keep** |
| 1.5 | Rush Hour | yes (contagion) | yes | some | cone, escape | **tune**: more of the gag, less fetching |
| 1.5 | Strike! | yes (slam line) | yes | yes | cone, escape | **keep** |
| 1.5 | Nemesis | weak | **weak** | some | most of it | **rewrite** (the finale of the act) |

Summary: about half hold up; three need rewriting or tuning (1.1 Neighbours, 1.1 Breakfast, 1.5 Nemesis) and the "get away with it" tail should come off every chain (it was my padding to reach three steps).

## 4. Rewrites (joke cards)

- **Neighbours (1.1) becomes "Bun voyage":** *Joke:* a ferry deckhand is so proud of his spotless deck that the bun you drop makes him chase it across the planks while the passengers laugh. *Insight:* drop the bun where he can see it (not on the ferry) and he leaves his post. *Reaction:* the deckhand chases and slips, passengers cheer, the horn blows. *Plan:* choose the moment he turns his back to take his sandwich.
- **Breakfast (1.1):** *Joke:* the tourist you robbed storms to the stall and buys another, which you take too. *Insight:* selfie timing, then the angry tourist is predictable. *Reaction:* mood emotes, the vendor shrugs, a second cone. (This is the Map and Cone idea in miniature; it teaches moods early.)
- **Nemesis (1.5):** *Joke:* the Warden, furious about his stolen sandwich, chases a taunting gull straight through the fountain and the Rush Hour queue, and slips. *Insight:* his umbrella is down only while he eats and while he runs (it is a prop in his hand). *Reaction:* the queue panics, the fountain splashes, he falls, the umbrella flies. *Plan:* you choose the route that takes him through the queue. This is the finale that uses everything.
- **Tug of War (1.3):** one item per beat, each person reacting differently (the soup man sulks, the balloon man floats away a metre, the bun man gets sprayed by the vendor).

## 5. How to improve (the toolkit)

1. **Joke cards in data** (`LevelDef`/objective gets `joke`, `insight`, `reaction` fields) and a **test**: each chain has at least two reaction steps from two sources, no chain ends on `escape`, every chain has a hint ladder (hint plus marker).
2. **Witnesses:** bystanders within a few metres of a punchline react (point, laugh, gasp, take a photo). A reusable `witness()` effect after the big beats, so a joke always has an audience.
3. **A lingering camera:** a brief slow-motion and a zoom on the punchline (we have slow motion in M25 and the polaroid).
4. **The replay reel:** when an objective completes, a 5-second caption recap: "You pooped on the pavement → the inspector slipped → his lunch flew". Cheap (the run log exists) and a strong accomplishment beat and a portfolio gif.
5. **Style stars (optional):** a second tick for doing it a different way or in one beat ("in one dive", "without being seen"), which gives replay value and makes the multiple solutions each need an insight.
6. **Per-objective playtest card:** pressing a key after an objective shows three taps (stuck, got it, funny) and exports JSON like the tuning export. It turns your playtests into data for these exact questions.
7. **Soft failure that is funny:** a failed attempt shows a reaction (the tourist tuts and looks around) rather than a plain reset.

## 6. Proposed order

| # | Milestone | Content |
|---|---|---|
| M67 | **Puzzle pass on Act 1** | joke card fields and the chain test, drop the padding tails, rewrite Neighbours, Breakfast and Nemesis, shorten Tug of War, add witnesses |
| M68 | **Accomplishment beats** | lingering camera on the punchline, the replay reel, the per-objective playtest card |
| M69+ | **Act 2 build** (was M65 to M67 in `act2.md`) | built with joke cards from the start |

## 7. Decisions needed

1. Go with the joke card rule (one insight, two reactions, no padding) for all new and rebuilt objectives?
2. Rewrite the three weakest Act 1 objectives as proposed, and take the escape tail off the rest?
3. Build the replay reel and the playtest card (they are the main answer to "does it feel accomplished")?

## Sources
- [Untitled Goose Game review, A Comedy of Errors (DualShockers)](https://www.dualshockers.com/untitled-goose-game-review-switch/), [Panic podcast, episode on Untitled Goose Game](https://podcast.panic.com/episodes/s01e01/transcript/), [PC Gamer, Untitled Goose Game](https://www.pressreader.com/usa/pc-gamer-us/20171114/284412739365265): set-up and punchline, the villagers' responses, no punishing failure, sandbox areas.
- [Designing puzzles players feel smart solving](https://bugnet.io/blog/how-to-design-puzzles-players-feel-smart-solving), [Puzzles: aha vs process](https://thecodex.ca/puzzles-aha-vs-process/), [Clara Fernandez-Vara on puzzle design](https://cms.mit.edu/clara-fernandez-vara-gamasutra), [How Jonathan Blow designs a puzzle (GMTK transcript)](https://amara.org/subtitles/LaGKzzSXnuQl/en-gb/1/download/How%20Jonathan%20Blow%20Designs%20a%20Puzzle%20%20Game%20Makers%20Toolkit.en-gb.txt): the aha as the reward, fairness, one concept at a time.
- [Kings of comedy: the art of interactive humour (PC Gamer)](https://www.pcgamer.com/kings-of-comedy-the-flourishing-art-of-interactive-humour/2), [Octodad devs on their comedy (Kill Screen)](https://www.killscreen.com/octodad-dadliest-catch-devs-reveal-unlikely-inspiration-their-comedy/), [When bad controls are good (Kotaku)](https://kotaku.com/when-bad-controls-are-good-1640670231): designed-in physical comedy, tuning comedy against frustration.
- [A study into puzzle design (Game Developer)](https://www.gamedeveloper.com/design/a-study-into-puzzle-design), [The design of puzzles (Inform manual)](https://www.inform-fiction.org/manual/html/s50.html), [Nathan Hoad on puzzles](https://scriptagc.wasmer.app/https_nathanhoad_net/puzzles): multiple solutions, consistent rules, hints, brute force.
