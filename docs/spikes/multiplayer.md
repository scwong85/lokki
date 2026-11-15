# Spike: two players together (co-op)

> **Status:** local debug co-op shipped in M12 (`?coop`, second gull on a gamepad); online co-op is built in M14 with copy-paste codes (see `docs/milestones/M14.md`). The text below is the original feasibility study.

**Verdict: yes, feasible, in two steps.**

1. **Local co-op** (two players, one computer, split screen): fits the plan's "static and offline" rule, reuses the M11 input layer, size **M–L**. The best first step.
2. **Online co-op** (two players, two devices): possible in the browser with WebRTC, but it **needs a small online service** to connect the two players (and sometimes to relay traffic), which breaks the plan's "no external runtime services" rule. That's a decision for you. Size **L–XL** on top of step 1.

Either way, the game first needs a refactor from "one gull" to "a list of gulls" (part of step 1). Gameplay rules, quests and levels mostly carry over. This is a feasibility study only: nothing was implemented.

Precedent: Untitled Goose Game added two-player co-op (two geese, same screen) in an update, and it suits this kind of game well: one distracts, the other steals.

## 1. What the code assumes today

| Part | Today | For two gulls |
|---|---|---|
| Flight (`src/gull/flight.ts`) | A pure state machine: `stepFlight(state, input, …)` | **Ready**: run it once per gull |
| Input (`src/core/input.ts`, M11) | One `Input` with keyboard/mouse plus virtual sources | **Nearly ready**: one `Input` per player; player 2 fed by a gamepad (the backlog's gamepad support) or by network messages |
| Gull model, shadow, camera | One each, created in `main.ts` | One per player; a second camera for split screen |
| Interaction (grab, carry, toss, poop) | One `carried` item, one poop cooldown | Per gull: who holds what, who pooped |
| Tourists (`npc.ts`, `npcs.ts`) | Senses one `GullInfo` | Sense the **nearest or most suspicious** gull; remember which one stole |
| City defence (vendors, lines, nets, Warden) | Targets one gull | Target the nearest / the one with the loot; the Warden picks one to chase |
| Heat, quests, to-do list | Global | **Stay shared** (a team): one to-do, one heat level |
| Skills, gull looks, save | One save | The host's progress drives levels; each player keeps their own look (and, online, their own save) |
| HUD | One | Shared to-do; per-player prompts, ability bars and stamina in each half of the screen |

About 40 places in `main.ts` use the single `gull`; the NPC brain and defence code take one gull as input. The refactor is mechanical but touches most systems, so it deserves its own milestone with the existing tests as a safety net.

## 2. Step 1: local co-op (same computer)

**Setup:** player 1 on keyboard and mouse (or a gamepad), player 2 on a gamepad. Two keyboard players is possible (WASD vs arrow keys) but mouse look can only belong to one, so gamepad support comes first. On phones, local co-op isn't practical (one small screen, one pair of thumbs).

**Screen:** vertical **split screen**, each half with its own chase camera. A shared single camera (as in Goose Game) doesn't suit flying birds that can be 300 m apart. Optional nicety: when the two gulls are close, the halves merge into one wider view.

**Performance:** split screen draws the city twice. On the high preset that's about 2 × 150–190 draw calls, above the budget, so co-op uses its own preset: no shadow map, shorter view distance, lower resolution per half. Expect it to need a decent laptop GPU; this is the main risk of step 1.

**What it needs:**
| Item | Size |
|---|---|
| Gamepad support on the M11 input layer (already in the backlog) | S |
| "List of gulls" refactor across interaction, NPCs, defence, HUD | M |
| Split-screen rendering, two cameras, a co-op graphics preset | S–M |
| Co-op HUD (shared to-do, per-player prompts) and a "join" screen ("press A on a gamepad to join") | S |
| Co-op balancing and co-op puzzles (section 4) | M, ongoing per level |

## 3. Step 2: online co-op (two devices)

### How it would work
- **Peer to peer with WebRTC** (built into browsers): the two players' browsers talk directly. **Host-authoritative**: the host's browser runs the real game (physics, people, quests); the guest sends its inputs and receives the state about 20 times a second.
- **Own gull predicted locally**: flight is a pure state machine and the city collision is static, so each player flies their own gull with no lag. Snatching, grabbing and poop hits are decided by the host and arrive about a round-trip later (usually well under 0.2 s; most moments hide it with animation).
- **What's sent**: both gulls, loose props (positions only for ones that moved), people (position, mode, what they hold), heat, quest state, events (splats, crashes, banners). A few kilobytes per second.
- **Lobby**: the host gets a short room code (e.g. `GULL-4821`); the guest types it in. No accounts.

### The catch: connecting the players
Two browsers can't find each other on their own. They need:
- A **signalling service** to exchange connection details once (tiny: a few messages per game). Options:
  1. A **small serverless function** we deploy ourselves (e.g. a Cloudflare Worker or similar), free tier is plenty.
  2. A **third-party public signalling server** (e.g. PeerJS's free cloud server): easiest, but it's someone else's service and can disappear.
  3. **Copy-paste codes** (no server at all): each player pastes a long code into the other's game. Works and keeps the game fully static, but is clunky.
- A **STUN server** (free public ones exist) to find each player's address, and for roughly 10–20% of home and mobile networks a **TURN relay** that passes the traffic through (costs a little per gigabyte; free tiers exist).

All of these are external runtime services, which the plan currently rules out (§4.3, §6.4). Online co-op would need that rule relaxed for multiplayer only; single player would stay fully offline.

### What it needs
| Item | Size |
|---|---|
| Networking layer: WebRTC data channel, room codes, signalling client | M |
| Signalling (+ optional TURN) service, deployed and documented; or the copy-paste fallback | S–M |
| State sync: snapshots, interpolation of other entities, prediction of your own gull, event messages | L |
| Join/leave/disconnect handling, pause rules, host-only saving | M |
| Testing on real networks (two homes, phone data) | M, needs you and a friend |

## 4. Designing for two

Co-op should feel different, not just easier:

- **Shared to-do, co-op twists**: the same levels work, but some to-dos get a co-op variant. "Say cheese!" becomes: one gull photobombs, the other snatches *during* the photo.
- **Co-op-only hidden `???` to-dos**: two gulls carry a tray together (Fat bird for two), a tandem dive on the Warden's umbrella (one knocks it, one poops), a double photobomb pose.
- **Scaling**: more vendors on alert, the Warden walks faster and switches targets, heat rises a bit faster; timers stay the same.
- **Friendly chaos**: you can poop on your partner (they shake it off), steal from each other's beak, and rescue each other from nets.
- **Kalle as player 2?** In single player, Kalle is the rival; in co-op the second player could *be* Kalle (a different gull look) and the story adjusts.
- **Camera-friendly levels**: objectives for two players should usually be within a few hundred metres, so split screen isn't always showing two far-apart halves.

## 5. Recommendation

1. **Gamepad support** first (small; also useful on its own).
2. **Multi-gull refactor + local split-screen co-op** as one milestone (M–L), with a performance check on your laptop.
3. Decide about **online**: if you want it, agree on the signalling approach (my suggestion: a small serverless function we own, with copy-paste codes as the offline fallback) and plan it as its own milestone after the level framework.

Best timing: **after the level framework** from the level design docs (or together with it), because levels are where co-op puzzles live, and building the framework "multi-gull ready" from the start avoids redoing it.

## 6. Questions for you

1. Is **local co-op** (same computer, split screen, a gamepad for player 2) enough to start with?
2. Do you want **online co-op** eventually? If so, are you OK with a small online service just for connecting players (single player stays offline)?
3. Should player 2 be **Kalle** (with story tweaks), or just "a second gull" with any look?
