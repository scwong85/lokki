import type { LevelDef } from './types';
import type { QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { restY } from '../props';
import { TABLE_TOP } from '../../render/decor';
import { BAKER, BLANKET, DOORBELL, HALL_AT, LOAF_STALL, PICNIC, WAITER } from './picnic';

/**
 * P4. The Picnic lab (M111): a small playground level that exercises the engine pieces version two of The Gull Picnic is built from
 * (docs/design/picnic-v2.md): courses, a ritual that waits for customers, a bell that only a thrown thing rings, and the Market Guard.
 * Three rows in two courses; the real stage (M112) spreads them out and adds the rest.
 *   Starters:    the Waiter's tablecloth (he only flourishes when guests sit at his table: drop a bun for the strollers),
 *                the Baker's loaf (the bell is under an awning: a splat does nothing, throw something at it)
 *   Main course: the Guard's coffee (he arrives when the starters are served, patrols, walks over to a noise, and whistles at any picnic item he sees you carry)
 */
const TOP = TABLE_TOP.y + TABLE_TOP.hy;
const TERRACE = { x: WAITER.x - 5, z: WAITER.z }; // the Waiter's terrace table
const GUARD_TABLE = { x: 6, z: -12 };
export const GUARD_ROUNDS = [{ x: 14, z: -8 }, { x: 14, z: -28 }, { x: -2, z: -28 }, { x: -2, z: -8 }];

const row = (id: string, item: string, owner: string, at: { x: number; z: number }, text: string, course: number, o: Omit<QuestDef['objectives'][number], 'id' | 'kind' | 'event' | 'row'>) => ({
  id,
  kind: 'event' as const,
  event: `lab:${id}`,
  row: { reveal: { x: at.x, z: at.z, r: 8, text }, item, owner, course },
  ...o,
});

export const LAB_QUEST: QuestDef = {
  id: 'lab',
  title: 'The Picnic lab',
  teaser: 'Three things for the roof.',
  timed: false,
  collect: {
    goal: 'Put three things on the picnic blanket on the market hall roof.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'The picnic' },
    courses: [
      { name: 'Starters', unlock: '' },
      { name: 'Main course', unlock: 'opens when the starters are served' },
    ],
  },
  objectives: [
    row('cloth', 'A tablecloth', 'the Waiter', WAITER, 'something to sit on', 1, {
      victim: 'waiter',
      text: 'Borrow the Waiter\'s tablecloth',
      hint: 'He only shakes it out for customers. Drop a cinnamon bun by his empty table so the strollers sit down, then catch the cloth in the air (E).',
      markers: [{ x: WAITER.x, z: WAITER.z, r: 3, label: 'The Waiter' }],
    }),
    row('loaf', 'Rye bread', 'the Baker', BAKER, 'something fresh', 1, {
      victim: 'baker',
      text: 'Take the Baker\'s last rye loaf',
      hint: 'The bell is under an awning, so a splat lands on the awning. Throw (Q) something at it: she hurries over, and the loaf is yours.',
      markers: [{ x: DOORBELL.x, z: DOORBELL.z, r: 2.5, label: 'Door bell' }],
    }),
    row('thermos', 'Coffee', 'the Market Guard', GUARD_TABLE, 'something to wash it down', 2, {
      victim: 'marketguard',
      text: 'Take the Market Guard\'s coffee',
      hint: 'He walks his rounds and whistles at any picnic item he sees you carry. A honk draws him off to look; fly home behind the tents.',
      markers: [{ x: GUARD_TABLE.x, z: GUARD_TABLE.z, r: 2.5, label: 'Thermos' }],
    }),
  ],
};

/** The Market Guard: appears when the starters are served (a reaction's `cast`). */
export const MARKET_GUARD: NpcSpawn = {
  x: GUARD_ROUNDS[2].x,
  z: GUARD_ROUNDS[2].z,
  heading: 0,
  role: 'marketguard',
  name: 'Market Guard',
  patrol: GUARD_ROUNDS,
  confiscates: ['waiterCloth', 'rye', 'thermos'],
  investigates: true,
  watch: 'thermos',
  color: 0x2a5ea8,
  hat: 'cap',
  hatColor: 0x1f3f78,
};

const cast: NpcSpawn[] = [
  { x: WAITER.x, z: WAITER.z, heading: Math.PI / 2, role: 'waiter', name: 'Waiter', stationary: true, post: true, holds: 'tablecloth', holdTag: 'waiterCloth', ritual: { every: 20, hold: 2.6, icon: '🤵', toss: 6.5, needs: { count: 2, r: 7 } }, color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
  // two strollers who will sit down for a crumb
  { x: TERRACE.x + 16, z: TERRACE.z + 6, heading: 0, role: 'customer', wander: 8, color: 0xf7a1c4 },
  { x: TERRACE.x + 18, z: TERRACE.z + 4, heading: 0, role: 'customer', wander: 8, color: 0x9ec9f0 },
  { x: BAKER.x, z: BAKER.z, heading: 0, role: 'baker', name: 'Baker', stationary: true, post: true, watch: 'rye', color: 0xfff1d6, hat: 'chef', hatColor: 0xffffff },
];

const things: PropSpawn[] = [
  { type: 'loaf', x: LOAF_STALL.x, y: restY('loaf', TOP), z: LOAF_STALL.z, tag: 'rye' },
  { type: 'thermos', x: GUARD_TABLE.x, y: restY('thermos', TOP), z: GUARD_TABLE.z, tag: 'thermos' },
  { type: 'bun', x: TERRACE.x + 10, y: restY('bun'), z: TERRACE.z + 4 }, // the bait for the Waiter's customers
  { type: 'bottle', x: -10, y: restY('bottle'), z: -10 }, // something to throw at the bell
  { type: 'bottle', x: -2, y: restY('bottle'), z: -10.5 },
];

const served = (id: string, propType: PropSpawn['type'], tag: string) => ({ id: `lab:${id}`, kind: 'propInZone' as const, event: `lab:${id}`, propType, tag, zone: BLANKET });

export const PICNIC_LAB: LevelDef = {
  id: 'picnic-lab',
  name: 'P4. The Picnic lab (engine test)',
  blurb: 'Courses, a waiter who waits for customers, a bell only a thrown thing rings, and the Market Guard.',
  district: 'kauppatori',
  series: 'Picnic lab (engine)',
  quests: [],
  extraQuests: [LAB_QUEST],
  triggers: [],
  extraTriggers: [served('cloth', 'tablecloth', 'waiterCloth'), served('loaf', 'loaf', 'rye'), served('thermos', 'thermos', 'thermos')],
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  crumbs: ['bun'],
  decor: [
    { kind: 'hall', x: HALL_AT.x, z: HALL_AT.z },
    { kind: 'blanket', x: PICNIC.x, z: PICNIC.z, y: PICNIC.y },
    { kind: 'stall', x: LOAF_STALL.x, z: LOAF_STALL.z },
    { kind: 'table', x: TERRACE.x, z: TERRACE.z },
    { kind: 'table', x: GUARD_TABLE.x, z: GUARD_TABLE.z },
  ],
  switches: [{ id: 'doorbell', x: DOORBELL.x, z: DOORBELL.z, label: 'door bell', effect: 'summon', role: 'baker', hitOnly: 'thrown', cooldown: 12 }],
  reactions: [
    { on: 'hit:doorbell', oblivious: { role: 'baker', seconds: 12 }, say: 'The Baker: "Coming!"', repeat: true },
    { on: 'ritual:waiter', nth: 1, say: 'The Waiter: "Et... voilà!" (the customers are in, and up goes the cloth)' },
    { on: 'courseServed:1', say: 'Starters served! The Market Guard starts his rounds.', cast: [MARKET_GUARD] },
    { on: 'whistle:marketguard', say: 'The Market Guard: *PHWEEEEE* "Put that BACK!"', repeat: true },
    { on: 'arrived:noise:marketguard', say: 'The Market Guard looks round. Nobody there. "Hmm."', repeat: true },
    { on: 'discovered:marketguard', say: 'The Market Guard comes back to an empty table. A long, slow whistle.', repeat: true },
  ],
  strollers: 0,
  defense: false,
  start: { x: -2, z: -26 },
  parTime: 300,
};
