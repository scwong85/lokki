# Havoc Hour: the biggest single improvement

Status: **proposal**, nothing built. Companion to `fun-todos.md` and `graphics-refresh.md`.

## 1. The diagnosis

Lokki now has about 45 levels and a lot of systems: tourists, vendors, the Warden, the drone, Kalle, bells, trams, pigeons, dogs, sunbathers, sprinklers. But each system lives in its own level, behind a fixed to-do list. That has three costs:

1. **You play each joke once.** A level is solved, ticked and never opened again. There is no reason to come back tomorrow.
2. **The systems never meet.** The funniest things in a systemic game happen when systems collide (the dog fetches the ball *through the wedding* while the bell rings and the pigeons take the cake). Our level structure prevents exactly that.
3. **Nothing rewards style.** A clumsy snatch and a brilliant five-step chain earn the same tick.

The design pillar says "systemic comedy" and "movement is the toy". The current structure is closer to a puzzle list.

## 2. The proposal in one sentence

**Havoc Hour: a five-minute run in one open Helsinki where every system is live at once, a chaos meter rewards chains and style, a director throws events at you, and the run ends with tomorrow's newspaper front page about what you did.**

It becomes the default thing you do when you open the game. The 45 levels stay as the "story" that teaches each mechanic and unlocks it for Havoc Hour.

Why this and not something else: it is the one change that fixes all three costs at once, and it is mostly **recombination of things already built**, not new content.

## 3. How a run plays

1. **Start:** you pick a district to begin in (or "surprise me"). A five-minute clock starts. No to-do list; a small ticker shows the next two **scoops** (optional goals).
2. **Play:** do anything. Everything scores, and everything chains.
3. **Events:** every 30–45 s the director starts something: a wedding party arrives, the tram runs, a dog owner shows up, the sprinklers arm, a tour group lands, Kalle turns up, the Warden starts his shift.
4. **Heat escalates** as today, so the last minute is frantic: nets, the Warden, the drone.
5. **Final bell:** the cathedral bell ends the run. Slow-motion freeze on whatever is happening.
6. **Front page:** the newspaper spins in with headlines generated from your run, your best photo, your score and rank. One button shares it.

## 4. The four systems that make it work

### 4.1 Chaos meter and chains (the core)
- Every mischief event has a base value (snatch 100, splat 80, woken sunbather 50, ruined photo 150, …). The events already exist as quest events.
- A **chain** stays alive for about 6 s after each event. Each *different* kind of event in a chain raises the multiplier (x2, x3, …); repeating the same trick does not. Variety is rewarded, spam is not.
- **Chain-reaction bonus:** events you caused indirectly (the dog you sent scatters the picnic, the tram you stopped delays the wedding) count for double. This pays players for the Goose-Game style of play.
- **Style tags** pop on screen: "Unseen", "Mid-air", "From 40 m", "Under the net", "Photo finish". These are the lines people quote.
- Getting hit by a deterrent **breaks the chain** (not the run). This gives the city's defences real stakes without ever being a fail state.

### 4.2 The director
- A small seeded scheduler picks events from a pool, weighted so that things land **near each other in time and place**: the wedding walks past the sprinkler lawn, the dog park is next to the picnic, the tram stop is by the photographer.
- It watches the player: quiet for too long → it sends something tempting nearby; chain running hot → it adds a complication (the Warden, Kalle).
- Each event is a short self-contained script using existing actors (most exist as level set-ups today).

### 4.3 The front page
- A headline generator turns the run log into 3–5 headlines from templates with slots:
  - "GULL STEALS 14 ICE CREAMS; VENDORS DEMAND ACTION"
  - "WEDDING ENDS IN SPRINKLER DISASTER, DOG BLAMED"
  - "TRAM DELAYED 40 SECONDS BY 'A BOTTLE AND A VERY SMUG BIRD'"
  - "WARDEN: 'IT KNEW EXACTLY WHAT IT WAS DOING'"
- The biggest chain becomes the lead story with a polaroid taken automatically at its peak.
- The page shows score, a rank ("Petty Thief" … "Public Enemy No. 1"), and the date.
- **This page is the share object.** It is funny on its own, different every run, and carries the game's name and link.

### 4.4 Daily edition
- One **seeded run per day** (seed = date): same events, same order, for everyone. No server needed.
- Share line with the rank and score, like daily puzzle games. Local history of your editions (a newspaper archive screen).
- An optional weekly "special edition" with a rule twist: everything is windy, double dogs, night, winter.

## 5. Co-op in Havoc Hour

This is where co-op becomes the best way to play, not a variant:
- **Shared chain, two contributors.** The multiplier rises on *different kinds* of event, so two gulls doing different jobs build chains twice as fast as two doing the same thing. Synergy is built into the scoring, not bolted on.
- **Combo finishers** from the teamwork mechanics (M25): decoy snatch, mid-air pass, spotted splat and rescue each add a big "Teamwork" multiplier step.
- **Front page for two:** both gulls are named in the headlines ("ACCOMPLICE DISTRACTS CROWD"), with awards for each player.
- Later: **versus edition** (same seed, two gulls, separate scores) for friendly rivalry.

## 6. What keeps people coming back

| Hook | What it is |
|---|---|
| Daily edition | A new shared run every day, two minutes to compare with a friend |
| Rank ladder | Ten ranks; the top ones need real chains |
| **The nest** | Things you steal during runs end up in your nest on a rooftop: a growing, visible collection (caps, the baton, the golden key, a traffic cone). A set bonus per district. This is the long-term collection goal |
| Scoops | 2 optional goals per run from a big pool, each a small story for the front page |
| Unlocks from story levels | Finishing story levels adds their events and skills to Havoc Hour, so the two modes feed each other |

## 7. What is reused and what is new

| Reused (exists) | New |
|---|---|
| All actors and their logic: NPCs, vendors, Warden, drone, Kalle, tram, pigeons, dogs, sunbathers, sprinklers, bells | Chaos meter and chain scoring (pure logic, small) |
| Quest events as the scoring signal | The director: event pool + seeded scheduler |
| Heat and the deterrent arms race | Event scripts: spawning and despawning level set-ups at runtime inside one open level |
| Seeded RNG, snapshot sync, co-op mechanics | Headline generator and the front page screen |
| Emotes, particles, slow motion (M25) | Auto-polaroid at the chain peak |
| | Nest scene and collection save |

The largest technical piece is **running several level set-ups in one session**: today a level owns the whole cast. It needs a "district kit" form of each set-up that can be spawned and removed while the run goes on.

## 8. Milestones

| # | Milestone | Contents | Size |
|---|---|---|---|
| H1 | **Chaos meter prototype** | Chain scoring on top of the existing free-play sandbox at the Market Square; style tags; a plain results screen. Purpose: find out in one evening of play whether chaining is fun | S–M |
| H2 | **Director and events** | Event kits from the market levels (wedding, owl, Warden shift, Kalle, drone), seeded scheduling, five-minute run with the final bell | M–L |
| H3 | **Front page** | Run log, headline generator, auto-polaroid, ranks, share button (image + link) | M |
| H4 | **Open Helsinki** | Senate Square and Esplanadi kits (tram, pigeons, bells, dogs, sunbathers, sprinklers) live in the same run; co-op scoring and front page for two | L |
| H5 | **Daily edition and the nest** | Daily seed, archive, the nest collection, scoops | M |

**H1 is deliberately small and comes first.** If chaining at the Market Square is not fun after tuning, we stop there and have lost little.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Chaining is not actually fun | H1 is a cheap test before anything else is built |
| Performance with every system live | Kits spawn near the player and despawn far away; the director caps live actors; measure in H2 |
| Score chasing kills the gentle tone | No fail state, no penalties beyond a broken chain; headlines carry the humour; ranks are jokes |
| It competes with finishing the districts | Esplanadi E4–E10 and Katajanokka are not needed for Havoc Hour; their mechanics can arrive later as new event kits |
| Co-op desync with many actors | Reuses the host-authoritative snapshot; the M25 district sync is the pattern |

## 10. An honest caveat

This is my best judgement of the highest-leverage change, not a certainty. The cheapest and most reliable improvement is still **your playtest notes**: nothing from M17 onward has been playtested yet, and I cannot feel whether the levels are fun. A single session of notes on what made you laugh and what frustrated you would sharpen every plan here.

## 11. Decisions needed from you

1. **Go or no-go on H1** (the small chaos-meter prototype in the sandbox)?
2. **Run length:** five minutes, or shorter (three) for a more "one more go" feel?
3. **Priority against the open plans:** Havoc Hour before the remaining districts and the F2/F3 co-op work, or after?
