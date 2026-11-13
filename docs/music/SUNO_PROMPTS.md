# Lokki — music brief and Suno prompts

## The sound of the game
Lokki is **gentle slapstick in pastel Helsinki harbour**: a cheeky seagull, orange market tents, ferries, tourists, an umbrella-wielding nemesis. The music should feel like a **Finnish-flavoured silent-comedy score**: warm, playful, a little mischievous, never aggressive. Think *accordion + kantele + pizzicato strings + clarinet + tuba + marimba/glockenspiel + brushed drums*, with a nod to **Finnish tango / iskelmä** (the melancholy-sweet accordion tunes Finns love) played for laughs. No vocals, no heavy electronic sounds, nothing scary. The music must stay out of the way of the gull sound effects (flaps, screeches, splats).

## Make it adaptive (how the game will use it)
The game has natural music states. **Generate the three "market" tracks in the same key and tempo** so the game can crossfade between them as the **heat** rises:

| Track | When it plays | Key / tempo |
|---|---|---|
| 1. Title theme | title screen (M9) | any |
| 2. Market, calm | heat tier 0, free flying | **D major, 96 BPM** |
| 3. Market, wary | heat tiers 1-2 (vendors, scare lines) | **D minor, 96 BPM** |
| 4. Market, alarm | heat tiers 3-4 (nets, the Warden) | **D minor, 96 BPM** (busier) |
| 5. Warden theme | while the Warden hunts you | 108 BPM |
| 6. Timed quest | a quest timer is running (stackable over 2-4) | 120 BPM |
| 7. Grand finale | the ferry-horn finale | 128 BPM |
| 8. Level complete | level-complete screen (stinger, ~15 s) | any |
| 9. Quest fail sting | quest lost (3-5 s) | any |

## How to use Suno
- Turn **Instrumental** on (or put `[Instrumental]` in the lyrics box).
- Paste the **Style** line into "Style of Music". Paste the **Lyrics box** text (structure tags only, no words) if you want to steer the structure.
- Ask for **2-3 minute** tracks, generate several takes, and pick the one that loops best. Trim to a seamless loop in Audacity (cut on a bar line, 5-10 ms crossfade). Suno often ends with a fade or an ending: cut it off.
- If the first take is too busy, add `sparse, minimal percussion`; if too sleepy, add `bouncy, upbeat`.
- Exclude/negative prompt if available: `vocals, choir, heavy metal, dubstep, EDM drops, distorted guitar, horror, epic trailer`.

## The prompts

### 1. Title theme — "Lokki (Gull Theme)"
**Style:** `playful Finnish tango meets silent-movie comedy, accordion lead, kantele, pizzicato strings, clarinet, glockenspiel, upright bass, brushed drums, warm, cheeky, memorable melody, instrumental`
**Lyrics box:** `[Instrumental] [Intro: solo accordion, short] [Main theme: accordion + clarinet, catchy] [Bridge: kantele and pizzicato] [Main theme returns, fuller] [Ending: cheeky final chord]`

### 2. Market, calm — "Morning at Kauppatori" (loop)
**Style:** `light cheerful Finnish folk-jazz, 96 BPM, D major, accordion, kantele, marimba, pizzicato strings, soft brushed drums, walking upright bass, sunny harbour market morning, relaxed, seamless loop, instrumental`
**Lyrics box:** `[Instrumental] [Verse A: accordion melody, light groove] [Verse B: kantele and marimba answer] [Chorus: warm, full, singable] [Verse A] [Chorus] [No fade-out, ends on the tonic]`

### 3. Market, wary — "The City Is Watching" (loop, same tempo as #2)
**Style:** `sneaky comedic tiptoe music, 96 BPM, D minor, pizzicato strings, staccato clarinet, bassoon, muted tuba, soft snare brushes, accordion stabs, mischievous suspense, playful not scary, seamless loop, instrumental`
**Lyrics box:** `[Instrumental] [Sneaking groove, pizzicato bass] [Clarinet melody, staccato] [Chorus: accordion stabs, tension] [Back to sneaking groove] [No fade-out]`

### 4. Market, alarm — "Nets and Umbrellas" (loop, same tempo as #2)
**Style:** `busy comic chase music, 96 BPM half-time feel, D minor, tuba oom-pah, accordion, brass stabs, snare roll, xylophone, whistles, urgent but silly, brass band meets Finnish polka, seamless loop, instrumental`
**Lyrics box:** `[Instrumental] [Oom-pah groove] [Brass melody with xylophone runs] [Chorus: full band, driving] [Short break: snare] [Chorus] [No fade-out]`

### 5. The Gull Warden — nemesis theme
**Style:** `pompous mock-heroic march, 108 BPM, solo tuba and trombone lead, snare drum, piccolo, accordion, comedic self-important bureaucrat, stiff and proud, brass band, hint of Finnish folk, instrumental`
**Lyrics box:** `[Instrumental] [Intro: snare roll and tuba fanfare] [March theme: tuba lead, piccolo countermelody] [Trio: accordion, slightly smug] [March theme returns, bigger] [Comic wrong-note ending]`

### 6. Timed quest — "Tick Tock Snatch" (layer over 2-4)
**Style:** `ticking clock comedy heist music, 120 BPM, pizzicato strings, woodblock ticking, clarinet runs, bouncy upright bass, light snare, building excitement, playful urgency, seamless loop, instrumental`
**Lyrics box:** `[Instrumental] [Ticking woodblock intro] [Groove with pizzicato and clarinet] [Build-up] [Groove] [No fade-out]`

### 7. Grand finale — "Ferry Horn Mayhem"
**Style:** `epic comedic finale, 128 BPM, full brass band and accordion, big ferry horn blasts, timpani, cymbal crashes, galloping strings, triumphant yet silly Finnish carnival energy, instrumental`
**Lyrics box:** `[Instrumental] [Intro: low ferry horn blast] [Fast main theme: brass and accordion] [Chase section: strings galloping] [Triumphant climax] [Loopable end section]`

### 8. Level complete — stinger (~15 s)
**Style:** `short triumphant comedy victory jingle, accordion, glockenspiel, brass, cheerful, ends on a big final chord, 15 seconds, instrumental`

### 9. Quest fail — sting (3-5 s)
**Style:** `very short comedic sad trombone wah-wah, descending, cartoon failure sting, 4 seconds, instrumental`

## Extra ideas
- **Ferry / harbour ambience** (not music): ask for `harbour ambience, seagulls far away, gentle waves, ferry horn in the distance, market chatter, 2 minutes, seamless loop`. Sits under the music at low volume.
- **Cathedral bells** for the north of the map: `church bells ringing in a Nordic city, distant, 60 seconds`.
- A **vendor jingle** (the vendors' hum): `tiny accordion waltz, 20 seconds, loop`.

## Licensing note (decision for you)
The plan says audio comes from **CC0 sources only**. Suno output is licensed under Suno's terms (on the free plan it is **non-commercial** and owned by Suno; on a paid plan you own it and can use it commercially). Because the repo is public and MIT, decide before committing the files: either (a) use a **paid** Suno plan, keep a screenshot/receipt of the plan used when generating, and credit "Music generated with Suno" in the README and credits screen, or (b) keep the audio files **out of the repo** (loaded locally) and only commit the code. I will wire the music player (state-based crossfade by heat tier, timers, Warden and finale) in the M9 audio pass, once you have tracks.
