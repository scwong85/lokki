import { stage } from '../arcs';
import { FERRY_DECK } from '../places';
import { restY } from '../props';
import { SELFIE_SPOT } from './snackAttack';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { HONK } from './mischief';
import type { QuestDef } from '../quests';

/** Where the bench bun lies (open quay) and the landing zone beside it. */
const BENCH = { x: -10, z: -12 };

/**
 * Act 1, stage 1: First Light. Dawn on the quay. Teaches flying, the dive-snatch and carrying (nothing else is unlocked yet:
 * no poop, honk, tug or toys). Three objectives, each a chain; two co-op objectives that two gulls must also finish.
 * Design: docs/design/arcs.md, Act 1 stage 1.
 */
export const FIRST_LIGHT = stage(1, 1, {
  name: '1.1 First Light',
  blurb: 'Dawn on the quay: fly, dive, snatch, carry.',
  intro: { title: 'First Light', text: 'Dawn on the Market Square. Fly with Space, dive with Shift, grab with E. Breakfast is in the tourists\' hands.' },
  quests: ['map'],
  extraQuests: [
    {
      id: 'breakfast',
      title: 'Breakfast',
      teaser: 'Nick an ice cream and eat it high up.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'snatch',
          text: 'Snatch an ice cream from a tourist',
          kind: 'event',
          event: 'snatch:icecream',
          hint: 'A red ring means guarded. The tourist on the quay takes selfies: when she counts 3, 2, 1, dive on the 1, her ice cream is open for two seconds.',
          markers: [{ x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, r: 3, label: 'Selfie tourist' }],
        },
        { id: 'roof', text: 'Land on a rooftop with it', kind: 'event', event: 'feast', after: 'snatch', hint: 'Carry the ice cream and land on any roof (buildings are the tall boxes around the square).' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'roof', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
    {
      id: 'neighbours',
      title: 'Neighbours',
      teaser: 'The other gulls want that bun on the ferry.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'land', text: 'Land on the quay by the bench', kind: 'event', event: 'quayLand', hint: 'Glide down onto the open quay (the pale ground) near the bench.', markers: [{ x: BENCH.x, z: BENCH.z, r: 6, label: 'Bench' }] },
        { id: 'bun', text: 'Pick up the bun (E)', kind: 'event', event: 'grab:benchBun', after: 'land', hint: 'It lies on the ground by the bench.' },
        { id: 'ferry', text: 'Drop it on the ferry', kind: 'event', event: 'bunFerry', after: 'bun', hint: 'Carry it to the ferry at the south end of the quay and let go over the deck (E).' },
      ],
    },
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
  triggers: [],
  extraTriggers: [
    { id: 'feast', kind: 'carryLanded', event: 'feast', propType: 'icecream', minY: 6 },
    { id: 'quayLand', kind: 'gullInZone', event: 'quayLand', zone: { minX: BENCH.x - 6, maxX: BENCH.x + 6, minZ: BENCH.z - 5, maxZ: BENCH.z + 5 }, grounded: true },
    { id: 'bunFerry', kind: 'propInZone', event: 'bunFerry', propType: 'bun', tag: 'benchBun', zone: FERRY_DECK },
  ],
  tourists: [],
  extraTourists: [
    { x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, heading: Math.PI, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -22, z: -20, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
    { x: 36, z: -24, heading: 2.2, holds: 'map', color: 0xf7a1c4 },
  ],
  extraProps: [{ type: 'bun', x: BENCH.x, y: restY('bun'), z: BENCH.z, tag: 'benchBun' }],
  defense: false,
  parTime: 300,
  reward: 'flight',
});

/** Stage 1.2 is built from three earlier levels: take their main chain, give it a way out, show it as a chain. */
const chainOf = (q: QuestDef, escapeAfter?: string): QuestDef => ({
  ...q,
  chain: true,
  objectives: escapeAfter && !q.objectives.some((o) => o.kind === 'escape') ? [...q.objectives, { id: 'escape', text: 'Get away with it', kind: 'escape', after: escapeAfter, hint: 'Keep it and stay far from everyone until the bar fills.' }] : q.objectives,
});
const quest = (l: { extraQuests?: QuestDef[] }, id: string): QuestDef => l.extraQuests!.find((q) => q.id === id)!;
/** The Nosy Parkers cluster stands 14 m further east so it does not crowd the honk row. */
const EAST = 14;
const eastQuest = (q: QuestDef): QuestDef => ({ ...q, objectives: q.objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => ({ ...m, x: m.x + EAST })) })) });

/**
 * Act 1, stage 2: Fish Market. Poop and wind, tossing, the honk, and noise: sight and hearing. Three objectives (the Clean Freak,
 * Bottle Service, Honk!), each already a chain, and two co-op objectives.
 */
export const FISH_MARKET = stage(1, 2, {
  name: '1.2 Fish Market',
  blurb: 'Poop, toss, honk: people see and hear.',
  intro: { title: 'Fish Market', text: 'Morning at the market hall. People look where they face and listen to noise: use both.' },
  quests: [],
  extraQuests: [chainOf(quest(BOMBS_AWAY, 'freak'), 'steal'), chainOf(eastQuest(quest(NOSY_PARKERS, 'bottleService')), 'snatch'), chainOf(quest(HONK, 'honkchain'))],
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
