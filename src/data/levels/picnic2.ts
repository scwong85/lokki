import { stage } from '../arcs';
import { restY } from '../props';
import type { QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { TABLE_TOP } from '../../render/decor';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { HONK } from './mischief';
import { card, quest } from './arc1';
import { BLANKET, GONG_QUEST, HALL_AT, PICNIC, RAID_QUEST } from './picnic';
import { MARKET_GUARD } from './picnicLab';

/**
 * Act 1, stage 2, version two: The Gull Picnic (M112; plan: docs/design/picnic-v2.md, engine: M111). The same picnic on the roof of the market
 * hall, after the playtest said "about 5 minutes": the owners are now 55 to 110 m from the roof, every row is a chain (make it happen, grab
 * it, get it home), the rows open in three courses of two, a Market Guard confiscates loot he sees you carry, and pigeons race you for the cone.
 *
 *   Starters      the Waiter's tablecloth   (feed his customers so he flourishes; catch it in the air)       west, by the statue, 113 m
 *                 the Baker's rye loaf      (the bell is under an awning: throw something at it)             north lane, 55 m
 *   Main course   the Fisherman's herring   (a splat is a bite, it brings up a boot, the boot is a monster)  east quay, 56 m
 *                 the Guard's coffee        (a honk draws him off; he whistles at what he sees you carry)    south quay, 25 m
 *   Dessert       the Berry Sellers' punnet (the blind spot between them; their row draws the Guard)         far east, 111 m
 *                 the Diner's vendace       (a honk drops it; the pigeons race you for it, then follow you)  north-west, 66 m
 * After the six: the raid (pigeons on the picnic: a honk or a bun; ignored for a minute they carry off the last item), then the gong.
 */
const TOP = TABLE_TOP.y + TABLE_TOP.hy;
const at = (x: number, z: number) => ({ x, z });

// ---- the places (local metres, all on land; a test checks) ----
export const WAITER = at(-116, -60);
export const TERRACE = at(-121, -60);
export const CUSTOMERS = [at(-104, -66), at(-102, -62)];
export const STATUE = at(-128, -50);
export const BAKER = at(-6, -72);
export const LOAF_STALL = at(-6, -74.5);
export const DOORBELL = at(-12, -69);
export const FISHER = at(40, -32);
export const FLOAT = at(50, -30);
export const CATCH = at(38, -32);
export const GUARD_TABLE = at(4, -12);
export const GUARD_ROUNDS = [at(22, -10), at(22, -26), at(-4, -26), at(-4, -10)];
export const BERRY_STALL = at(88, -62);
export const KIOSK = at(-60, -64);
export const DINER = at(-66, -60);
export const FLOCK_HOME = at(-63, -66);
export const GRANNY = at(-46, -26);
export const CLOCK_BUNS = [at(-30, -12), at(-28, -12.5), at(-32, -11.5)];
export const TAKE_TO = at(-44, -40); // where the raid drops the item it carries off, about 38 m from the roof
export const FERRY_BERTH = at(0, -8.5);

/** The rows: a collection in three courses. */
const row = (id: string, item: string, owner: string, place: { x: number; z: number }, text: string, course: number, tag: string, o: Omit<QuestDef['objectives'][number], 'id' | 'kind' | 'event' | 'row'>) => ({
  id,
  kind: 'event' as const,
  event: `picnic:${id}`,
  row: { reveal: { ...place, r: 8, text }, item, owner, course, tag },
  ...o,
});

export const PICNIC_V2_QUEST: QuestDef = {
  id: 'picnic',
  title: 'The Gull Picnic',
  teaser: 'Throw the flock a picnic on the market hall roof.',
  timed: false,
  collect: {
    goal: 'Throw the flock a picnic on the market hall roof, in three courses. Everything on the menu belongs to somebody, somewhere in the square.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'The picnic' },
    courses: [
      { name: 'Starters', unlock: '' },
      { name: 'Main course', unlock: 'opens when the starters are served', where: 'the east quay, and the Guard\'s table south of the roof.' },
      { name: 'Dessert', unlock: 'opens when the main course is served', where: 'a stall far to the east, and a kiosk to the north-west.' },
    ],
  },
  objectives: [
    row('cloth', 'A tablecloth', 'the Waiter', WAITER, 'something to sit on', 1, 'waiterCloth', {
      victim: 'waiter',
      text: 'Borrow the Waiter\'s chequered tablecloth',
      outcome: 'Borrow the Waiter\'s chequered tablecloth.',
      nudge: 'He only shows off for an audience, and his terrace is empty.',
      hint: 'He shakes out the cloth with a flourish, but only when two guests sit at his table. A cinnamon bun lies by the clock: drop one right by his table (twice, for two guests) and the strollers come to eat it and sit. When he counts 3, 2, 1 and tosses the cloth up, catch it in the air (E), then carry it home.',
      markers: [{ ...WAITER, r: 3, label: 'The Waiter' }, { ...CLOCK_BUNS[0], r: 3, label: 'Buns' }],
      recap: 'You sat his customers down with a bun and caught the cloth mid-flourish',
    }),
    row('loaf', 'Rye bread', 'the Baker', BAKER, 'something fresh', 1, 'rye', {
      victim: 'baker',
      text: 'Take the Baker\'s last rye loaf',
      outcome: 'Take the Baker\'s last rye loaf.',
      nudge: 'She never leaves her loaf, unless somebody is at the door.',
      hint: 'The door bell hangs under the awning, so a splat only hits the awning. Throw (Q) or drop something onto the bell: the nearest bottles are by the statue, back past the café. She hurries over ("Coming!"), and the loaf on her stall is yours.',
      markers: [{ ...DOORBELL, r: 2.5, label: 'Door bell' }, { x: STATUE.x + 4, z: STATUE.z + 3, r: 3, label: 'Bottles' }],
      recap: 'You rang her bell from afar and took the loaf',
    }),
    row('herring', 'Something fishy', 'the Fisherman', FISHER, 'something fishy', 2, 'catch', {
      victim: 'fisher',
      text: 'Get the Fisherman\'s catch',
      outcome: 'Get the Fisherman\'s catch.',
      nudge: 'Anything that splashes near that float gets his full attention. And a bigger splash gets more.',
      hint: 'Poop into the water by his red float (F, from the air): a bite! He reels in and pulls up an old boot. Carry the boot out over the water and drop it by the float: a monster fish, and he reels for ten seconds with his back turned. Take the herring from the bucket behind him.',
      markers: [{ ...FLOAT, r: 2.5, label: 'The float' }],
      recap: 'You faked a bite, then a monster, and took his herring',
    }),
    row('thermos', 'Coffee', 'the Market Guard', GUARD_TABLE, 'something to wash it down', 2, 'thermos', {
      victim: 'marketguard',
      text: 'Take the Market Guard\'s coffee',
      outcome: 'Take the Market Guard\'s coffee.',
      nudge: 'He walks his rounds. He sees everything in front of him, and nothing behind.',
      hint: 'A honk draws him over to look: do it on the far side of the quay, then snatch the thermos off his table. If he sees you carrying it he blows his whistle and it goes straight back. Fly home behind the tents and the hall, which block his sight.',
      markers: [{ ...GUARD_TABLE, r: 2.5, label: 'Thermos' }],
      recap: 'You honked him away, took his coffee and flew home unseen',
    }),
    row('berries', 'Something sweet', 'the Berry Sellers', BERRY_STALL, 'something sweet', 3, 'punnet', {
      victim: 'berryW',
      text: 'Pinch a punnet from the Berry Sellers',
      outcome: 'Pinch a punnet from the Berry Sellers.',
      nudge: 'Two sellers, back to back. They watch the front. Who watches the middle? And who hears the shouting?',
      hint: 'They look outwards and see nothing between them. Land north or south of the stall, walk to the middle (the red rings show what they see) and take the punnet. When they find it gone they shout at each other, and the Guard comes to see: slip out the other way.',
      markers: [{ ...BERRY_STALL, r: 2.5, label: 'The middle' }],
      recap: 'You walked in between them, took the berries and slipped away from the row',
    }),
    row('vendace', 'The main course', 'the Nervous Diner', DINER, 'the main course', 3, 'dinerCone', {
      victim: 'diner',
      text: 'Get the Nervous Diner\'s fried vendace',
      outcome: 'Get the Nervous Diner\'s fried vendace.',
      nudge: 'He nearly drops it every time a pigeon coos. The pigeons know it.',
      hint: 'You cannot snatch it out of his hands. Land close behind him (he faces the kiosk) and honk (tap T): he jumps and drops the cone. The pigeons race you for it: grab it (E) within about four seconds, or they eat it and he buys another. Then they chase you to the roof.',
      markers: [{ x: DINER.x, z: DINER.z + 2.5, r: 2, label: 'Behind him' }],
      recap: 'You honked, beat the pigeons to the cone and brought it home with a flock behind you',
    }),
  ],
};

/** Secret: Granny dozes off on her bench (a ritual); her good scarf goes on the picnic. */
export const SCARF_SECRET: QuestDef = {
  id: 'grannyScarf',
  title: 'Granny\'s good scarf',
  teaser: 'Every picnic needs a napkin.',
  reveal: { ...GRANNY, r: 7, text: 'the finest napkin' },
  timed: false,
  objectives: [{ id: 'scarf', victim: 'granny', text: 'Put Granny\'s scarf on the picnic', kind: 'event', event: 'picnic:scarf', hint: 'She nods off every half minute (the 💤): snatch it from the air while she dozes, and drop it on the blanket.' }],
};

/** Secret: the fisherman's second bite is another boot. */
export const BOOT_SECRET: QuestDef = {
  id: 'oldBoot',
  title: 'The boot',
  teaser: 'The sea gives something back.',
  reveal: { ...FISHER, r: 7, text: 'what the sea gives back' },
  timed: false,
  objectives: [{ id: 'boot', victim: 'fisher', text: 'Serve the old boot at the picnic', kind: 'event', event: 'picnic:boot', hint: 'Make a second splash by his float: he reels in another boot. Keep the first one for the monster fish. Serve this one, if you dare.' }],
};

// ---- side orders: the old Fish Market chains, in the corners the rows leave empty ----
const shift = <T extends { x: number; z: number }>(p: T, dx: number, dz: number): T => ({ ...p, x: p.x + dx, z: p.z + dz });
const moveQuest = (q: QuestDef, dx: number, dz: number): QuestDef => ({ ...q, objectives: q.objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => shift(m, dx, dz)) })) });
const FREAK_D = { dx: -27, dz: -25 };
const BOTTLE_D = { dx: 20, dz: -56 };
const HONK_ROW = [at(-36, -10), at(-31, -10.5), at(-21, -10)];

/** A honk makes him drop the fish too: taking it off the floor counts, and so does the dive; no need to splat first. */
const anyFish = (q: QuestDef): QuestDef => ({ ...q, objectives: q.objectives.map((o) => (o.id === 'steal' ? { ...o, after: undefined, events: ['grab:fish' as const] } : o)) });
const SIDE_FREAK = card(moveQuest(anyFish(quest(BOMBS_AWAY, 'freak')), FREAK_D.dx, FREAK_D.dz), { joke: 'A vendor so proud of his sign drops everything to scrub every splat, and his fish plate sits there unguarded.', insight: 'While he scrubs, his back is to the plate.', reaction: 'He scrubs and sweats, then yells when the fish is gone; the crowd laughs.' }, { splatSign: 'You splatted his shiny sign', steal: 'and took his fish while he scrubbed' });
const SIDE_BOTTLE = card(moveQuest(quest(NOSY_PARKERS, 'bottleService'), BOTTLE_D.dx, BOTTLE_D.dz), { joke: 'A tourist who never looks away from you spins round at a clattering bottle, and her ice cream is open.', insight: 'People turn towards noise, and the open side is the side they turn from.', reaction: 'She whips round at the noise, then gasps when the cone is gone.' }, { distract: 'A bottle clattered and she turned', snatch: 'and you took her ice cream' });
const honkQ = card(quest(HONK, 'honkchain'), { joke: 'Three grown adults admiring the sea jump out of their skin and drop their cones.', insight: 'A honk only drops things for people who have their backs to you.', reaction: 'They jump, the cones fly, the others turn and stare.' }, { honk: 'You honked behind two people', take: 'and took what they dropped' });
const SIDE_HONK: QuestDef = { ...honkQ, objectives: honkQ.objectives.map((o) => ({ ...o, markers: o.markers?.map(() => ({ ...HONK_ROW[1], r: 8, label: 'Tourists' })) })) };

// ---- the cast ----
const person = (sp: NpcSpawn): NpcSpawn => sp;
const cast: NpcSpawn[] = [
  // starters
  person({ ...WAITER, heading: Math.PI / 2, role: 'waiter', name: 'Waiter', stationary: true, post: true, holds: 'tablecloth', holdTag: 'waiterCloth', ritual: { every: 20, hold: 2.6, icon: '🤵', phase: 4, toss: 6.5, lookAt: TERRACE, needs: { count: 2, r: 7 } }, color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 }),
  ...CUSTOMERS.map((c, i) => person({ ...c, heading: 0, role: 'customer', wander: 6, color: i ? 0x9ec9f0 : 0xf7a1c4 })),
  person({ ...BAKER, heading: Math.PI, role: 'baker', name: 'Baker', stationary: true, post: true, watch: 'rye', color: 0xfff1d6, hat: 'chef', hatColor: 0xffffff }),
  // main course (the Guard is cast when the starters are served)
  person({ ...FISHER, heading: -Math.PI / 2, role: 'fisher', name: 'Fisherman', stationary: true, post: true, watch: 'catch', color: 0xf2a35e, hat: 'cap', hatColor: 0x3d4a3a }),
  // dessert
  person({ x: BERRY_STALL.x - 4.4, z: BERRY_STALL.z, heading: Math.PI / 2, role: 'berryW', name: 'Berry Seller', stationary: true, post: true, watch: 'punnet', color: 0xe5484d, hat: 'sun', hatColor: 0xffd36e }),
  person({ x: BERRY_STALL.x + 4.4, z: BERRY_STALL.z, heading: -Math.PI / 2, role: 'berryE', name: 'Berry Seller', stationary: true, post: true, watch: 'punnet', color: 0x6fae6a, hat: 'sun', hatColor: 0xffd36e }),
  person({ x: KIOSK.x, z: KIOSK.z - 1.3, heading: Math.PI, role: 'cook', name: 'Cook', stationary: true, color: 0xffffff, hat: 'chef', hatColor: 0xffffff }),
  person({ ...DINER, heading: 0, role: 'diner', name: 'Nervous Diner', stationary: true, post: true, holds: 'vendace', holdTag: 'dinerCone', color: 0xc7b5e0 }),
  person({ x: KIOSK.x - 0.5, z: KIOSK.z + 3, heading: 0, role: 'queuer', stationary: true, color: 0xffd36e }),
  person({ x: KIOSK.x + 0.6, z: KIOSK.z + 4.6, heading: 0, role: 'queuer', stationary: true, color: 0xb8e0c8 }),
  // secrets
  person({ ...GRANNY, heading: Math.PI / 2, role: 'granny', name: 'Granny', stationary: true, post: true, holds: 'scarf', holdTag: 'grannyScarf', ritual: { every: 30, hold: 6, icon: '💤', phase: 12 }, color: 0xb9a1d6, hat: 'sun', hatColor: 0xe6d9f5 }),
  // side orders
  ...(BOMBS_AWAY.extraTourists ?? []).slice(0, 1).map((t) => ({ ...shift(t, FREAK_D.dx, FREAK_D.dz), signAt: t.signAt && shift(t.signAt, FREAK_D.dx, FREAK_D.dz) })),
  ...(NOSY_PARKERS.extraTourists ?? []).slice(0, 1).map((t) => shift(t, BOTTLE_D.dx, BOTTLE_D.dz)),
  ...HONK_ROW.map((p, i) => person({ ...p, heading: Math.PI, holds: 'icecream' as const, holdTag: 'honkCone', stationary: true, color: [0xf7a1c4, 0x9ec9f0, 0xffd36e][i], x: p.x, z: p.z })),
];

/** The Market Guard of this stage: arrives from the east end of his rounds when the starters are served, and guards every item on the menu. */
export const GUARD: NpcSpawn = { ...MARKET_GUARD, x: 36, z: -10, patrol: GUARD_ROUNDS, confiscates: ['waiterCloth', 'rye', 'catch', 'thermos', 'punnet', 'dinerCone'] };

/** The crowd that steps off the ferry when the starters are served, and the lunch rush when the main course is. */
const FERRY_CROWD: NpcSpawn[] = Array.from({ length: 6 }, (_, i) => ({ x: FERRY_BERTH.x - 3 + i * 1.3, z: FERRY_BERTH.z, heading: 0, role: 'passenger', wander: 30, color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e][i] }));
const LUNCH_RUSH: NpcSpawn[] = Array.from({ length: 8 }, (_, i) => ({ x: -34 + i * 2.4, z: -52 + (i % 2) * 1.5, heading: 0, role: 'lunch', wander: 40, color: [0xffd36e, 0xf7a1c4, 0xb8e0c8, 0x9ec9f0][i % 4] }));

const things: PropSpawn[] = [
  // the picnic's answers (the cloth and the cone are in hands)
  { type: 'loaf', x: LOAF_STALL.x, y: restY('loaf', TOP), z: LOAF_STALL.z, tag: 'rye' },
  { type: 'herring', x: CATCH.x, y: restY('herring'), z: CATCH.z, tag: 'catch' },
  { type: 'thermos', x: GUARD_TABLE.x, y: restY('thermos', TOP), z: GUARD_TABLE.z, tag: 'thermos' },
  { type: 'berries', x: BERRY_STALL.x, y: restY('berries', TOP), z: BERRY_STALL.z, tag: 'punnet' },
  // the bait for the Waiter's customers, by the clock; the things to throw at the bell, by the statue
  ...CLOCK_BUNS.map((b) => ({ type: 'bun' as const, x: b.x, y: restY('bun'), z: b.z })),
  { type: 'bottle', x: STATUE.x + 4, y: restY('bottle'), z: STATUE.z + 3 },
  { type: 'bottle', x: STATUE.x + 5.5, y: restY('bottle'), z: STATUE.z + 2.5 },
  // things that are not on the menu (the guests comment on them)
  { type: 'ball', x: 12, y: restY('ball'), z: -20 },
  { type: 'map', x: -84, y: restY('map'), z: -62 },
  { type: 'glasses', x: 62, y: restY('glasses'), z: -64 },
  { type: 'flowers', x: -76, y: restY('flowers'), z: -70 },
  { type: 'salmiakki', x: 24, y: restY('salmiakki'), z: -50 },
  { type: 'salmiakki', x: -48, y: restY('salmiakki'), z: -30 },
  { type: 'candy', x: 70, y: restY('candy'), z: -68 },
  { type: 'toy', x: -92, y: restY('toy'), z: -56 },
  // the side orders' things
  ...(BOMBS_AWAY.extraProps ?? []).map((p) => shift(p, FREAK_D.dx, FREAK_D.dz)),
  ...(NOSY_PARKERS.extraProps ?? []).map((p) => shift(p, BOTTLE_D.dx, BOTTLE_D.dz)),
];

const served = (id: string, propType: PropSpawn['type'], tag: string) => ({ id: `served:${id}`, kind: 'propInZone' as const, event: `picnic:${id}`, propType, tag, zone: BLANKET });

export const GULL_PICNIC_V2 = stage(1, 2, {
  name: '1.2 The Gull Picnic',
  blurb: 'Six things, six owners, three courses, one picnic on the roof. Poop, toss and honk.',
  intro: { title: 'The Gull Picnic', text: 'Morning. Throw the flock a picnic on the market hall roof, in three courses. Everything on the menu belongs to somebody in the square: find out who has what (the note fills in as you go). New: poop (F), toss (Q), honk (tap T). Watch out for the Market Guard.' },
  quests: [],
  extraQuests: [PICNIC_V2_QUEST, RAID_QUEST, GONG_QUEST, SIDE_FREAK, SIDE_HONK, SIDE_BOTTLE, SCARF_SECRET, BOOT_SECRET],
  side: [SIDE_FREAK.id, SIDE_HONK.id, SIDE_BOTTLE.id],
  secret: [SCARF_SECRET.id, BOOT_SECRET.id],
  picnic: { ...PICNIC, guests: 6, takeTo: TAKE_TO },
  pigeonRace: { on: 'honkDrop:diner', tag: 'dinerCone', owner: 'diner', home: FLOCK_HOME, birds: 6 },
  triggers: [],
  extraTriggers: [
    served('cloth', 'tablecloth', 'waiterCloth'),
    served('loaf', 'loaf', 'rye'),
    served('herring', 'herring', 'catch'),
    served('thermos', 'thermos', 'thermos'),
    served('berries', 'berries', 'punnet'),
    served('vendace', 'vendace', 'dinerCone'),
    served('scarf', 'scarf', 'grannyScarf'),
    served('boot', 'boot', 'oldBoot'),
    // the boot the Fisherman pulls up, dropped back in the water by his float: a monster
    { id: 'bootSplash', kind: 'propInZone', event: 'bootSplash', propType: 'boot', tag: 'bootTool', zone: { minX: FLOAT.x - 2.5, maxX: FLOAT.x + 2.5, minZ: FLOAT.z - 2.2, maxZ: FLOAT.z + 2.2 }, always: true },
  ],
  splatZones: [{ event: 'splash:float', zone: { minX: FLOAT.x - 2.5, maxX: FLOAT.x + 2.5, minZ: FLOAT.z - 2.2, maxZ: FLOAT.z + 2.2 } }],
  crumbs: ['bun'],
  decor: [
    { kind: 'hall', x: HALL_AT.x, z: HALL_AT.z },
    { kind: 'blanket', x: PICNIC.x, z: PICNIC.z, y: PICNIC.y },
    { kind: 'table', x: TERRACE.x, z: TERRACE.z },
    { kind: 'stall', x: LOAF_STALL.x, z: LOAF_STALL.z },
    { kind: 'awning', x: DOORBELL.x, z: DOORBELL.z - 1.2 },
    { kind: 'float', x: FLOAT.x, z: FLOAT.z },
    { kind: 'table', x: GUARD_TABLE.x, z: GUARD_TABLE.z },
    { kind: 'stall', x: BERRY_STALL.x, z: BERRY_STALL.z },
    { kind: 'kiosk', x: KIOSK.x, z: KIOSK.z },
  ],
  switches: [
    { id: 'doorbell', x: DOORBELL.x, z: DOORBELL.z, label: 'door bell', effect: 'summon', role: 'baker', hitOnly: 'thrown', cooldown: 12 },
    { id: 'gong', x: PICNIC.x + 4.4, z: PICNIC.z - 2.4, y: PICNIC.y, label: 'dinner gong', effect: 'summon', free: true, cooldown: 3 },
  ],
  reactions: [
    // starters: the Waiter's flourish, the customers, the Baker and her bell
    { on: 'crumb:1', say: 'A stroller sits down for a bun. One more, and the Waiter has an audience.' },
    { on: 'ritual:waiter', nth: 1, say: 'The Waiter: "Et... voilà!" (the cloth goes up)' },
    { on: 'flourishLost:waiter', say: 'The Waiter bows to an empty table, then looks at his empty hands. "...Monsieur?"', witness: { role: 'customer', r: 8, emote: 'laugh' } },
    { on: 'picnic:cloth', say: 'The Waiter, to his customers: "That is MY good cloth on that roof!"', witness: { role: 'waiter', r: 6, emote: 'anger' } },
    { on: 'hit:doorbell', oblivious: { role: 'baker', seconds: 12 }, say: 'The Baker: "Coming!"', repeat: true },
    { on: 'arrived:bell:baker', nth: 1, say: 'The Baker: "Hello? ...Who rang?"', witness: { role: 'baker', r: 3, emote: 'question' } },
    { on: 'arrived:bell:baker', nth: 2, say: 'The Baker: "Is this a joke?"', mood: { role: 'baker', mood: 'annoyed' }, witness: { role: 'baker', r: 3, emote: 'anger' } },
    { on: 'discovered:baker', say: 'The Baker: "My last loaf! I counted it!"', witness: { role: 'baker', r: 10, emote: 'laugh' }, repeat: true },
    { on: 'picnic:loaf', say: 'The Baker shades her eyes: "...Is that my rye? On the ROOF?"', witness: { role: 'baker', r: 6, emote: 'point' } },
    // the starters are served: a horn, a crowd off the ferry, and the Market Guard starts his rounds
    { on: 'courseServed:1', say: 'Starters served! The ferry horn sounds, a crowd comes ashore, and the Market Guard starts his rounds.', sound: 'horn', cast: [...FERRY_CROWD, GUARD] },
    // main course: the Fisherman's false bites, the boot, the Guard's coffee
    { on: 'splash:float', nth: 1, oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "A bite! It\'s a big one!" (he reels in, wildly) ...it is a boot.', spawn: { type: 'boot', x: FISHER.x - 0.5, z: FISHER.z - 2.2, tag: 'bootTool' }, witness: { role: 'fisher', r: 2, emote: 'alert' } },
    { on: 'splash:float', nth: 2, oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "Another one!" ...another boot.', spawn: { type: 'boot', x: FISHER.x - 1.2, z: FISHER.z + 2.2, tag: 'oldBoot' }, witness: { x: FISHER.x, z: FISHER.z, r: 12, emote: 'laugh' } },
    { on: 'splash:float', oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "This time for sure!"', repeat: true },
    { on: 'bootSplash', oblivious: { role: 'fisher', seconds: 12 }, say: 'The Fisherman: "A MONSTER! It\'s a monster!" (he braces his feet and reels with his back to you)', witness: { x: FISHER.x, z: FISHER.z, r: 12, emote: 'alert' } },
    { on: 'discovered:fisher', say: 'The Fisherman: "...and the small ones are gone too."', witness: { role: 'fisher', r: 12, emote: 'laugh' }, repeat: true },
    { on: 'picnic:herring', say: 'The Fisherman: "Those are MY herring up there!"', witness: { role: 'fisher', r: 6, emote: 'anger' } },
    { on: 'whistle:marketguard', say: 'The Market Guard: *PHWEEEEE* "Put that BACK!"', repeat: true },
    { on: 'arrived:noise:marketguard', say: 'The Market Guard looks round. Nobody there. "Hmm."', repeat: true },
    { on: 'discovered:marketguard', say: 'The Market Guard comes back to an empty table. A long, slow whistle.', repeat: true },
    { on: 'picnic:thermos', say: 'The Market Guard, to nobody: "Who drinks a guard\'s coffee?"', witness: { role: 'marketguard', r: 8, emote: 'facepalm' } },
    // the main course is served: the lunch rush
    { on: 'courseServed:2', say: 'Main course served! The lunch rush fills the square, and the pigeons are out.', cast: LUNCH_RUSH },
    // dessert: the Berry Sellers blame each other and draw the Guard; the Diner, the pigeons, the raid
    { on: 'discovered:berryW', say: 'West Berry Seller: "YOU ate them!"', witness: { role: 'berryE', r: 3, emote: 'question' }, noise: { x: BERRY_STALL.x, z: BERRY_STALL.z, loud: 1.4 }, repeat: true },
    { on: 'discovered:berryE', say: 'East Berry Seller: "I did NOT! YOU ate them!"', witness: { role: 'berryW', r: 3, emote: 'anger' }, noise: { x: BERRY_STALL.x, z: BERRY_STALL.z, loud: 1.4 }, repeat: true },
    { on: 'picnic:berries', say: 'The Berry Sellers look up together, far away: "...oh."', witness: { role: 'berryW', r: 10, emote: 'facepalm' } },
    { on: 'honkDrop:diner', say: 'The Nervous Diner leaps up. The cone flies. "...Why is it always me."', witness: { x: KIOSK.x, z: KIOSK.z, r: 9, emote: 'laugh' } },
    { on: 'pigeonsAteCone', say: 'The Cook pats the Diner on the shoulder and hands him another cone.', witness: { role: 'diner', r: 6, emote: 'facepalm' } },
    { on: 'pigeonsArrive', say: 'The pigeons land on the picnic. Uninvited guests!' },
    { on: 'raidTook', say: 'Somebody on the roof: "Caw." (the pigeons did not like being ignored)', witness: { x: PICNIC.x, z: PICNIC.z, r: 14, emote: 'laugh' } },
    { on: 'picnic:vendace', say: 'The Cook pats the Nervous Diner on the shoulder. Up on the roof, a gull eats his lunch.', witness: { role: 'diner', r: 6, emote: 'facepalm' } },
    { on: 'raidShooed', say: 'The pigeons flap off, then come back to sit politely at the edge. Guests after all.' },
    { on: 'pigeonsFriends', say: 'The Pigeon Gang take the bun and sit politely at the edge. Guests after all.' },
    // the secrets
    { on: 'ritual:granny', nth: 1, say: 'Granny nods off on her bench, her good scarf in her lap.' },
    { on: 'picnic:scarf', say: 'Granny wakes: "Is that my good scarf? As a NAPKIN?"', witness: { role: 'granny', r: 8, emote: 'point' } },
    { on: 'picnic:boot', say: 'The guests take turns drinking from the boot. Very refined.', witness: { role: 'fisher', r: 10, emote: 'laugh' } },
    // the finale: every victim, wherever they are, looks up and shouts at once
    { on: 'picnicFeast', say: 'Dinner is served! The guests tuck in, and all over the square everybody who lost something looks up at once.', sound: 'horn' },
    ...['waiter', 'baker', 'fisher', 'marketguard', 'berryW', 'berryE', 'diner'].map((role) => ({ on: 'picnicFeast', witness: { role, r: 8, emote: 'anger' as const } })),
    { on: 'picnicFeast', say: 'Far away, everybody at once: "MY CLOTH!" "MY LOAF!" "MY HERRING!" "MY COFFEE!" "MY BERRIES!" "MY... why is it always me." Up on the roof: "Caw."' },
    // watchers who catch you
    { on: 'gotcha:baker', say: 'The Baker: "Shoo! Not my rye!"', sound: 'bonk' },
    { on: 'gotcha:fisher', say: 'The Fisherman: "Get your own fish!"', sound: 'bonk' },
    { on: 'gotcha:berryW', say: 'A Berry Seller: "Not today, gull!"', sound: 'bonk' },
    { on: 'gotcha:berryE', say: 'A Berry Seller: "Not today, gull!"', sound: 'bonk' },
    // the side orders (as in the old Fish Market)
    { on: 'grab:honkCone', say: 'A gull flies off with the cone. Its owner stares at an empty hand.', witness: { x: HONK_ROW[1].x, z: HONK_ROW[1].z, r: 8, emote: 'laugh' } },
    { on: 'snatch:fish', witness: { x: -40, z: -38, r: 14, emote: 'laugh' }, say: 'His fish! He turns round too late.', sound: 'gasp' },
    { on: 'snatch:icecream', witness: { x: 30, z: -68, r: 12, emote: 'alert' } },
  ],
  coopRequired: [
    { id: 'passVendace', title: 'Pass it on', teaser: 'From beak to beak in mid-air.', timed: false, objectives: [{ id: 'pass', text: 'Pass something in mid-air', kind: 'event', event: 'coop:pass', hint: 'One gull tosses (Q) in front of the other, who catches it before it lands (E).' }] },
    { id: 'twoSeats', title: 'Two seats at the table', teaser: 'Sit down together.', timed: false, objectives: [{ id: 'seats', text: 'Both gulls sit on the picnic roof after the gong', kind: 'event', event: 'coop:seats', hint: 'Once dinner is served, land on the roof together, both of you.' }] },
  ],
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  strollers: 6,
  start: { x: -2, z: -26 },
  defense: false,
  parTime: 540,
  reward: 'fatbird',
});
