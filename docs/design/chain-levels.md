# Chain levels: replacing fetch quests with cause and effect

Status: **C1 to C3 built (M44, Map and Cone); C4 started (M47: five levels rebuilt)**; the rest are proposals. Companion to `fun-todos.md` and `havoc-hour.md`. Written from the playtest note: "a lot of fetch quests, so it is boring. Quests should have more people and environment interaction, like the tourist map snatch, but better. Each level needs one objective made of several steps. Plan escalated events."

## 1. The diagnosis

Most of the 45 levels ask the same thing: **take item A, carry it to place B, tick**. The people and the city are scenery; they react only after the fact (a toast, a yelp). The best moments we have (the map snatch, the vendor spray that soaks the tourist, the owl that scares the granny) are the ones where **a person does something because of what you did**, and you then use that.

So the rule for new content:

> **Every step of a level is something a person or the environment does *because of* the previous step. The gull is the spark, not the delivery van.**

Carrying is allowed, but only as one verb among many, and never two fetches in a row.

## 2. The shape of a chain level

- **One objective per level**, shown as one line on the paper note: *"Get a tourist to buy you an ice cream."* (not three to-dos).
- **Four to six steps** under it. The note shows the steps already done, the current one, and the rest as `?` stickers, so the chain unfolds as you play (like the hidden `???` to-dos, but the whole level).
- **Each step is a reaction.** A step ends when an actor changes state (angry, hungry, lured, scared, soaked, late), not when an item enters a zone.
- **Two or more ways to cause each step** (noise, poop, snatch, a thrown object, a shadow, a flock), so players find their own solution and co-op has room to split jobs.
- **Recoverable:** a failed step resets that actor (the tourist calms down and gets a new map after a minute), never the whole level. No time limits except on the finale.
- **The last step is a spectacle** with a laugh: the camera finale (M42, the gull runs at the camera laughing) is the reward for it.
- **Escalation inside the level:** the city reacts to each step, so the chain also raises the stakes (section 5).

### A worked example: *Map and Cone* (Kauppatori)
Objective: *"Treat yourself."*
1. **Snatch the map** from the tourist (dive). The tourist gets **angry** and chases you.
2. **Lure the angry tourist** to the ice cream stall: stay 5 to 12 m ahead and screech now and then to keep them on your tail (a screech while they are losing you re-locks them). Leave them at the stall.
3. The tourist is **upset and hungry**: a "comfort food" need appears, and they **queue and buy an ice cream**.
4. **Snatch the cone** as they walk away happy (a cone in the hand is a normal snatch target).
5. **Spectacle:** the vendor, who now sees an empty-handed customer pointing at a gull, chases the tourist round the fountain with the spray bottle; the tourist trips, the map flies up; you land with the cone. Laugh run. Cleared.

### Another: *Domino Dirty* (poop chain)
Objective: *"Ruin one man's day."*
1. Poop on **Pekka the tourist**: he **wipes it off** on his hat, **annoyed**.
2. Poop on him again within a minute: he **storms to the fountain to wash** (an angry walk with a destination: the first "needs" behaviour).
3. At the fountain he **splashes the busker's tip jar**; the busker **shouts** and shoves him.
4. Pekka stumbles into the **chair stack**; the chairs **collapse onto the café** and a waiter drops the tray (sound, scatter).
5. **Spectacle:** the whole café **panics**, the Warden runs in with the umbrella, you bomb him from the rooftop.

## 3. What the game needs (the systems)

These are small, general, and reused by every level. This is where the real work is.

| System | What it is | Builds on |
|---|---|---|
| **Mood** | A per-person state: calm, annoyed, angry, upset, embarrassed, scared, delighted, with a decay time. Drives the face emote and the walk (stomp, shuffle, skip). | Emotes (M25), NPC brain (M5) |
| **Wants and goals** | A person can be *given a goal*: "go to a named place and do X" (buy, wash, sit, flee, queue, return the map). A goal is a short script of waypoints plus an action, not a new brain. | `waypoints.ts`, vendors, `sendRole` |
| **Lure** | A noise a person *follows* instead of fleeing from, if their mood allows (angry or curious follow, scared flee). The screech and the Mimic calls already exist; add a "follows noise" reaction table per mood. | Noise system, Mimic |
| **Stations** | Named places that give a need: the ice cream stall sells cones, the fountain washes, the bench rests, the bin eats litter. A person with a matching goal walks to the station and uses it. | Stalls, vendors |
| **Item in hand** | People carry, hold, drop, and *pick up again* things (map, cone, hat). A dropped item has an owner who wants it back. | Hand targets (M5), props |
| **Chain runner** | The level's state machine: an ordered graph of steps, each with `when` (a condition on actors or events), `then` (effects: set mood, give goal, spawn, ring a bell, start a tram) and `hint` text. It replaces the to-do list for chain levels. | Level data (M12), quest events |
| **Step UI** | The note shows done / current / `?` steps, a soft marker on the *actor* that matters (not on a place), and an optional hint after a pause. | `todo.ts`, markers |

### Data sketch (plain TS, in `src/data/levels/`)
```ts
chain: {
  objective: 'Treat yourself.',
  steps: [
    { id: 'map',  when: { event: 'snatch', tag: 'map', from: 'tourist1' }, then: [mood('tourist1', 'angry'), chase('tourist1')], hint: 'The tourist with the map by the fountain.' },
    { id: 'lure', when: { actorAt: ['tourist1', 'iceStall', 3] },         then: [mood('tourist1', 'upset'), goal('tourist1', buy('iceStall', 'cone'))], hint: 'Screech to keep them following you.' },
    { id: 'buy',  when: { event: 'bought', who: 'tourist1' },            then: [mood('tourist1', 'delighted')] },
    { id: 'cone', when: { event: 'snatch', tag: 'cone', from: 'tourist1' }, then: [spectacle('vendorChase')] },
  ],
}
```
Everything else (who, where, what each reaction looks like) is data, so a new level is a few lines plus any new reaction it needs.

## 4. Chain ideas (about a dozen, by district)

Each is one objective and a chain; the first five are rebuilds of today's most fetch-like levels.

**Kauppatori**
1. **Map and Cone** (above): map, angry lure, comfort ice cream, snatch.
2. **Domino Dirty** (above): repeated poop escalates into a café collapse.
3. **The Wrong Ferry:** swap a tourist's map for the harbour one; they head for the wrong ferry; the ferry's crew shouts; the *real* group left behind boards it; the horn blows early. Spectacle: the stranded group chases the ferry along the quay.
4. **Bun Heist:** the baker keeps the bun trolley; make the baker leave (lure with a baby cry, Mimic) to quarrel with the bin man; the trolley rolls; the bun trolley goes through the market (chain of knocked stalls).
5. **Blind-Date Wrecker:** the date arrives; poop makes one leave to wash; the other gets a "sorry" flower from the vendor meant for someone else; the first returns and sees it. Spectacle: slapstick fountain.
6. **The Owl Rumour:** scare one granny with the owl; she tells the next; panic spreads along the queue (a rumour mood that spreads person to person); the stall empties; the pastry is yours.

**Senate Square**
7. **Wedding Crasher:** the photographer wants "perfect light"; knock the umbrella shade away, shift the bride's cap, release the doves; the best man chases the doves into the tram; the tram bell, the wedding scatters.
8. **Bell Ringer:** pigeons on the statue; make the guide look up (screech), the tour group follows the gaze, the bell rings at the wrong time, the pigeon gang scatters onto the group.
9. **Tram Gossip:** a driver who is late; make him stop (bottle), his passengers leave, the passengers pile into the ice cream queue, the queue spills.

**Esplanadi**
10. **Sun Seekers:** shadows wake a sunbather; the sunbather chases you through the dog park; the dog chases the sunbather; the picnic goes.
11. **Fetch, Reversed:** the dog fetches *you* (the dog chases the gull, ball in the beak, to the owner, who drops the sausage when the dog arrives).
12. **Splash Chain:** the sprinkler timer, a jogger, a stroller, and a busker's amp; soaked people run for the café, the café awning collapses.

Each of these has a **co-op version** where the steps split: one gull is the lure, the other the thief or bomber (see `fun-todos.md`, F2).

## 5. Escalated events (the city answers)

A chain should *feel* like it is growing. Four tiers, a step may trigger the next tier:

| Tier | Scale | Examples (what the city does) |
|---|---|---|
| 1 Personal | One person | Annoyed, angry, upset, embarrassed; wipes, shouts, stomps off |
| 2 Local | A few people | A vendor joins in with the spray; the queue turns and stares; a waiter drops a tray; a dog barks |
| 3 District | The square | The Warden arrives; the tram stops or rings; a bell rings; pigeons scatter; the ferry horn; heat rises one level |
| 4 Spectacle | Everyone | The domino: chairs, a stall, a fountain surge, a stampede round the statue, the drone (later levels) |

- Heat (M6) stays the cost of mischief; a spectacle is the one moment heat jumps *on purpose* and then the level ends.
- Later levels start the chain already at tier 2 or 3 (the city is alert) so the player has to be quieter, not louder.
- **Rumour** (tier 2) is a mood that spreads between neighbours within a few metres, giving crowds a cheap but readable cascade.

## 6. Milestones

| # | Milestone | Contents | Size |
|---|---|---|---|
| C1 | **Mood and goals** | Mood on people, goals with waypoints and station use (buy, wash, sit), lure-by-noise, emotes for moods. Pure logic with tests. No new level yet | M |
| C2 | **Chain runner and step UI** | Chain data format, the runner, the note showing done/current/`?`, actor markers, hints. Port one stub level | M |
| C3 | **Map and Cone** | The first full chain (section 2) as the prototype. Decision gate: is it fun? | M |
| C4 | **Chains I (Kauppatori)** | Rebuild the fetch-heavy levels as chains (ideas 2 to 6), one objective each, with the camera finale | L |
| C5 | **Rumour and crowds** | The rumour mood, queue reactions, tier 2 and 3 events, Warden and tram as chain actors | M |
| C6 | **Chains II (Senate, Esplanadi)** | Ideas 7 to 12 | L |
| C7 | **Co-op chains** | Role-split variants, shared step markers, the rescue and lure synergies | M |

Order: C1 to C3 first, then stop and playtest (the gate). Everything after depends on whether the Map and Cone prototype is fun.

## 7. Risks and answers

| Risk | Answer |
|---|---|
| People doing things on their own is bug-prone | Goals are short scripts with timeouts; every step has a "stuck" fallback (the actor goes home after 20 s); seeded RNG; unit tests on the mood and goal machines |
| Players do not understand what to do | One line objective, the current step's hint after a pause, a soft marker on the *actor* that matters, and a replay of the last step on request |
| Too linear again | Two or more ways per step, steps that accept any of several events, and optional "bonus mess" steps for stars |
| Rebuilding 45 levels is a lot | Not all: keep the skill levels (they teach), convert the fetch-heavy ones in C4 and C6, and keep the old levels reachable in a "Classic" list |
| Performance with many scripted actors | Chains use the existing cast (a handful of people); the crowd in the rumour is the only new cost and is capped |

## 8. Decisions needed

1. **Go on C1 to C3** (mood, goals, chain runner, the Map and Cone prototype) before anything else?
2. **Keep or replace** the existing fetch levels: replace them (fewer, better levels) or keep both lists?
3. **Hints:** is "the soft marker follows the *person* who matters" enough, or do you want an explicit "replay the story so far" button?
