import { stage } from '../arcs';
import { restY } from '../props';
import type { QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { MAP_AND_CONE, ICE_STALL } from './mapAndCone';
import { stallGoods } from './chains';
import { WET_FLOOR, JUKEBOX_HERO, SERVICE_BELL, PEEKABOO } from './mischief';
import { MOOD_SWINGS } from './arc1';
import { at, crowd, gongQuest, gongSwitch, homeDecor, PICNIC, row, served } from './rowKit';
import { sh, shHides, shSpawns, shStations, shSwitches, shSplat } from './relocate';

/**
 * Act 1, stage 4, version two: One Bad Afternoon (M116; plan: docs/design/act1-v2.md). Everybody has a mood now, and a mood can be used: four
 * people in five corners of the square, in two courses, each one's afternoon ruined in a different way, for the flock's tea on the roof.
 *
 *   Sour grapes       the Mapper's cone      (take his map; he chases; taunt him to the stall; he buys comfort food)  west, 100 m
 *                     the Inspector's lunch  (splat his route; he slips; his lunch flies)                              far east, 100 m
 *   Good vibrations   the Dancer's cone      (peck the jukebox; nobody guards an ice cream while dancing)            north-east, 75 m
 *                     the Waiter's bun       (ring the service bell; he runs to it and leaves his tray)               north, 55 m
 */
const MAP_S = { dx: -130, dz: -50 }; // the Mapper (20,-14) -> (-110,-64)
const STALL_S = { dx: -60, dz: -55 }; // the ice cream stall (-8,-27) -> (-68,-82)
const INSP_S = { dx: 70, dz: -40 }; // the inspector's beat (6..26,-20) -> (76..96,-60)
const JUKE_S = { dx: 40, dz: -60 }; // the jukebox (-6,-18) -> (34,-78)
const BELL_S = { dx: 6, dz: -52 };
const PEEK_S = { dx: -58, dz: -70 }; // the Peekaboo bush (-8,-16) -> (-66,-86): the fifth row // waiter (-24,-20) -> (-18,-72), bell (-6,-20) -> (0,-72)

const MAPPER = sh(at(20, -14), MAP_S);
const INSPECTOR = sh(at(16, -20), INSP_S);
const DANCERS = sh(at(-6, -18), JUKE_S);
const WAITER = sh(at(-24, -20), BELL_S);
const PEEKERS_AT = sh(at(-8, -14), PEEK_S);
const HIDE = shHides(PEEKABOO.hides, PEEK_S)[0];
const STALL = shStations([{ ...ICE_STALL, sells: 'icecream' as const, tagBought: 'moodCone' }], STALL_S);

export const BAD_AFTERNOON_QUEST: QuestDef = {
  id: 'picnic',
  title: 'One Bad Afternoon',
  teaser: 'Ruin five afternoons, five ways, for the flock\'s tea.',
  timed: false,
  collect: {
    goal: 'Afternoon. Everybody has a mood now, and a mood can be used. Four people in five corners of the square are about to have a bad afternoon, and the flock wants tea on the roof. Hold T to lure anyone who is angry.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'Tea' },
    courses: [
      { name: 'Sour grapes', unlock: '' },
      { name: 'Good vibrations', unlock: 'opens when the sour grapes are served', where: 'a jukebox to the north-east, a waiter to the north, and a bush far to the north-west.' },
    ],
  },
  objectives: [
    row('mapper', 'Something sweet, bought', 'the Lost Tourist', MAPPER, 'something he bought himself', 1, 'moodCone', {
      victim: 'mapper',
      text: 'Take the cone the Lost Tourist bought',
      outcome: 'Take the cone the Lost Tourist buys to feel better.',
      nudge: 'Furious people crave something sweet, and they follow whatever holds their attention.',
      hint: 'Snatch his map: he chases you. Hold T to taunt so he keeps following, and lead him low to the ice cream stall in the north-west. He buys a cone to feel better, and for a while only has eyes for it: take THAT cone (the ones on the counter are not his), and carry it home.',
      markers: [{ ...MAPPER, r: 4, label: 'Lost Tourist' }, { x: STALL[0].x, z: STALL[0].z - 3, r: 5, label: 'Ice cream stall' }],
      recap: 'You took his map, led him to the stall with a taunt, and took the cone he bought to cheer himself up',
    }),
    row('inspector', 'A packed lunch', 'the Inspector', INSPECTOR, 'something packed', 1, 'inspLunch', {
      victim: 'inspector',
      text: 'Take the Inspector\'s packed lunch',
      outcome: 'Take the Inspector\'s packed lunch.',
      nudge: 'A splat stays wet, and he walks the same route every time.',
      hint: 'He paces back and forth along the quay. Splat (F) the pavement on his route from above; he walks into it, slips, and his lunch flies. Grab it (E) before he gets up.',
      markers: [{ ...INSPECTOR, r: 8, label: 'His route' }],
      recap: 'You splatted his route, he slipped, and you took his lunch',
    }),
    row('dancer', 'A dancer\'s cone', 'the Dancers', DANCERS, 'something to dance with', 2, 'danceCone', {
      victim: 'dancer',
      text: 'Take a Dancer\'s ice cream',
      outcome: 'Take a Dancer\'s ice cream.',
      nudge: 'Music is hard to resist for anyone who is not busy. Dancers do not guard anything.',
      hint: 'Land next to the jukebox and peck it (E). People who are not busy drift over to dance, too happy to guard their cones. Take a dancer\'s ice cream.',
      markers: [{ ...DANCERS, r: 4, label: 'Jukebox' }],
      recap: 'You pecked the jukebox and took a cone from a dancer',
    }),
    row('waiter', 'A tray bun', 'the Waiter', WAITER, 'something from the tray', 2, 'bellBun', {
      victim: 'waiter',
      text: 'Take the Waiter\'s bun',
      outcome: 'Take the Waiter\'s bun.',
      nudge: 'A waiter always comes when somebody rings.',
      hint: 'Ring the little gold service bell on its post (E) from where he cannot see: he comes running, away from his tray. Dive at the bun while he is on his way.',
      markers: [{ x: WAITER.x + 18, z: WAITER.z, r: 3, label: 'Service bell' }, { ...WAITER, r: 3, label: 'Waiter' }],
      recap: 'You rang the bell and took the bun while he came running',
    }),
    row('peek', 'A cone from the bush', 'the Peekers', PEEKERS_AT, 'something dropped in fright', 2, 'booCone', {
      victim: 'peeker',
      text: 'Take a cone from the Peekers',
      outcome: 'Take a cone from the Peekers.',
      nudge: 'Nobody sees a gull in a bush. Nobody expects a honk from one.',
      hint: 'Walk into the green bush and stay still: they cannot see you. When they stand close, tap T (BOO). They jump and drop their cones: grab one (E) and carry it home.',
      markers: [{ ...HIDE, r: 3, label: 'The bush' }],
      recap: 'You hid in the bush, honked BOO and took a dropped cone',
    }),
  ],
};

export const BAD_AFTERNOON_GONG = gongQuest('Tea is served', 'Five things on the blanket first.', 'Ring the gong. Tea is served.');

const person = (sp: NpcSpawn): NpcSpawn => sp;
const cast: NpcSpawn[] = [
  ...shSpawns((MAP_AND_CONE.extraTourists ?? []).slice(0, 1), MAP_S),
  ...shSpawns((WET_FLOOR.extraTourists ?? []).slice(0, 1), INSP_S),
  ...shSpawns(JUKEBOX_HERO.extraTourists, JUKE_S),
  // people with nothing to do who drift to any music
  ...[at(-4, -6), at(8, -4), at(-12, -2)].map((p, i) => person({ ...sh(p, { dx: DANCERS.x + 6, dz: DANCERS.z + 16 }), heading: i, role: 'partygoer', color: [0xc7b5e0, 0xf2a35e, 0x9fd18f][i] })),
  ...shSpawns(SERVICE_BELL.extraTourists, BELL_S),
  ...shSpawns(PEEKABOO.extraTourists, PEEK_S),
  // somebody to be angry at: two ice-cream tourists near the stall
  person({ x: -90, z: -76, heading: 0.6, ice: true, color: 0x7fd1ae }),
  person({ x: -50, z: -88, heading: -1.2, ice: true, color: 0xffc971 }),
];

const FERRY_CROWD: NpcSpawn[] = crowd(5, at(0, -8.5));

const things: PropSpawn[] = [
  ...stallGoods(STALL[0]),
  { type: 'ball', x: 14, y: restY('ball'), z: -30 },
  { type: 'map', x: -20, y: restY('map'), z: -50 },
  { type: 'bottle', x: 36, y: restY('bottle'), z: -50 },
  { type: 'glasses', x: -70, y: restY('glasses'), z: -52 },
  { type: 'flowers', x: 10, y: restY('flowers'), z: -62 },
  { type: 'candy', x: 62, y: restY('candy'), z: -80 },
  { type: 'toy', x: -42, y: restY('toy'), z: -58 },
];

export const ONE_BAD_AFTERNOON = stage(1, 4, {
  name: '1.4 One Bad Afternoon',
  blurb: 'Five people, five ways to spoil an afternoon: lure, slip, dance, ring and hide.',
  intro: { title: 'One Bad Afternoon', text: 'Afternoon. Everybody has a mood now, and a mood can be used. Four people in five corners of the square are about to have a bad afternoon. New: hold T to lure an angry person, wet floors, the jukebox and the service bell. (The bush from the last stage helps too.)' },
  quests: [],
  extraQuests: [BAD_AFTERNOON_QUEST, BAD_AFTERNOON_GONG],
  picnic: { ...PICNIC, guests: 5 },
  triggers: [],
  extraTriggers: [served('mapper', 'icecream', 'moodCone'), served('inspector', 'bun', 'inspLunch'), served('dancer', 'icecream', 'danceCone'), served('waiter', 'bun', 'bellBun'), served('peek', 'icecream', 'booCone')],
  splatZones: shSplat(WET_FLOOR.splatZones, INSP_S),
  // the ice cream kiosk the angry tourist is led to: its counter stands 3 m behind the station spot, where the goods lie (the stalls of the old level came with the city)
  decor: [...homeDecor, { kind: 'kiosk' as const, x: STALL[0].x, z: STALL[0].z + (STALL[0].goods?.dz ?? 0) }],
  hides: [HIDE],
  stations: STALL,
  switches: [...shSwitches(JUKEBOX_HERO.switches, JUKE_S), ...shSwitches(SERVICE_BELL.switches, BELL_S), gongSwitch('tea gong')],
  reactions: [
    { on: 'robbed:mapper', say: 'The Lost Tourist: "My MAP! Where is my map?" (he comes after you)', witness: { role: 'mapper', r: 10, emote: 'anger' } },
    { on: 'bought:mapper', say: 'He buys himself a cone to feel better.', sound: 'pop' },
    { on: 'picnic:mapper', say: 'The Lost Tourist, far below, with a fresh cone in his mind and none in his hand: "...it was RIGHT here."', witness: { role: 'mapper', r: 10, emote: 'facepalm' } },
    { on: 'courseServed:1', say: 'Sour grapes served! The ferry horn sounds and a crowd comes ashore, ready for a party.', sound: 'horn', cast: FERRY_CROWD },
    { on: 'grab:inspLunch', say: 'The Inspector is not amused.', witness: { role: 'inspector', r: 12, emote: 'laugh' } },
    { on: 'picnic:inspector', say: 'The Inspector, sitting where he fell, looks up at the roof: "That is regulation lunch."', witness: { role: 'inspector', r: 10, emote: 'anger' } },
    { on: 'pecked:juke', say: 'The jukebox starts up. Everybody who is not busy drifts over.' },
    { on: 'grab:danceCone', say: 'Still dancing. Still no ice cream.', witness: { role: 'dancer', r: 5, emote: 'laugh' } },
    { on: 'pecked:bell', say: 'The Waiter: "Coming, coming!" (he leaves his tray)', witness: { role: 'waiter', r: 10, emote: 'alert' } },
    { on: 'grab:bellBun', say: 'The Waiter arrives at the bell. Nobody is there. The bun is gone.', witness: { role: 'waiter', r: 12, emote: 'question' } },
    { on: 'boo:peeker', say: 'The Peekers: "AAH! The BUSH honked!"', witness: { role: 'peeker', r: 8, emote: 'alert' } },
    { on: 'grab:booCone', say: 'The bush has an ice cream now.', witness: { role: 'peeker', r: 5, emote: 'anger' } },
    { on: 'picnicFeast', say: 'Tea is served! The flock tucks in, and all over the square five people with a very bad afternoon look up at once.', sound: 'horn' },
    ...['mapper', 'inspector', 'dancer', 'waiter', 'peeker'].map((role) => ({ on: 'picnicFeast', witness: { role, r: 8, emote: 'anger' as const } })),
  ],
  coopRequired: MOOD_SWINGS.coopRequired,
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  strollers: 6,
  start: { x: -2, z: -26 },
  defense: false,
  parTime: 660,
  reward: 'mimic',
});
