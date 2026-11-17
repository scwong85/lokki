# Physics and sandbox: research and ideas

Status: **research + proposals, nothing built.** Goal: more physical play and a proper sandbox. The web research was thin (listicles and store pages, a few postmortems): the points marked **(web)** have some source support, the rest is established design practice and the shape of our own engine.

## 1. What other games teach

- **Unpredictability is a feature (web, several sources).** Goat Simulator, Human Fall Flat and Octodad make wobbly physics the joke: failure is comedy, and experimenting costs nothing. For us: keep consequences cheap and reversible (props reset, nobody is hurt), and make the funny outcome the *likely* one.
- **Emergence by design (web).** Surprising results come from a few simple verbs acting on objects with tags, not from many special cases. We already have tags; the best next toys are verbs that act on *many* things at once (gust, slam, contagion).
- **Goals must still be clear (web).** Physics sandboxes with objectives need visual cues; our chain note and markers do this.
- **Untitled Goose Game structure (web):** each area is a small sandbox with a to-do list; completing a task changes the space; areas stay open after. This is the model for stages and the Playground.
- **Teach, twist, combine (web, onboarding sources; Portal, Celeste examples).** Introduce a mechanic safely, then twist it, then combine it with older ones. This is the rule for stage design (arcs.md).
- **Not in the research (design practice):** chain reactions ("Rube Goldberg") should be *visible* (slow the camera, ring a sound per link) so the player sees why it happened; objects should be big and soft-shaped so they behave readably; a "reset prop" button removes the fear of breaking a level.

## 2. What the engine has today

Rapier rigid bodies for props (mass, tags, grab modes), buoyancy and floating, wind on the gull and poop, tug of war on the ground, slam and knock-down chains (scripted, not rigid-body), gust (scripted impulses), contagion, dominoes (scripted animation), splat puddles, switches (jukebox, alarm, sprinkler, cloth, bell, cap).

Gap: almost all "physics" gags are **scripted**, not simulated. That is good for determinism and co-op (host sends a handful of states), but it makes the world feel less alive than a true sandbox.

## 3. Candidate toys (rated)

Fun / readability / cost (S, M, L) / co-op sync cost (the host must snapshot every moving body).

| Toy | What it is | Fun | Cost | Co-op sync |
|---|---|---|---|---|
| **Hanging things** (signs, flags, washing line, lamps) | Rapier rope/spherical joints; a gull flying through or tugging makes them swing | high | M | low (few bodies) |
| **Rolling things** (barrels, prams, bikes on a slope, a ball) | A shove or a gust starts it; it rolls downhill into people (a slam without the gull) | high | S | medium |
| **Stacks** (crates, chairs, fish boxes, bottle pyramid) | Real dynamic stacks that collapse; a dive or a tug topples them | high | S | medium (cap the count) |
| **Seesaw and catapult** | A plank pivot: drop a heavy item on one end, the other flies | medium | M | low |
| **Balloons** (helium) | Buoyant upward force; a gull can carry or release one; popping with the beak | high | S | low |
| **Doors and gates** (hinges) | Open by pushing, swing back, trap someone | medium | M | low |
| **Carts and trolleys** | Wheeled bodies with a handle: a vendor pushes it; tug it and it follows | medium | M | medium |
| **Wind fan and updraft** | A zone adds force to light bodies and the gull | medium | S | low |
| **Pressure plates and weights** | A heavy prop on a plate opens or triggers something | medium | S | low |
| **Water**: rafts, wake pushes, bobbing crates | We have floating; add push and waves | medium | M | medium |
| **Destructible stalls** | A stall's poles can be tugged: it collapses (a slam made of geometry) | high | L | high |
| **Cranes and hooks** (Katajanokka) | Kinematic hook carries a body on a path | medium | M | low |

**Top five to build first:** stacks, rolling things, balloons, hanging things, wind fan. They are small, readable, work with the verbs we have (dive, tug, gust, poop) and need little new code.

## 4. Sandbox design: the Playground

- One **sandbox per arc**: the whole district, **only the mechanics unlocked so far** (the same rule as the campaign).
- A **prop spawner** (a crate you land on and press E on: a few items pop out) and a **reset** button that returns every prop and person to its start.
- A **mess meter** (not a score target): everything that breaks, spills, falls or panics adds to a bar, with a few "badges" (first domino, first balloon, ten-person panic). It rewards curiosity, not repetition.
- **Photo mode** (hold a key: free camera, polaroid) for sharing the gags; fits the portfolio goal.
- **Time and weather switches** (day, dusk, wind) to see the same physics under new conditions.

## 5. Risks

| Risk | Answer |
|---|---|
| Too many bodies hurt frame rate | cap simulated props per scene (about 60), sleep bodies, use scripted effects for crowds |
| Co-op desync | host owns physics; snapshots only for awake bodies near a gull; low rate (10 Hz) with interpolation |
| Physics makes puzzles unsolvable (an item lands behind a wall) | every puzzle item respawns near its start after a minute or on a "retry" press (the escape bar and chains already tolerate this) |
| Sandbox has no goals | the mess meter and badges; optional prompts ("Try: tip the fish boxes onto the ferry") |

## 6. Next steps

1. Decide with the user which toys to build first (section 3).
2. A small milestone per two toys, each with a showcase level in the Playground, as with M53 to M56.
3. Add the spawner and reset to the existing sandbox first (S).
