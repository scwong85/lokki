import { stage } from '../arcs';
import { restY } from '../props';
import type { QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { RUSH_HOUR, STRIKE, TABLECLOTH } from './mischief';
import { THE_WARDEN_STAGE } from './arc1';
import { at, crowd, homeDecor, gongSwitch, PICNIC, row, served } from './rowKit';
import { shSpawns, shSwitches } from './relocate';

/**
 * Act 1, stage 5, version two: The Warden (M117; plan: docs/design/act1-v2.md), the end of the act. Boss day: the Warden walks his rounds
 * with his umbrella up (heat), and the flock sets out to ruin his day in three places, then waits for his lunch and settles it.
 *
 *   Morning rounds  the Queue's cone      (poop the first in line; the panic spreads person to person)     north-east, 96 m
 *                   the Bowlers' cone     (a fast dive bowls the line over like skittles)                  far west, 100 m
 *   Lunch break     the Diners' bun       (yank the tablecloth: the goods fly)                              north, 62 m
 *   The boss        the Warden's sandwich, a hunt, a dodged swing, and a splat while his umbrella is down  by the roof
 */
const RUSH_S = { dx: 60, dz: -45 }; // the queue (-9..0,-11) -> (51..60,-56)
const STRIKE_S = { dx: -80, dz: -55 }; // the bowlers (-26..-20,-14) -> (-106..-100,-69)
const CLOTH_S = { dx: 0, dz: -62 }; // the diners' table (-6,-17) -> (-6,-79)

const QUEUE_AT = at(55, -56);
const BOWLERS_AT = at(-103, -69);
const CLOTH_AT = at(-6, -79);

export const WARDEN_QUEST: QuestDef = {
  id: 'picnic',
  title: 'The Warden\'s Day',
  teaser: 'Ruin the Warden\'s rounds three ways, then settle it at lunch.',
  timed: false,
  collect: {
    goal: 'Dusk, and the Warden is on his rounds, umbrella up. Make a mess he cannot stop in three corners of the square, and take the spoils to the roof. Then wait for his lunch.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'The spoils' },
    courses: [
      { name: 'Morning rounds', unlock: '' },
      { name: 'Lunch break', unlock: 'opens when the morning rounds are ruined' },
    ],
  },
  objectives: [
    row('rush', 'A panic cone', 'the Queue', QUEUE_AT, 'something dropped in a panic', 1, 'rushCone', {
      victim: 'queuer',
      text: 'Take a cone from the panicking Queue',
      outcome: 'Take a cone from the Queue.',
      nudge: 'A fright jumps to whoever stands close.',
      hint: 'Poop (F) on the first person in the ice cream line: they jump, drop their cone and run, and the panic spreads from person to person. Grab a dropped cone.',
      markers: [{ ...QUEUE_AT, r: 6, label: 'The queue' }],
      recap: 'You splatted the first in the queue, the panic spread, and a cone was yours',
    }),
    row('strike', 'A skittle cone', 'the Bowlers', BOWLERS_AT, 'something knocked flying', 1, 'strikeCone', {
      victim: 'bowler',
      text: 'Take a cone from the Bowlers',
      outcome: 'Take a cone from the Bowlers.',
      nudge: 'A fallen person knocks over the next one.',
      hint: 'Dive fast along the line (Shift, with speed): the first falls into the second, the second into the third, like skittles. Grab a cone that flew.',
      markers: [{ ...BOWLERS_AT, r: 5, label: 'The line' }],
      recap: 'You dived fast through the line and took a cone while they were down',
    }),
    row('cloth', 'A bun from the table', 'the Diners', CLOTH_AT, 'something from the table', 2, 'clothBun', {
      victim: 'diner',
      text: 'Take a bun off the Diners\' table',
      outcome: 'Take a bun off the Diners\' table.',
      nudge: 'Everything on a table is held by one cloth.',
      hint: 'Peck the tablecloth\'s corner (E) to yank it: the goods fly off the table. Grab a bun.',
      markers: [{ ...CLOTH_AT, r: 4, label: 'Tablecloth' }],
      recap: 'You yanked the tablecloth and took a bun',
    }),
  ],
};

const nemesis = (THE_WARDEN_STAGE.extraQuests ?? []).find((q) => q.id === 'nemesis') as QuestDef;
/** The boss waits until the Warden's day is ruined. */
export const WARDEN_BOSS: QuestDef = { ...nemesis, requires: ['picnic'], lockedText: 'Ruin his rounds in three places first.' };

const person = (sp: NpcSpawn): NpcSpawn => sp;
const cast: NpcSpawn[] = [
  ...shSpawns(RUSH_HOUR.extraTourists, RUSH_S),
  ...shSpawns(STRIKE.extraTourists, STRIKE_S).map((t, i) => ({ ...t, x: -106 + i * 1.2 + 0, heading: Math.PI })),
  ...shSpawns(TABLECLOTH.extraTourists, CLOTH_S),
  person({ x: -70, z: -58, heading: 0.6, ice: true, color: 0x9ec9f0 }),
  person({ x: 30, z: -36, heading: -1.2, ice: true, color: 0xffd36e }),
];
// the strike line is a row of bowlers: re-lay them in a line at the new spot (the old level laid them out itself)
const BOWLER_LINE = cast.filter((t) => t.role === 'bowler').map((t, i) => ({ ...t, x: BOWLERS_AT.x - 3 + i * 1.2, z: BOWLERS_AT.z, heading: 0 }));
const castFixed = [...cast.filter((t) => t.role !== 'bowler'), ...BOWLER_LINE];

const FERRY_CROWD: NpcSpawn[] = crowd(5, at(0, -8.5));

const things: PropSpawn[] = [
  { type: 'ball', x: 12, y: restY('ball'), z: -30 },
  { type: 'bottle', x: 40, y: restY('bottle'), z: -44 },
  { type: 'glasses', x: -60, y: restY('glasses'), z: -60 },
  { type: 'flowers', x: -30, y: restY('flowers'), z: -62 },
  { type: 'candy', x: 76, y: restY('candy'), z: -70 },
  { type: 'toy', x: -84, y: restY('toy'), z: -80 },
  { type: 'salmiakki', x: 20, y: restY('salmiakki'), z: -70 },
  // the Warden's sandwich is on his bench (the boss chain)
  { type: 'bun', x: -19, y: restY('bun', 0), z: -10, tag: 'wardenSandwich' },
];

export const THE_WARDEN_DAY = stage(1, 5, {
  name: '1.5 The Warden',
  blurb: 'Boss day: ruin the Warden\'s rounds three ways, then catch him at lunch.',
  intro: { title: 'The Warden', text: 'Dusk. The Warden is on his rounds, umbrella up, and he sees everything he faces. Make a mess he cannot stop in three corners of the square, and take the spoils to the roof. Then wait for his lunch. New: panic that spreads, dives that bowl people over, the tablecloth yank.' },
  quests: [],
  extraQuests: [WARDEN_QUEST, WARDEN_BOSS],
  picnic: { ...PICNIC, guests: 4 },
  triggers: [],
  extraTriggers: [served('rush', 'icecream', 'rushCone'), served('strike', 'icecream', 'strikeCone'), served('cloth', 'bun', 'clothBun')],
  decor: homeDecor,
  switches: [...shSwitches(TABLECLOTH.switches, CLOTH_S), gongSwitch('victory gong')],
  reactions: [
    { on: 'spread:5', say: 'PANIC!', witness: { role: 'queuer', r: 14, emote: 'laugh' } },
    { on: 'grab:rushCone', say: 'The queue stops panicking, and notices one cone is missing.', witness: { role: 'queuer', r: 4, emote: 'laugh' } },
    { on: 'grab:strikeCone', say: 'Bowled over, and robbed.', witness: { role: 'bowler', r: 4, emote: 'facepalm' } },
    { on: 'courseServed:1', say: 'The morning rounds are ruined! The ferry horn sounds and a crowd comes ashore: the Warden has more to watch.', sound: 'horn', cast: FERRY_CROWD },
    { on: 'grab:wardenSandwich', hunt: true, say: 'The Warden: "My sandwich!"', sound: 'whistle', witness: { x: -20, z: -10, r: 14, emote: 'laugh' } },
    { on: 'poopWarden', say: 'The Warden, umbrella down, covered in gull: the whole square cheers.', witness: { x: -20, z: -10, r: 18, emote: 'laugh' } },
  ],
  coopRequired: THE_WARDEN_STAGE.coopRequired,
  tourists: [],
  extraTourists: castFixed,
  extraProps: things,
  strollers: 6,
  start: { x: -2, z: -26 },
  defense: true,
  deploy: ['warden'],
  wardenLunch: { at: 18, duration: 40, x: -20, z: -10, repeat: 100 },
  parTime: 660,
  reward: 'quickpoop',
});
