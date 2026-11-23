import { stage } from '../arcs';
import { restY } from '../props';
import { QUESTS, type QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { card } from './arc1';
import { BLANKET, GONG_QUEST, HALL_AT, PICNIC, CAPTAIN, THERMOS } from './picnic';

/**
 * Act 1, stage 1, version two: First Light, "Breakfast on the Roof" (M114; plan: docs/design/act1-v2.md). The same idea as the picnic, lighter and
 * with only the first verbs (fly, dive-snatch, carry, drop, land, walk, escape): four rows in two courses, owners 55 to 110 m from the market hall roof.
 *
 *   Early birds     the Selfie Tourist's ice cream (wait for her 3-2-1, dive on the 1, outrun her)     east quay
 *                   the Dockhand's sandwich        (a bun from the far bench, dropped on his spotless quay)   west quay
 *   Second helping  the Captain's coffee           (the ferry horn sends him to the gangway)                 the berth
 *                   the Sleeper's sun hat          (he nods off every half minute)                           far north-east
 * After the four: the breakfast gong on the roof, and every victim looks up.
 * The old First Light stays in the Playground (`first-light-v1`).
 */
const at = (x: number, z: number) => ({ x, z });

// ---- the places (local metres; a test checks they are on land) ----
export const SELFIE = at(38, -44);
export const DOCKHAND = at(-72, -54);
/** The spotless quay in front of him, and the bench the bun lies by, 24 m further west. */
export const MESS = at(-78, -56.5);
export const MESS_ZONE = { minX: DOCKHAND.x - 9, maxX: DOCKHAND.x - 3, minZ: DOCKHAND.z - 5, maxZ: DOCKHAND.z - 0.5 };
export const BENCH = at(-96, -56);
export const SLEEPER = at(84, -66);
export const MAPPER = at(36, -24);
const GANGWAY = at(0, -6.6);
export const GONG = { x: PICNIC.x + 4.4, z: PICNIC.z - 2.4 };

const row = (id: string, item: string, owner: string, place: { x: number; z: number }, text: string, course: number, tag: string, o: Omit<QuestDef['objectives'][number], 'id' | 'kind' | 'event' | 'row'>) => ({
  id,
  kind: 'event' as const,
  event: `picnic:${id}`,
  row: { reveal: { ...place, r: 8, text }, item, owner, course, tag },
  ...o,
});

export const BREAKFAST_QUEST: QuestDef = {
  id: 'picnic',
  title: 'Breakfast on the Roof',
  teaser: 'Fetch breakfast for the flock, from four people across the square.',
  timed: false,
  collect: {
    goal: 'Dawn: the flock is hungry. Bring breakfast to the market hall roof. Everything on the menu belongs to somebody, somewhere in the square.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'Breakfast' },
    courses: [
      { name: 'Early birds', unlock: '' },
      { name: 'Second helping', unlock: 'opens when the early birds are served', where: 'the ferry berth by the roof, and a bench far to the north-east.' },
    ],
  },
  objectives: [
    row('cone', 'Something cold', 'the Selfie Tourist', SELFIE, 'something cold', 1, 'selfieCone', {
      victim: 'selfie',
      text: 'Get the Selfie Tourist\'s ice cream',
      outcome: 'Get the Selfie Tourist\'s ice cream.',
      nudge: 'She is only looking at herself while she counts. And she runs.',
      hint: 'She holds her cone out and counts 3, 2, 1: dive on the 1, her cone is open for two seconds (a red ring means guarded). Then she chases you: keep the cone and stay far from everyone until the bar fills, and carry it home.',
      markers: [{ ...SELFIE, r: 3, label: 'Selfie Tourist' }],
      recap: 'You dived on the 1, outran her and brought the cone home',
    }),
    row('lunch', 'A sandwich', 'the Dockhand', DOCKHAND, 'something to bite into', 1, 'dockLunch', {
      victim: 'dockhand',
      text: 'Take the Dockhand\'s sandwich',
      outcome: 'Take the Dockhand\'s sandwich.',
      nudge: 'He keeps his quay spotless. He would leave anything for a mess.',
      hint: 'A bun lies by the bench far west. Pick it up (E), carry it to the open quay in front of the man in the blue cap and drop it there where he can see it: he marches over to scold it. His sandwich is unguarded for a while: take it and carry it home.',
      markers: [{ ...BENCH, r: 5, label: 'Bench' }, { ...MESS, r: 4, label: 'Spotless quay' }],
      recap: 'You dropped a bun on his spotless quay and took his lunch while he scolded it',
    }),
    row('thermos', 'Coffee', 'the Captain', CAPTAIN, 'something hot', 2, 'thermos', {
      victim: 'captain',
      text: 'Take the Captain\'s coffee',
      outcome: 'Take the Captain\'s coffee.',
      nudge: 'The captain only takes his eyes off his coffee for one thing: his ferry.',
      hint: 'When the ferry comes in (the horn), he hurries to the gangway to greet the passengers. His thermos stays by the bollard: take it then. Missed it? The next ferry is about a minute and a half away.',
      markers: [{ ...THERMOS, r: 2, label: 'Thermos' }],
      recap: 'You waited for the ferry and took his coffee',
    }),
    row('hat', 'A sun hat', 'the Sleeper', SLEEPER, 'something for the sun', 2, 'sunHat', {
      victim: 'sleeper',
      text: 'Borrow the Sleeper\'s sun hat',
      outcome: 'Borrow the Sleeper\'s sun hat.',
      nudge: 'He is awake, then he is not. Wait for the snore.',
      hint: 'He nods off every half minute (the 💤). While he sleeps, take the hat from his head and carry it a long way home. He wakes with a start, and he is not pleased.',
      markers: [{ ...SLEEPER, r: 3, label: 'The Sleeper' }],
      recap: 'You waited for the snore and took his hat',
    }),
  ],
};

/** The breakfast gong: ring it when the four things are on the blanket (no pigeons yet: they come in 1.2). */
export const BREAKFAST_GONG: QuestDef = {
  ...GONG_QUEST,
  title: 'Breakfast is served',
  lockedText: 'Four things on the blanket first.',
  requires: ['picnic'],
  objectives: GONG_QUEST.objectives.map((o) => ({ ...o, outcome: 'Ring the breakfast gong.', markers: [{ ...GONG, r: 1.6, y: PICNIC.y, label: 'Gong' }] })),
};

const person = (sp: NpcSpawn): NpcSpawn => sp;
const cast: NpcSpawn[] = [
  person({ ...SELFIE, heading: Math.PI, ice: true, holdTag: 'selfieCone', role: 'selfie', stationary: true, color: 0xff8fa3 }),
  person({ ...DOCKHAND, heading: Math.PI / 2, holds: 'bun', holdTag: 'dockLunch', role: 'dockhand', stationary: true, hat: 'cap', hatColor: 0x2a5ea8, color: 0x5b8fd6 }),
  person({ ...CAPTAIN, heading: Math.PI, role: 'captain', name: 'Captain', stationary: true, post: true, watch: 'thermos', color: 0x2a5ea8, hat: 'cap', hatColor: 0xffffff }),
  person({ ...SLEEPER, heading: -Math.PI / 2, role: 'sleeper', name: 'Sleeper', stationary: true, post: true, holds: 'cap', holdTag: 'sunHat', ritual: { every: 30, hold: 7, icon: '💤', phase: 10 }, color: 0xf2c06b }),
  // the map tourist of the side order, and two ice-cream tourists near the roof (for two gulls to snatch at once)
  person({ ...MAPPER, heading: 2.2, holds: 'map', look: 'm', color: 0xf7a1c4 }),
  person({ x: -30, z: -28, heading: 0.6, ice: true, color: 0x7fd1ae }),
  person({ x: -23, z: -30, heading: -1.2, ice: true, color: 0xffc971 }),
];

/** The crowd that steps off the ferry when the early birds are served. */
const FERRY_CROWD: NpcSpawn[] = Array.from({ length: 5 }, (_, i) => ({ x: -3 + i * 1.3, z: -8.5, heading: 0, role: 'passenger', wander: 30, color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0][i] }));

const things: PropSpawn[] = [
  { type: 'thermos', x: THERMOS.x, y: restY('thermos'), z: THERMOS.z, tag: 'thermos' },
  { type: 'bun', x: BENCH.x, y: restY('bun'), z: BENCH.z, tag: 'benchBun' },
  // things that are not on the menu (the guests comment on them)
  { type: 'ball', x: 12, y: restY('ball'), z: -20 },
  { type: 'glasses', x: 60, y: restY('glasses'), z: -64 },
  { type: 'flowers', x: -50, y: restY('flowers'), z: -70 },
  { type: 'candy', x: 20, y: restY('candy'), z: -58 },
  { type: 'toy', x: -100, y: restY('toy'), z: -64 },
  { type: 'salmiakki', x: -40, y: restY('salmiakki'), z: -34 },
];

const served = (id: string, propType: PropSpawn['type'], tag: string) => ({ id: `served:${id}`, kind: 'propInZone' as const, event: `picnic:${id}`, propType, tag, zone: BLANKET });

const MAP_SIDE: QuestDef = card(
  QUESTS.find((q) => q.id === 'map') as QuestDef,
  { joke: 'A tourist\'s map blows into the harbour and he marches off to the wrong ferry.', insight: 'Maps float: drop it over the water, not on the quay.', reaction: 'He stares at the sea, then trots to the wrong ferry; the ferry crew shout.' },
);

export const FIRST_LIGHT_V2 = stage(1, 1, {
  timetable: ['ferry'],
  name: '1.1 First Light',
  blurb: 'Dawn: four people across the square have breakfast for the flock. Fly, dive, carry.',
  intro: { title: 'First Light', text: 'Dawn on the Market Square, and the flock is hungry. Bring breakfast to the market hall roof: four things, four owners, spread across the square (the note fills in as you go). Fly with Space, dive with Shift, grab with E.' },
  quests: [],
  triggers: ['mapInSea'],
  extraQuests: [BREAKFAST_QUEST, BREAKFAST_GONG, MAP_SIDE],
  side: [MAP_SIDE.id],
  picnic: { ...PICNIC, guests: 4 },
  extraTriggers: [
    served('cone', 'icecream', 'selfieCone'),
    served('lunch', 'bun', 'dockLunch'),
    served('thermos', 'thermos', 'thermos'),
    served('hat', 'cap', 'sunHat'),
    { id: 'bunAtDock', kind: 'propInZone', event: 'bunAtDock', propType: 'bun', tag: 'benchBun', zone: MESS_ZONE, always: true },
  ],
  decor: [
    { kind: 'hall', x: HALL_AT.x, z: HALL_AT.z },
    { kind: 'blanket', x: PICNIC.x, z: PICNIC.z, y: PICNIC.y },
  ],
  switches: [{ id: 'gong', x: GONG.x, z: GONG.z, y: PICNIC.y, label: 'breakfast gong', effect: 'summon', free: true, cooldown: 3 }],
  reactions: [
    { on: 'snatch:icecream', say: 'The Selfie Tourist: "My ice cream! I was COUNTING!"', witness: { role: 'selfie', r: 14, emote: 'laugh' } },
    { on: 'robbed', witness: { role: 'selfie', r: 16, emote: 'laugh' }, say: 'Hey! My ice cream!', sound: 'yelp' },
    { on: 'picnic:cone', say: 'The Selfie Tourist, far below, scrolls her photos: "Where did my cone... is that it? Up THERE?"', witness: { role: 'selfie', r: 8, emote: 'point' } },
    { on: 'bunAtDock', mood: { role: 'dockhand', mood: 'annoyed' }, send: { role: 'dockhand', goals: [{ x: MESS.x, z: MESS.z, name: 'mess' }] }, oblivious: { role: 'dockhand', seconds: 14 }, say: 'The Dockhand: "My spotless quay!"', sound: 'gasp', witness: { role: 'dockhand', r: 12, emote: 'laugh' } },
    { on: 'picnic:lunch', say: 'The Dockhand looks up from the bun he is scolding: "...that was my SANDWICH."', witness: { role: 'dockhand', r: 8, emote: 'anger' } },
    { on: 'courseServed:1', say: 'Early birds served! The ferry horn sounds and a crowd comes ashore.', sound: 'horn', cast: FERRY_CROWD },
    { on: 'ferryIn', send: { role: 'captain', goals: [{ x: GANGWAY.x, z: GANGWAY.z, name: 'gangway' }] }, oblivious: { role: 'captain', seconds: 16 }, say: 'The Captain: "Ferry\'s in! Welcome aboard, welcome ashore!"', repeat: true },
    { on: 'discovered:captain', say: 'The Captain reaches for his coffee. A long, slow horn of pure rage.', sound: 'horn', witness: { role: 'captain', r: 12, emote: 'laugh' }, repeat: true },
    { on: 'picnic:thermos', say: 'The Captain, to nobody: "Who drinks a captain\'s coffee?"', witness: { role: 'captain', r: 6, emote: 'facepalm' } },
    { on: 'ritual:sleeper', nth: 1, say: 'The Sleeper nods off on his bench, his sun hat tipped over his eyes.' },
    { on: 'picnic:hat', say: 'The Sleeper wakes: "...where is my hat? Is that it? On the ROOF?"', witness: { role: 'sleeper', r: 10, emote: 'point' } },
    { on: 'picnicFeast', say: 'Breakfast is served! The flock tucks in, and all over the square everybody who lost something looks up at once.', sound: 'horn' },
    ...['selfie', 'dockhand', 'captain', 'sleeper'].map((role) => ({ on: 'picnicFeast', witness: { role, r: 8, emote: 'anger' as const } })),
    { on: 'mapInSea', witness: { x: 0, z: -6, r: 14, emote: 'point' }, say: 'The wind took it. Or was it a gull?' },
    { on: 'wrongFerry', sound: 'horn', witness: { x: 0, z: -6, r: 16, emote: 'laugh' } },
    { on: 'gotcha:selfie', say: 'The Selfie Tourist: "Not my cone!"', sound: 'bonk' },
  ],
  coopRequired: [
    { id: 'handoverCoop', title: 'Handover', teaser: 'One snatches, the other catches.', timed: false, objectives: [{ id: 'handover', text: 'Pass something from beak to beak in mid-air', kind: 'event', event: 'coop:handover', hint: 'One gull drops what it carries just in front of the other, who grabs it before it lands (E).' }] },
    { id: 'twoBirds', title: 'Two birds', teaser: 'Two snatches in one breath.', timed: false, objectives: [{ id: 'twoBirds', text: 'Both snatch an ice cream within three seconds', kind: 'event', event: 'coop:snatch', hint: 'Two tourists with ice creams stand near the roof, west: dive on them together.' }] },
  ],
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  strollers: 6,
  start: { x: -2, z: -26 },
  defense: false,
  parTime: 420,
  reward: 'flight',
});
