import { stage } from '../arcs';
import { restY } from '../props';
import { SELFIE_SPOT } from './snackAttack';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { RUSH_HOUR, STRIKE, HONK, TUG_OF_WAR, PEEKABOO, RED_BUTTON, WET_FLOOR, JUKEBOX_HERO } from './mischief';
import { CITY_STRIKES } from './cityStrikes';
import { MAP_AND_CONE } from './mapAndCone';
import { QUESTS, type QuestDef } from '../quests';
import type { LevelDef } from './types';

/** Where the bench bun lies, and the dockhand who keeps the quay spotless. */
const BENCH = { x: -10, z: -12 };
const DOCKHAND = { x: 12, z: -8 };
const DOCK_MESS = { x: 6, z: -10.5 };

/**
 * Act 1, stage 1: First Light. Dawn on the quay. Teaches flying, the dive-snatch and carrying (nothing else is unlocked yet:
 * no poop, honk, tug or toys). Three objectives, each a chain whose steps answer one another; two co-op objectives that two
 * gulls must also finish. Design: docs/design/arcs.md and docs/design/puzzle-quality.md.
 */
export const FIRST_LIGHT = stage(1, 1, {
  timetable: ['ferry'],
  name: '1.1 First Light',
  blurb: 'Dawn on the quay: fly, dive, snatch, carry.',
  intro: { title: 'First Light', text: 'Dawn on the Market Square. Fly with Space, dive with Shift, grab with E. Breakfast is in the tourists\' hands.' },
  quests: [],
  // the map quest's drop-in-the-sea step is detected by this world trigger
  triggers: ['mapInSea'],
  extraQuests: [
    {
      id: 'breakfast',
      title: 'Breakfast',
      teaser: 'Nick an ice cream, and outrun its owner.',
      timed: false,
      chain: true,
      joke: { joke: 'A tourist lost in her selfie loses her ice cream and chases a seagull across the quay while everyone laughs.', insight: 'She is only distracted while she counts down: dive on the 1.', reaction: 'She yells, gives chase, and the crowd points and laughs.' },
      objectives: [
        {
          id: 'snatch',
          text: 'Snatch an ice cream from a tourist',
          kind: 'event',
          event: 'snatch:icecream',
          recap: 'You snatched her ice cream',
          hint: 'A red ring means guarded. The tourist on the quay takes selfies: when she counts 3, 2, 1, dive on the 1, her ice cream is open for two seconds.',
          markers: [{ x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, r: 3, label: 'Selfie tourist' }],
        },
        { id: 'chase', text: 'She is after you', kind: 'event', event: 'robbed', after: 'snatch', recap: 'she chased you across the quay', hint: 'She is angry and chases you. Stay out of her reach.' },
        { id: 'escape', text: 'Lose her', kind: 'escape', after: 'chase', recap: 'and you lost her', hint: 'Keep the ice cream and stay far from everyone until the bar fills.' },
      ],
    },
    { ...(QUESTS.find((q) => q.id === 'map') as QuestDef), chain: true, joke: { joke: 'A tourist\'s map blows into the harbour and he marches off to the wrong ferry.', insight: 'Maps float: drop it over the water, not on the quay.', reaction: 'He stares at the sea, then trots to the wrong ferry; the ferry crew shout.' } },
    {
      id: 'neighbours',
      title: 'Bun voyage',
      teaser: 'Make the dockhand leave his lunch.',
      timed: false,
      chain: true,
      joke: { joke: 'A dockhand so proud of his spotless quay storms off to scold a bun left on it, and his lunch is unguarded.', insight: 'He leaves his post for a mess on the quay.', reaction: 'He is outraged, marches over and scolds the bun; the onlookers laugh when his lunch goes.' },
      objectives: [
        { id: 'bun', text: 'Pick up the bun by the bench (E)', kind: 'event', event: 'grab:benchBun', recap: 'You took the bun from the bench', hint: 'It lies on the ground by the bench: land beside it.', markers: [{ x: BENCH.x, z: BENCH.z, r: 5, label: 'Bench' }] },
        { id: 'mess', text: 'Drop it on the quay in front of the dockhand', kind: 'event', event: 'bunAtDock', after: 'bun', recap: 'dropped it on his spotless quay', hint: 'Put it down (E) on the open quay near the man in the blue cap, where he can see it.', markers: [{ x: DOCK_MESS.x, z: DOCK_MESS.z, r: 5, label: 'Spotless quay' }] },
        { id: 'lunch', text: 'Take his lunch while he scolds the mess', kind: 'event', event: 'grab:dockLunch', after: 'mess', recap: 'and took his lunch while he scolded it', hint: 'He has walked over to the bun and has his back to his sandwich: dive on it.', markers: [{ x: DOCKHAND.x, z: DOCKHAND.z, r: 5, label: 'His lunch' }] },
      ],
    },
  ],
  reactions: [
    { on: 'snatch:icecream', say: 'The selfie tourist: "My ice cream! I was COUNTING!"', witness: { x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, r: 14, emote: 'laugh' } },
    { on: 'robbed', witness: { x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, r: 16, emote: 'laugh' }, say: 'Hey! My ice cream!', sound: 'yelp' },
    { on: 'mapInSea', witness: { x: 0, z: -6, r: 14, emote: 'point' }, say: 'The wind took it. Or was it a gull?' },
    { on: 'wrongFerry', sound: 'horn', witness: { x: 0, z: -6, r: 16, emote: 'laugh' } },
    { on: 'bunAtDock', mood: { role: 'dockhand', mood: 'annoyed' }, send: { role: 'dockhand', goals: [{ x: DOCK_MESS.x, z: DOCK_MESS.z, name: 'mess' }] }, oblivious: { role: 'dockhand', seconds: 14 }, say: 'My spotless quay!', sound: 'gasp', witness: { x: DOCKHAND.x, z: DOCKHAND.z, r: 12, emote: 'laugh' } },
    { on: 'grab:dockLunch', witness: { x: 8, z: -9, r: 16, emote: 'laugh' }, say: 'He never saw it coming.' },
  ],
  coopRequired: [
    {
      id: 'handoverCoop',
      title: 'Handover',
      teaser: 'One snatches, the other catches.',
      timed: false,
      objectives: [{ id: 'handover', text: 'Pass something from beak to beak in mid-air', kind: 'event', event: 'coop:handover', hint: 'One gull drops what it carries just in front of the other, who grabs it before it lands (E).' }],
    },
    {
      id: 'twoBirds',
      title: 'Two birds',
      teaser: 'Two snatches in one breath.',
      timed: false,
      objectives: [{ id: 'twoBirds', text: 'Both snatch an ice cream within three seconds', kind: 'event', event: 'coop:snatch', hint: 'Pick two different tourists and dive together.' }],
    },
  ],
  extraTriggers: [
    { id: 'bunAtDock', kind: 'propInZone', event: 'bunAtDock', propType: 'bun', tag: 'benchBun', zone: { minX: 3, maxX: 9, minZ: -13, maxZ: -8.5 } },
  ],
  tourists: [],
  extraTourists: [
    { x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, heading: Math.PI, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -22, z: -20, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
    { x: 36, z: -24, heading: 2.2, holds: 'map', color: 0xf7a1c4 },
    { x: DOCKHAND.x, z: DOCKHAND.z, heading: Math.PI / 2, holds: 'bun', holdTag: 'dockLunch', role: 'dockhand', stationary: true, hat: 'cap', hatColor: 0x2a5ea8, color: 0x5b8fd6 },
  ],
  extraProps: [{ type: 'bun', x: BENCH.x, y: restY('bun'), z: BENCH.z, tag: 'benchBun' }],
  defense: false,
  parTime: 300,
  reward: 'flight',
});

/**
 * Stages 1.2 to 1.5 are built from earlier levels: take their chain, put the joke card on it, drop the padding tail (a chain ends on
 * its punchline, not on "get away with it", unless someone is chasing you), and show it as a chain.
 */
export const card = (q: QuestDef, joke: { joke: string; insight: string; reaction: string }, recaps: Record<string, string> = {}): QuestDef => ({
  ...q,
  chain: true,
  joke,
  objectives: q.objectives
    .filter((o) => !(o.kind === 'escape' && !q.objectives.some((x) => x.event?.startsWith('robbed'))))
    .map((o) => ({ ...o, recap: recaps[o.id] ?? o.recap })),
});
export const quest = (l: { extraQuests?: QuestDef[] }, id: string): QuestDef => l.extraQuests!.find((q) => q.id === id)!;
/** The Nosy Parkers cluster stands 14 m further east so it does not crowd the honk row. */
const EAST = 14;
const eastQuest = (q: QuestDef): QuestDef => ({ ...q, objectives: q.objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => ({ ...m, x: m.x + EAST })) })) });

/**
 * The old Act 1, stage 2: Fish Market (three short chains: the Clean Freak, Bottle Service, Honk!). Replaced in the campaign by
 * The Gull Picnic (M107, `picnic.ts`), which uses these chains as side orders; kept in the Playground with stage 1.2's mechanics.
 */
const FISH_MARKET_STAGE = stage(1, 2, {
  name: '1.2 Fish Market',
  blurb: 'Poop, toss, honk: people see and hear.',
  intro: { title: 'Fish Market', text: 'Morning at the market hall. People look where they face and listen to noise: use both.' },
  quests: [],
  extraQuests: [
    card(quest(BOMBS_AWAY, 'freak'), { joke: 'A vendor so proud of his sign drops everything to scrub every splat, and his fish plate sits there unguarded.', insight: 'While he scrubs, his back is to the plate.', reaction: 'He scrubs and sweats (his mood), then yells when the fish is gone; the crowd laughs.' }, { splatSign: 'You splatted his shiny sign', steal: 'and took his fish while he scrubbed' }),
    card(eastQuest(quest(NOSY_PARKERS, 'bottleService')), { joke: 'A tourist who never looks away from you spins round at a clattering bottle, and her ice cream is open.', insight: 'People turn towards noise, and the open side is the side they turn from.', reaction: 'She whips round at the noise, then gasps when the cone is gone.' }, { distract: 'A bottle clattered and she turned', snatch: 'and you took her ice cream' }),
    card(quest(HONK, 'honkchain'), { joke: 'Four grown adults admiring the sea jump out of their skin and drop their cones.', insight: 'A honk only drops things for people who have their backs to you.', reaction: 'They jump, the cones fly, the others turn and stare.' }, { honk: 'You honked behind two people', take: 'and took what they dropped' }),
  ],
  reactions: [
    { on: 'grab:honkCone', say: 'A gull flies off with the cone. Its owner stares at an empty hand.', witness: { role: 'tourist', r: 6, emote: 'laugh' } },
    { on: 'snatch:fish', witness: { x: -13, z: -13, r: 14, emote: 'laugh' }, say: 'His fish! He turns round too late.', sound: 'gasp' },
    { on: 'snatch:icecream', witness: { x: 24, z: -12, r: 12, emote: 'alert' } },
    { on: 'honkDrop', witness: { x: 0, z: -10, r: 14, emote: 'laugh' } },
    { on: 'grab:honkCone', say: 'Finders keepers.', sound: 'pop' },
  ],
  coopRequired: [
    (BOMBS_AWAY.coopQuests ?? [])[0],
    {
      id: 'relay',
      title: 'Relay',
      teaser: 'Keep it in the air between you.',
      timed: false,
      objectives: [{ id: 'relay', text: 'Pass something in mid-air twice', kind: 'event', event: 'coop:pass', count: 2, hint: 'One gull tosses (Q) in front of the other, who catches it before it lands. Again.' }],
    },
  ],
  triggers: [],
  extraTriggers: [],
  tourists: [],
  extraTourists: [
    ...(BOMBS_AWAY.extraTourists ?? []),
    ...(NOSY_PARKERS.extraTourists ?? []).slice(0, 1).map((t) => ({ ...t, x: t.x + EAST })),
    ...(HONK.extraTourists ?? []).slice(0, 4),
  ],
  extraProps: [
    ...(BOMBS_AWAY.extraProps ?? []),
    ...(NOSY_PARKERS.extraProps ?? []).map((p) => ({ ...p, x: p.x + EAST })),
  ],
  start: { x: 0, z: -30 },
  defense: false,
  parTime: 300,
  reward: 'fatbird',
});
export const FISH_MARKET: LevelDef = { ...FISH_MARKET_STAGE, id: 'fish-market', name: 'Fish Market (the old 1.2)', series: 'Short stages (old)', arc: undefined, stage: undefined, requires: undefined, reward: undefined, gate: { arc: 1, stage: 2 } };

/**
 * Act 1, stage 3: Strings Attached. The city fights back (heat, spray vendors, scare lines), and you learn the ground tug, hiding in
 * a bush and BOO, and the alarm and sprinkler buttons. Objectives: Tug of War, Spray Tan, Peekaboo; the Big Red Button is a hidden bonus.
 */
export const STRINGS_ATTACHED = stage(1, 3, {
  name: '1.3 Strings Attached',
  blurb: 'The city strikes back. Tug, hide, press the button.',
  intro: { title: 'Strings Attached', text: 'Midday. The vendors have spray bottles and there are lines over the stalls. Heat rises when you are seen: stay clever.' },
  quests: [],
  extraQuests: [
    card(quest(TUG_OF_WAR, 'tugchain'), { joke: 'Three people hold three things three different ways, and each loses it to a different trick.', insight: 'Ground items are tugged, high items snatched from the air, and the spray vendor ends a tug for you.', reaction: 'The soup man sulks, the balloon man gapes, the bun man is sprayed.' }, { soup: 'You tugged the soup out of his hands', balloon: 'snatched the balloon from the air', bun: 'and took the bun' }),
    card(quest(CITY_STRIKES, 'spray'), { joke: 'The vendor aims his spray at you and soaks a man in a top hat instead.', insight: 'The spray goes through whoever stands in front of you.', reaction: 'The rich tourist is drenched, drops his lunch and storms off; the crowd laughs.' }, { soak: 'The vendor soaked the rich tourist', lunch: 'and you took his lunch' }),
    card(quest(PEEKABOO, 'booschain'), { joke: 'A bush honks, and three tourists lose their ice creams.', insight: 'Stay still in the bush: nobody sees you, then BOO.', reaction: 'They jump, drop their cones and look for the ghost.' }, { boo: 'You BOO-ed from the bush', cone: 'and took a cone' }),
    card(quest(RED_BUTTON, 'buttonchain'), { joke: 'Someone presses the sprinkler button and a whole queue is soaked.', insight: 'Buttons are pecked from a safe distance.', reaction: 'The queue is drenched and drops its cones.' }, { alarm: 'You rang the alarm', sprinkle: 'pressed the sprinkler button', cone: 'and took a dropped cone' }),
  ],
  reactions: [
    { on: 'grab:booCone', say: 'The peeker: "The BUSH took my ice cream!"', witness: { role: 'peeker', r: 5, emote: 'anger' } },
    { on: 'grab:btnCone', say: 'A soaked queue watches a gull take the last dry cone.', witness: { role: 'queuer', r: 4, emote: 'laugh' } },
    { on: 'grab:tugSoup', mood: { role: 'soupman', mood: 'upset' }, say: 'My soup!', sound: 'yelp' },
    { on: 'grab:tugBalloon', witness: { x: 20, z: -15, r: 10, emote: 'point' }, say: 'The balloon floats off with a gull.' },
    { on: 'grab:tugBun', mood: { role: 'bunman', mood: 'upset' }, witness: { x: -29, z: -17, r: 8, emote: 'laugh' } },
    { on: 'soaked:rich', witness: { x: -33, z: -17, r: 14, emote: 'laugh' }, sound: 'gasp' },
    { on: 'boo:peeker', witness: { x: -8, z: -14, r: 12, emote: 'alert' } },
    { on: 'grab:booCone', say: 'The bush has an ice cream now.' },
    { on: 'grab:richLunch', witness: { x: -33, z: -17, r: 12, emote: 'laugh' }, say: 'His lunch. Not any more.' },
    { on: 'pecked:alarm', say: 'The queue: "Fire?!" Nobody moves. It is only a test.', witness: { x: 0, z: -12, r: 10, emote: 'question' } },
    { on: 'pecked:sprinkle', say: 'The whole queue: "AAAH! My hair!"', sound: 'gasp', witness: { x: 0, z: -12, r: 10, emote: 'anger' } },
  ],
  secret: ['buttonchain'],
  coopRequired: [
    {
      id: 'teamTug',
      title: 'Team tug',
      teaser: 'Two beaks are stronger than one.',
      timed: false,
      objectives: [{ id: 'teamTug', text: 'Both hold E on the same person\'s hand and pull it away', kind: 'event', event: 'coop:tug', hint: 'Both land beside the man with the soup, hold E and mash. Your pulls add up: the person pulls back half as hard on each of you.' }],
    },
    (CITY_STRIKES.coopQuests ?? [])[0],
  ],
  triggers: [],
  extraTriggers: [],
  tourists: [],
  extraTourists: [
    ...(TUG_OF_WAR.extraTourists ?? []).slice(0, 3),
    ...(CITY_STRIKES.extraTourists ?? []).slice(0, 1),
    ...(PEEKABOO.extraTourists ?? []),
    ...(RED_BUTTON.extraTourists ?? []),
  ],
  hides: PEEKABOO.hides,
  switches: RED_BUTTON.switches,
  start: { x: 0, z: -32 },
  defense: true,
  deploy: ['vendors', 'lines'],
  startHeat: 22,
  parTime: 360,
  reward: 'hawkeye',
});

/**
 * The jukebox as a crowd magnet (M90): the people are not nailed to their spots any more. Everyone who is not busy walks over to the music,
 * so the step is "get five people dancing" and the crowd has to be brought together (the jukebox, or the boom box carried to them).
 */
const crowdParty = (q: QuestDef): QuestDef => ({
  ...q,
  objectives: q.objectives.map((o) =>
    o.id === 'dance'
      ? { ...o, text: 'Get five people dancing', outcome: 'A whole crowd should be dancing.', nudge: 'Music draws everyone who is not busy.', event: 'dancers:5', hint: 'Music draws everyone who is not busy: peck the jukebox (E), or carry the boom box to the crowd (it is heavy: Fat bird).' }
      : o,
  ),
});
const PARTYGOERS = (JUKEBOX_HERO.extraTourists ?? []).map((t) => ({ ...t, stationary: false, post: false, role: 'partygoer' }));

/**
 * Act 1, stage 4: Mood Swings. People have moods: an angry tourist follows a taunting gull to a stall and buys comfort food, a slippery
 * floor trips the inspector, a jukebox makes strangers dance. Objectives: Map and Cone, Wet Floor, Jukebox Hero.
 */
export const MOOD_SWINGS = stage(1, 4, {
  name: '1.4 Mood Swings',
  blurb: 'Anger, comfort food, slippery floors and a jukebox.',
  intro: { title: 'Mood Swings', text: 'Afternoon. Everyone has a mood now, and a mood can be used. Hold T to lure an angry person.' },
  quests: [],
  extraQuests: [
    card(quest(MAP_AND_CONE, 'mapcone'), { joke: 'A lost tourist chases you across the square, buys himself an ice cream to feel better, and you take that too.', insight: 'An angry person who wants comfort follows your taunt to the stall.', reaction: 'He fumes, follows, buys, beams, and then fumes again.' }, { map: 'You took his map', lure: 'he followed you to the ice cream stall', buy: 'bought himself a cone', cone: 'and you took that too' }),
    card(quest(WET_FLOOR, 'wetfloor'), { joke: 'A very serious man in a hi-vis vest walks into a puddle on his own route.', insight: 'A splat stays wet, and he walks the same route every time.', reaction: 'He slips, his lunch flies, the onlookers wince and laugh.' }, { trap: 'You splatted his route', slip: 'he slipped', lunch: 'and his lunch was yours' }),
    card(crowdParty(quest(JUKEBOX_HERO, 'jukechain')), { joke: 'The jukebox plays and the whole square drifts over to dance, too happy to guard their ice creams.', insight: 'Dancers do not guard anything.', reaction: 'They sway, spin, and cheer while a gull takes the cone.' }, { peck: 'You pecked the jukebox', dance: 'five people danced', cone: 'and one dancer lost a cone' }),
  ],
  reactions: [
    { on: 'robbed:mapper', say: 'He bought it to feel better. Now he feels worse.', witness: { role: 'mapper', r: 8, emote: 'anger' } },
    { on: 'grab:danceCone', say: 'Still dancing. Still no ice cream.', witness: { role: 'partygoer', r: 4, emote: 'laugh' } },
    { on: 'grab:inspLunch', witness: { x: 16, z: -20, r: 14, emote: 'laugh' }, say: 'The inspector is not amused.' },
    { on: 'grab:danceCone', witness: { x: -6, z: -18, r: 10, emote: 'heart' } },
    { on: 'bought:mapper', say: 'He feels a little better.', sound: 'pop' },
  ],
  coopRequired: [
    {
      id: 'decoyThief',
      title: 'Decoy and thief',
      teaser: 'One shows off, one steals.',
      timed: false,
      objectives: [{ id: 'decoyThief', text: 'One gull taunts (hold T), the other snatches', kind: 'event', event: 'coop:decoy', hint: 'One gull holds T near the tourists: everyone watches it. The other snatches from behind while they stare.' }],
    },
    {
      id: 'duet',
      title: 'Duet',
      teaser: 'Taunt together.',
      timed: false,
      objectives: [{ id: 'duet', text: 'Both gulls hold T at the same time for three seconds', kind: 'event', event: 'coop:duet', hint: 'Stand near each other and both hold T.' }],
    },
  ],
  triggers: [],
  extraTriggers: [],
  tourists: [],
  extraTourists: [
    ...(MAP_AND_CONE.extraTourists ?? []).slice(0, 1),
    ...(WET_FLOOR.extraTourists ?? []).slice(0, 1),
    ...PARTYGOERS,
    // the rest of the crowd: people with nothing to do who drift to any music
    { x: -18, z: -26, heading: 0.5, role: 'partygoer', color: 0xc7b5e0 },
    { x: 8, z: -24, heading: -2, role: 'partygoer', color: 0xf2a35e },
  ],
  stations: MAP_AND_CONE.stations,
  extraProps: [...(MAP_AND_CONE.extraProps ?? []), { type: 'boombox', x: 14, y: restY('boombox'), z: -30 }],
  splatZones: WET_FLOOR.splatZones,
  switches: JUKEBOX_HERO.switches,
  start: { x: 0, z: -32 },
  defense: false,
  parTime: 330,
  reward: 'mimic',
});

/** The Strike! line stands 40 m east of where it was built so the Warden's bench (west) and the Rush Hour queue (middle) stay clear. */
const STRIKE_SHIFT = 40;

/**
 * Act 1, stage 5: The Warden (arc finale). Panic spreads through a queue, a fast dive bowls people over like skittles, and the
 * Warden himself sits down for lunch with his umbrella down. Objectives: Rush Hour, Strike!, Nemesis.
 */
export const THE_WARDEN_STAGE = stage(1, 5, {
  name: '1.5 The Warden',
  blurb: 'Panic spreads, skittles fall, and the Warden has lunch.',
  intro: { title: 'The Warden', text: 'Dusk. The Warden is on his rounds, umbrella up. Make a mess he cannot stop, then find him at lunch.' },
  quests: [],
  extraQuests: [
    card(quest(RUSH_HOUR, 'rushchain'), { joke: 'One splat in a queue and the whole line panics, one person at a time.', insight: 'A fright jumps to whoever stands close.', reaction: 'Each person jumps, drops their cone and runs; the rest catch it.' }, { splat: 'You splatted the first in the queue', spread: 'the panic reached five people', cone: 'and a cone was yours' }),
    card({ ...quest(STRIKE, 'strikechain'), objectives: quest(STRIKE, 'strikechain').objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => ({ ...m, x: m.x + STRIKE_SHIFT })) })) }, { joke: 'A fast dive bowls a line of tourists over like skittles.', insight: 'A fallen person knocks over the next one.', reaction: 'They topple one after another, ice creams flying.' }, { slam: 'You bowled one over', strike: 'and he took four down with him', cone: 'a cone flew your way' }),
    {
      id: 'nemesis',
      title: 'Nemesis',
      teaser: 'Catch the Warden with his umbrella down.',
      timed: false,
      chain: true,
      joke: { joke: 'The Warden, robbed of his sandwich, swings his umbrella at a gull that is not there, and ends up pooped on with the umbrella stuck in the ground.', insight: 'After a missed swat his umbrella is down for a moment.', reaction: 'He notices, charges, swings and misses, sulks; the crowd cheers.' },
      objectives: [
        { id: 'lunch', text: 'Wait for the Warden to sit down for lunch', kind: 'event', event: 'wardenLunch', latch: true, recap: 'The Warden sat down for lunch', hint: 'He takes a lunch break soon: the level tells you. Until then keep away from him.' },
        { id: 'sandwich', text: 'Take his sandwich from the bench', kind: 'event', event: 'grab:wardenSandwich', latch: true, after: 'lunch', recap: 'you took his sandwich', hint: 'It lies on the bench beside him.', markers: [{ x: -19, z: -10, r: 3, label: 'Sandwich' }] },
        { id: 'hunt', text: 'Let him spot you', kind: 'event', event: 'wardenHunt', after: 'sandwich', recap: 'he came after you', hint: 'Stay in sight, high enough to be safe. He sets off after the thief.' },
        { id: 'dodge', text: 'Dodge his umbrella swing', kind: 'event', event: 'dodge:warden', after: 'hunt', recap: 'his swing missed', hint: 'He swings when you are close. Move sideways just as he swings: the umbrella goes down after a miss.' },
        { id: 'poop', text: 'Poop on the Warden while his umbrella is down', kind: 'event', event: 'poopWarden', after: 'dodge', recap: 'and you pooped on him', hint: 'He sulks for a moment with the umbrella down: drop it from above.', markers: [{ x: -20, z: -10, r: 8, label: 'The Warden' }] },
      ],
    },
  ],
  reactions: [
    { on: 'grab:rushCone', say: 'The queue stops panicking, and notices one cone is missing.', witness: { role: 'queuer', r: 4, emote: 'laugh' } },
    { on: 'grab:strikeCone', say: 'Bowled over, and robbed.', witness: { role: 'bowler', r: 4, emote: 'facepalm' } },
    { on: 'grab:wardenSandwich', hunt: true, say: 'My sandwich!', sound: 'whistle', witness: { x: -20, z: -10, r: 14, emote: 'laugh' } },
    { on: 'poopWarden', witness: { x: -20, z: -10, r: 16, emote: 'laugh' } },
    { on: 'spread:5', say: 'PANIC!', witness: { x: -5, z: -11, r: 14, emote: 'laugh' } },
  ],
  coopRequired: [
    {
      id: 'pincer',
      title: 'Pincer',
      teaser: 'Two gulls, one target.',
      timed: false,
      objectives: [{ id: 'pincer', text: 'Both gulls splat the same person within a few seconds', kind: 'event', event: 'coop:poopNpc', hint: 'Pick one person, and both drop on them together.' }],
    },
    {
      id: 'volley',
      title: 'Volley',
      teaser: 'Keep it in the air.',
      timed: false,
      objectives: [{ id: 'volley', text: 'Pass something back and forth in the air three times', kind: 'event', event: 'coop:volley', hint: 'One tosses (Q), the other catches and tosses it back.' }],
    },
  ],
  triggers: [],
  extraTriggers: [],
  tourists: [],
  extraTourists: [
    ...(RUSH_HOUR.extraTourists ?? []),
    ...(STRIKE.extraTourists ?? []).map((t) => ({ ...t, x: t.x + STRIKE_SHIFT })),
  ],
  extraProps: [{ type: 'bun', x: -19, y: restY('bun', 0), z: -10, tag: 'wardenSandwich' }],
  defense: true,
  deploy: ['warden'],
  wardenLunch: { at: 18, duration: 40, x: -20, z: -10, repeat: 100 },
  start: { x: 0, z: -32 },
  parTime: 420,
  reward: 'quickpoop',
});
