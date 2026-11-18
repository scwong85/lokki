# Act 2: Senaatintori, "Make a scene"

Status: **plan, nothing built.** Follows `arcs.md` (five stages of about five minutes, three solo objectives that are each a chain of 3 to 5 events, two required co-op objectives, mechanics and skills that unlock once and stay). Act 1 ended with everything it taught unlocked; Act 2 adds performance, timing and crowds.

## 1. What changes from Act 1

- **Theme.** The market was about stealing. Senate Square is about **timing and audiences**: photographers counting down, bells that make everyone look up, trams on a timetable, crowds that follow a leader, and a pigeon gang with opinions.
- **The square is already built** (steps, statue, tram line, bell, pigeon gang, quiet zone: M21 to M23), so this act is **content and gating, not new systems**. The only new code is one verb and one skill (below).
- **Old levels are source material again.** Ten Senate levels (S1 to S10) become five stages; their headline puzzles are the objectives. What does not fit moves to the Playground (the Christmas Market is a seasonal variant).

## 2. New things the player learns in Act 2

| Thing | Kind | Introduced | Gated how |
|---|---|---|---|
| **The Steps** (round things roll down lanes) | environment | 2.1 | content only |
| **Pose** (a key that strikes a photobomb pose: wings out, beak open) | **new verb** | 2.2 | `pose` mechanic, locked before 2.2 |
| **Photo moments** (3, 2, 1, click: whatever is in frame is in the photo) | environment | 2.2 | content only |
| **Bells** (everyone looks up at the tower for six seconds) | environment | 2.3 | content only |
| **Trams** (a moving roof, a track that delivers) | environment | 2.3 | content only |
| **Pigeon gang** (win them over with a bun, or scatter them) | environment | 2.4 | content only |
| **Captain's cap / Disguise** | skill and toy | 2.4 | `disguise` mechanic (already in the ladder) |
| **Quiet zone** (noise doubles heat) | environment | 2.5 | content only |
| **Crowds that follow a leader** | environment | 2.5 | content only |

Skills: **Flock call** (2.3), **Disguise** (2.4), and one new skill, **Pigeon Diplomacy** (2.5: after you have fed the gang once, pigeons swarm where you point; small, ground-based Flock call). The first stages award none: Act 1 already gave five. (Decision 2.)

The mechanic ladder in `src/gameplay/mechanics.ts` gets one new entry (`pose`, 2.2) and the `disguise` entry moves from 2.1 to 2.4.

## 3. The five stages

Notation as in `arcs.md`: A, B, C are the solo chains, "(co-op)" the two required partner objectives. *Italics* name the old level a chain comes from. Events marked **new** need a small hook; the rest exist today.

### Stage 2.1: Steps (afternoon; the Cathedral steps, the statue, the hot-dog cart)
Intro beat: the camera rises over the 47 steps; "round things roll".
- **A. Leipäjuusto Downhill** (*Cheese Run*): 1 fly up to the landing and take the round cheese · 2 put it down at the top of the right-hand lane · 3 it rolls down the steps (people on the steps lean away) · 4 it lands in the hot-dog cart · 5 the vendor blames the tourists and you take his sausage.
- **B. Dropped Ice Cream:** 1 land on the steps · 2 grab the cone a tourist dropped · 3 carry it to the statue's pedestal and eat it with the pigeons watching (they give you a look) · 4 get away.
- **C. Hot-dog Hazard:** 1 splat the vendor · 2 he storms off to wash (a goal walk, like the cleaner) · 3 his cart is unattended: take a hot dog · 4 get away. Hidden `???`: roll a beach ball down all 47 steps into a tour group (the first rolling-things gag).
- **(co-op) Relay race:** one gull drops the cheese on the steps, the other grabs it mid-roll (`coop:handover`). **Stairway to heaven:** both gulls land on the statue's head at once (**new**: `coop:statue`).

### Stage 2.2: Say Pigeon! (spring; graduation photos on the steps)
New: the **Pose** key. A photographer counts 3, 2, 1 with a visible clock.
- **A. Class of 2026** (*Say Pigeon!*): 1 pose in photo one (any pose) · 2 photo two: **a different pose** (**new**: the event carries the pose id) · 3 photo three: land *behind* the graduates and pose · 4 the photographer sighs; you are in the newspaper (polaroid caption).
- **B. Cap Toss:** 1 snatch a graduate's cap (a chain starts: the graduate becomes angry, the mood system) · 2 lure him to the photographer with taunt · 3 he asks for his cap back and the photographer takes the picture of you wearing it · 4 get away.
- **C. Camera Shy:** 1 splat the photographer (between photos) · 2 he wipes his lens and his assistant takes over · 3 splat the assistant too · 4 the whole class panics (contagion) and the photo is ruined for good.
- **(co-op) Double bomb:** both gulls in the same photo (`coop:photobomb`). **Duo pose:** both pose together (**new**: `coop:pose`, within a second).

### Stage 2.3: Ding Dong (noon; bells and trams)
New: **bells** ring every 40 seconds with a clock on the tower, and **tram** stops to read.
- **A. Bell Heist** (*Ding Dong*): 1 wait for the bell (the note shows a countdown) · 2 snatch the first sandwich while the grandma looks up · 3 snatch the second before she looks down · 4 get away.
- **B. Lunch Express** (*Tram Surfing*): 1 drop a bottle on the track · 2 the tram stops, the driver climbs out to clear it · 3 take his lunch from the dashboard · 4 get away (the driver chases you along the platform).
- **C. Special Delivery:** 1 take a bun · 2 drop it on the track ahead of the tram · 3 the next tram delivers it to the stop · 4 a confused man at the stop eats it (event **new**: `deliveredByTram`).
- **(co-op) Chime and dash:** both gulls snatch while the bell rings (`coop:snatch`). **Double lunch:** both take something from the tram within five seconds.
- Reward: **Flock call**.

### Stage 2.4: Turf War (evening; the statue and the scaffolding)
New: the **pigeon gang** on the statue; the **captain's cap** (Disguise).
- **A. Statue Diplomacy** (*Turf War*): 1 the gang chases you off the statue · 2 bring them a bun and they make you an honorary pigeon, or drop salmiakki and they scatter · 3 land on the statue's head in peace · 4 tourists photograph the emperor's new hat.
- **B. Hard Hat, Soft Heart** (*The Emperor's New Look*): 1 splat a worker on his break · 2 he gets angry and wants comfort: lure him to the flower stall · 3 sell him flowers: take the bouquet he buys · 4 dress the statue: a hat, the bouquet, glasses (carry and drop on a big zone each).
- **C. Honorary Pigeon:** 1 wear the cap or use Disguise · 2 walk into the gang unnoticed · 3 steal the crumbs they guard · 4 leave without a fight.
- **(co-op) Pigeon bombers:** both splat someone within five seconds (`coop:poopNpc`). **Dressing room:** one gull drops an item, the other picks it up and places it on the statue.
- Reward: **Disguise**.

### Stage 2.5: The Key to the City (arc finale; the ceremony, the library, the concert)
Everything of Acts 1 and 2 is in play. This stage borrows the best of *Concert Night*, *The Library Rule* and *The Key to the City*.
- **A. Ceremony Crashers** (*The Key to the City*): 1 win the pigeons over with a bun · 2 photobomb the front-page photographer with a pose · 3 ring the bell (wait for it) so everyone looks up · 4 take the golden key from the podium · 5 drop it at the statue's foot: the pigeons guard it.
- **B. Shhh!** (*The Library Rule*): 1 walk (do not fly) to the library steps · 2 take three snacks in silence · 3 get shushed once on purpose (a flap) to bring the librarian · 4 splat her while the Warden is out.
- **C. Jumbotron** (*Concert Night*): 1 photobomb the camera crew three times (the big screen shows it) · 2 in the quiet break, caw (Mimic) so every phone rings · 3 steal the conductor's baton · 4 conduct round the stage.
- **(co-op) Ceremony pincer:** one gull lures the guard (taunt), the other takes the key (`coop:decoy`). **Encore:** both gulls splat the same person within five seconds.
- Reward: **Pigeon Diplomacy** (new skill, small). Clearing it opens Act 3.

## 4. Build plan

| # | Milestone | Content |
|---|---|---|
| M65 | **Act 2 stages 2.1 and 2.2, the Pose verb** | `pose` mechanic and key (touch, pad, keyboard), photo events carry the pose id, the two stages and their gate |
| M66 | **Stages 2.3 and 2.4** | bell countdown on the note, delivered-by-tram event, the two stages, Flock call and Disguise rewards |
| M67 | **Stage 2.5 and the arc link** | the finale stage, Pigeon Diplomacy skill, Act 1 clear opens Act 2, Act 2 clear opens Act 3 (still empty) |

Each stage reuses the existing level's cast and chains as data (as in M61 to M63); the Senate scene objects (tram, pigeons, bell) are already created by `setupSenate()`.

## 5. Risks

| Risk | Answer |
|---|---|
| Ten levels squeezed into five stages lose some jokes | the left-over puzzles stay in the Playground and as hidden `???` chains |
| Bell and tram timetables make stages feel slow | the note shows a countdown, the first bell in each stage comes within 15 seconds |
| Pose needs a button on touch and pad | one new touch button (hidden until 2.2) and a stick click on the pad |
| New skill (Pigeon Diplomacy) is more code | keep it to one verb: point and press, a few pigeons run to a spot; can be cut to a reward cosmetic if it grows |

## 6. Decisions needed

1. **Is the stage list right?** (Steps, Say Pigeon!, Ding Dong, Turf War, The Key to the City; Concert Night, the Library and the Christmas Market folded in or moved to the Playground.)
2. **Skills:** Flock call (2.3), Disguise (2.4), new Pigeon Diplomacy (2.5); none in 2.1 and 2.2. Or give a smaller skill to each stage?
3. **Pose as a gated verb** (a key you press; locked before 2.2), or keep photobomb as simply "be in the frame"?
4. **Playtest first?** Act 1 stages have not been played yet; fixing them before building Act 2 may be wiser.
