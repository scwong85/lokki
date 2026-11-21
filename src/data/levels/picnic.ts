import { stage } from '../arcs';
import { restY } from '../props';
import type { QuestDef, Marker } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { HALL, TABLE_TOP } from '../../render/decor';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { HONK } from './mischief';
import { card, quest } from './arc1';

/**
 * Act 1, stage 2: The Gull Picnic (M107; design: docs/design/stages-10min.md section 6).
 *
 * The gull throws the flock a picnic on the roof of the little market hall, and everything on the menu belongs to somebody down below.
 * Six rows, found on the spot, each with its own owner, trait and trick (no two alike):
 *   the Waiter's tablecloth   (he tosses it up in a flourish: take it in the air)              ritual + air catch
 *   the Baker's rye loaf      (she runs to the door bell: hit it with something thrown)         toss at a hit-only bell
 *   the Fisherman's herring   (any splash by his float is a bite: poop in the water)            poop as a signal
 *   the Captain's thermos     (when the ferry comes in he greets it: wait for the horn)         the timetable
 *   the Berry Sellers' punnet (back to back, blind between them: walk in from the side)          sight cones
 *   the Nervous Diner's cone  (he jumps at a honk from behind and drops it)                      honk
 * Halfway the Pigeon Gang raids the picnic (honk them off); at the end the dinner gong brings every victim to look up at the roof.
 * Side orders reuse the old Fish Market chains (Clean Freak, Honk!, Bottle Service); two secrets (Granny's scarf, the fisherman's boot).
 */

export const HALL_AT = { x: -14, z: -17 };
export const PICNIC = { x: HALL_AT.x, y: HALL.h, z: HALL_AT.z };
const ROOF: Marker = { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'The picnic' };
/** The blanket zone on the roof: what lies loose inside counts as served. */
export const BLANKET = { minX: PICNIC.x - 3.2, maxX: PICNIC.x + 3.2, minZ: PICNIC.z - 3.2, maxZ: PICNIC.z + 3.2, minY: PICNIC.y - 0.4 };

// the five places, each under 20 s of flight from the roof
export const WAITER = { x: -30, z: -16 };
const DINERS = { x: -35, z: -16 };
export const BAKER = { x: -4.5, z: -19.6 };
export const LOAF_STALL = { x: -4.5, z: -21.4 };
export const DOORBELL = { x: -6.6, z: -12.2 };
export const FISHER = { x: 10, z: -7.6 };
export const CATCH = { x: 12.2, z: -7.7 };
export const FLOAT = { x: 11.5, z: -2.8 };
export const CAPTAIN = { x: -6, z: -8 };
export const THERMOS = { x: -6.8, z: -9.3 };
const GANGWAY = { x: 0, z: -6.6 };
export const BERRY_STALL = { x: 26, z: -18 };
export const KIOSK = { x: 12, z: -24 };
export const DINER = { x: 6, z: -19.5 };
export const GRANNY = { x: -23, z: -11.5 };
export const GONG = { x: PICNIC.x + 4.4, z: PICNIC.z - 2.4 };
/** Where the victims stand to shout up at the roof at the finale: north and east of the hall, each a straight walk from their spot (people walk in straight lines). */
export const SHOUT = { waiter: { x: -18, z: -11 }, captain: { x: -12, z: -11 }, fisher: { x: -9, z: -11.5 }, baker: { x: -7, z: -11 }, diner: { x: -3, z: -12 }, berryW: { x: -5, z: -13 } };
const TOP = TABLE_TOP.y + TABLE_TOP.hy; // the top of a stall

/** The rows: item, owner, the place it is found and the event when it lands on the blanket. */
const row = (id: string, item: string, owner: string, at: { x: number; z: number }, text: string, o: Omit<QuestDef['objectives'][number], 'id' | 'kind' | 'event' | 'row'>) => ({
  id,
  kind: 'event' as const,
  event: `picnic:${id}`,
  row: { reveal: { x: at.x, z: at.z, r: 8, text }, item, owner },
  ...o,
});

export const PICNIC_QUEST: QuestDef = {
  id: 'picnic',
  title: 'The Gull Picnic',
  teaser: 'Throw the flock a picnic on the market hall roof.',
  timed: false,
  collect: { goal: 'Throw the flock a picnic on the market hall roof. Everything on the menu belongs to somebody down below.', marker: ROOF },
  objectives: [
    row('cloth', 'A tablecloth', 'the Waiter', WAITER, 'something to sit on', {
      victim: 'waiter',
      text: 'Borrow the Waiter\'s chequered tablecloth',
      outcome: 'Borrow the Waiter\'s chequered tablecloth.',
      nudge: 'He does love a flourish. He counts himself in, and up it goes.',
      hint: 'Every 20 seconds he counts 3, 2, 1 and tosses the cloth up with a flourish. It is nobody\'s while it is in the air (or on the ground, for a second): fly past and grab it (E), then drop it on the roof.',
      markers: [{ x: WAITER.x, z: WAITER.z, r: 3, label: 'The Waiter' }],
      recap: 'You caught the Waiter\'s tablecloth in mid-flourish',
    }),
    row('loaf', 'Rye bread', 'the Baker', BAKER, 'something fresh', {
      victim: 'baker',
      text: 'Take the Baker\'s last rye loaf',
      outcome: 'Take the Baker\'s last rye loaf.',
      nudge: 'She never leaves her loaf, unless somebody is at the door.',
      hint: 'The bell by the hall door is out of beak\'s reach, but anything thrown (Q) or dropped onto it rings it, a splat too. She hurries over ("Coming!"), and the loaf on her stall is yours.',
      markers: [{ x: DOORBELL.x, z: DOORBELL.z, r: 2.5, label: 'Door bell' }],
      recap: 'You rang the Baker\'s bell from afar and took her loaf',
    }),
    row('herring', 'Something fishy', 'the Fisherman', FISHER, 'something fishy', {
      victim: 'fisher',
      text: 'Get the Fisherman\'s catch',
      outcome: 'Get the Fisherman\'s catch.',
      nudge: 'Anything that splashes near that float gets his full attention.',
      hint: 'Make a splash by his red float: poop into the water there (F, from the air). He thinks it is a bite and reels in, turned to the sea, and the herring at his feet is open.',
      markers: [{ x: FLOAT.x, z: FLOAT.z, r: 2.5, label: 'The float' }],
      recap: 'You faked a bite and took his herring',
    }),
    row('thermos', 'Coffee', 'the Captain', CAPTAIN, 'something to wash it down', {
      victim: 'captain',
      text: 'Take the Captain\'s coffee',
      outcome: 'Take the Captain\'s coffee.',
      nudge: 'The captain only takes his eyes off his coffee for one thing: his ferry.',
      hint: 'When a ferry comes in (the horn), he hurries to the gangway to greet the passengers. His thermos stays by the bollard: take it then. Missed it? The next ferry is about a minute and a half away.',
      markers: [{ x: THERMOS.x, z: THERMOS.z, r: 2, label: 'Thermos' }],
      recap: 'You waited for the ferry and took his coffee',
    }),
    row('berries', 'Something sweet', 'the Berry Sellers', BERRY_STALL, 'something sweet', {
      victim: 'berryW',
      text: 'Pinch a punnet from the Berry Sellers',
      outcome: 'Pinch a punnet from the Berry Sellers.',
      nudge: 'Two sellers, back to back. They watch the front. Who watches the middle?',
      hint: 'They look outwards, east and west, and see nothing behind them. Land north or south of the stall, walk to the middle (the red rings show what they see) and take the punnet on the counter.',
      markers: [{ x: BERRY_STALL.x, z: BERRY_STALL.z, r: 2.5, label: 'The middle' }],
      recap: 'You walked in between them and took the strawberries',
    }),
    row('vendace', 'The main course', 'the Nervous Diner', DINER, 'the main course', {
      victim: 'diner',
      text: 'Get the Nervous Diner\'s fried vendace',
      outcome: 'Get the Nervous Diner\'s fried vendace.',
      nudge: 'He nearly drops it every time a pigeon coos.',
      hint: 'You cannot snatch it out of his hands. Land close behind him (he faces the kiosk) and honk (tap T): he jumps and drops the cone. Grab it before he calms down.',
      markers: [{ x: DINER.x, z: DINER.z + 2.5, r: 2, label: 'Behind him' }],
      recap: 'You honked, he jumped, and the vendace was yours',
    }),
  ],
};

export const RAID_QUEST: QuestDef = {
  id: 'raid',
  title: 'Uninvited guests',
  teaser: 'The Pigeon Gang is on your picnic.',
  timed: false,
  requiresFlag: 'raid',
  hidden: true,
  objectives: [
    {
      id: 'shoo',
      victim: undefined,
      text: 'Get the pigeons off the picnic',
      kind: 'event',
      event: 'raidShooed',
      events: ['pigeonsFriends'],
      hint: 'They mob any gull that comes near the blanket. A honk (T) on the roof scatters them (or win them over with a cinnamon bun).',
      markers: [ROOF],
      recap: 'You saw off the Pigeon Gang',
    },
  ],
};

export const GONG_QUEST: QuestDef = {
  id: 'picnicGong',
  title: 'Dinner is served',
  teaser: 'Ring the gong.',
  lockedText: 'Six things on the blanket, and no pigeons on it, first.',
  timed: false,
  requires: ['picnic', 'raid'],
  objectives: [
    {
      id: 'gong',
      victim: 'baker',
      text: 'Ring the dinner gong on the roof (E)',
      outcome: 'Ring the dinner gong. Table for six.',
      kind: 'event',
      event: 'pecked:gong',
      events: ['hit:gong'],
      hint: 'The brass gong stands on the roof corner by the picnic: peck it (E).',
      markers: [{ x: GONG.x, z: GONG.z, r: 1.6, y: PICNIC.y, label: 'Gong' }],
      showMarker: true,
      recap: 'and rang the dinner gong',
    },
  ],
};

/** Secret: Granny dozes off on her bench (a ritual); her good scarf goes on the picnic. */
export const SCARF_SECRET: QuestDef = {
  id: 'grannyScarf',
  title: 'Granny\'s good scarf',
  teaser: 'Every picnic needs a napkin.',
  reveal: { x: GRANNY.x, z: GRANNY.z, r: 7, text: 'the finest napkin' },
  timed: false,
  objectives: [
    { id: 'scarf', victim: 'granny', text: 'Put Granny\'s scarf on the picnic', kind: 'event', event: 'picnic:scarf', hint: 'She nods off every half minute (the 💤): snatch it from the air while she dozes, and drop it on the blanket.' },
  ],
};

/** Secret: the fisherman's second "bite" is an old boot. Every picnic needs a boot. */
export const BOOT_SECRET: QuestDef = {
  id: 'oldBoot',
  title: 'The boot',
  teaser: 'The sea gives something back.',
  reveal: { x: FISHER.x, z: FISHER.z, r: 7, text: 'what the sea gives back' },
  timed: false,
  objectives: [
    { id: 'boot', victim: 'fisher', text: 'Serve the old boot at the picnic', kind: 'event', event: 'picnic:boot', hint: 'Fake him a second bite: he reels in a boot and throws it on the quay. It is a little heavy.' },
  ],
};

/** Side orders: the old Fish Market chains, moved out of the way of the picnic places. */
const shift = <T extends { x: number; z: number }>(p: T, dx: number, dz: number): T => ({ ...p, x: p.x + dx, z: p.z + dz });
const moveQuest = (q: QuestDef, dx: number, dz: number): QuestDef => ({ ...q, objectives: q.objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => shift(m, dx, dz)) })) });
const FREAK_D = { dx: -27, dz: -25 }; // to the west end of the tents
const BOTTLE_D = { dx: 0, dz: -56 }; // behind the tents
const HONK_ROW = [{ x: 38, z: -34 }, { x: 38, z: -38.5 }, { x: 38, z: -43 }]; // the east quay, looking out to sea

const SIDE_FREAK = card(moveQuest(quest(BOMBS_AWAY, 'freak'), FREAK_D.dx, FREAK_D.dz), { joke: 'A vendor so proud of his sign drops everything to scrub every splat, and his fish plate sits there unguarded.', insight: 'While he scrubs, his back is to the plate.', reaction: 'He scrubs and sweats, then yells when the fish is gone; the crowd laughs.' }, { splatSign: 'You splatted his shiny sign', steal: 'and took his fish while he scrubbed' });
const SIDE_BOTTLE = card(moveQuest(quest(NOSY_PARKERS, 'bottleService'), BOTTLE_D.dx, BOTTLE_D.dz), { joke: 'A tourist who never looks away from you spins round at a clattering bottle, and her ice cream is open.', insight: 'People turn towards noise, and the open side is the side they turn from.', reaction: 'She whips round at the noise, then gasps when the cone is gone.' }, { distract: 'A bottle clattered and she turned', snatch: 'and you took her ice cream' });
const honkQ = card(quest(HONK, 'honkchain'), { joke: 'Three grown adults admiring the sea jump out of their skin and drop their cones.', insight: 'A honk only drops things for people who have their backs to you.', reaction: 'They jump, the cones fly, the others turn and stare.' }, { honk: 'You honked behind two people', take: 'and took what they dropped' });
const SIDE_HONK: QuestDef = { ...honkQ, objectives: honkQ.objectives.map((o) => ({ ...o, markers: o.markers?.map(() => ({ x: 38, z: -38.5, r: 7, label: 'Tourists' })) })) };

const cast: NpcSpawn[] = [
  // the picnic's owners
  { x: WAITER.x, z: WAITER.z, heading: Math.PI / 2, role: 'waiter', name: 'Waiter', stationary: true, post: true, holds: 'tablecloth', holdTag: 'waiterCloth', ritual: { every: 20, hold: 2.6, icon: '🤵', phase: 6, toss: 6.5, lookAt: DINERS }, color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
  { x: DINERS.x, z: DINERS.z + 2, heading: -Math.PI / 2, role: 'diner2', stationary: true, color: 0xf7a1c4 },
  { x: DINERS.x, z: DINERS.z - 2, heading: -Math.PI / 2, role: 'diner2', stationary: true, color: 0x9ec9f0 },
  { x: BAKER.x, z: BAKER.z, heading: 0, role: 'baker', name: 'Baker', stationary: true, post: true, watch: 'rye', color: 0xfff1d6, hat: 'chef', hatColor: 0xffffff },
  { x: FISHER.x, z: FISHER.z, heading: -Math.PI / 2, role: 'fisher', name: 'Fisherman', stationary: true, post: true, watch: 'catch', color: 0xf2a35e, hat: 'cap', hatColor: 0x3d4a3a },
  { x: CAPTAIN.x, z: CAPTAIN.z, heading: Math.PI, role: 'captain', name: 'Captain', stationary: true, post: true, watch: 'thermos', color: 0x2a5ea8, hat: 'cap', hatColor: 0xffffff },
  { x: BERRY_STALL.x - 4.4, z: BERRY_STALL.z, heading: Math.PI / 2, role: 'berryW', name: 'Berry Seller', stationary: true, post: true, watch: 'punnet', color: 0xe5484d, hat: 'sun', hatColor: 0xffd36e },
  { x: BERRY_STALL.x + 4.4, z: BERRY_STALL.z, heading: -Math.PI / 2, role: 'berryE', name: 'Berry Seller', stationary: true, post: true, watch: 'punnet', color: 0x6fae6a, hat: 'sun', hatColor: 0xffd36e },
  { x: KIOSK.x, z: KIOSK.z - 1.3, heading: Math.PI, role: 'cook', name: 'Cook', stationary: true, color: 0xffffff, hat: 'chef', hatColor: 0xffffff },
  { x: DINER.x, z: DINER.z, heading: 0, role: 'diner', name: 'Nervous Diner', stationary: true, post: true, holds: 'vendace', holdTag: 'dinerCone', color: 0xc7b5e0 },
  { x: KIOSK.x - 0.5, z: KIOSK.z + 3, heading: 0, role: 'queuer', stationary: true, color: 0xffd36e },
  { x: KIOSK.x + 0.6, z: KIOSK.z + 4.6, heading: 0, role: 'queuer', stationary: true, color: 0xb8e0c8 },
  { x: GRANNY.x, z: GRANNY.z, heading: Math.PI / 2, role: 'granny', name: 'Granny', stationary: true, post: true, holds: 'scarf', holdTag: 'grannyScarf', ritual: { every: 30, hold: 6, icon: '💤', phase: 12 }, color: 0xb9a1d6, hat: 'sun', hatColor: 0xe6d9f5 },
  // the side orders' people
  ...(BOMBS_AWAY.extraTourists ?? []).slice(0, 1).map((t) => ({ ...shift(t, FREAK_D.dx, FREAK_D.dz), signAt: t.signAt && shift(t.signAt, FREAK_D.dx, FREAK_D.dz) })),
  ...(NOSY_PARKERS.extraTourists ?? []).slice(0, 1).map((t) => shift(t, BOTTLE_D.dx, BOTTLE_D.dz)),
  ...HONK_ROW.map((p, i) => ({ x: p.x, z: p.z, heading: -Math.PI / 2, holds: 'icecream' as const, holdTag: 'honkCone', stationary: true, color: [0xf7a1c4, 0x9ec9f0, 0xffd36e][i] })),
];

const things: PropSpawn[] = [
  // the picnic answers (the cloth and the cone are in hands)
  { type: 'loaf', x: LOAF_STALL.x, y: restY('loaf', TOP), z: LOAF_STALL.z, tag: 'rye' },
  { type: 'herring', x: CATCH.x, y: restY('herring'), z: CATCH.z, tag: 'catch' },
  { type: 'thermos', x: THERMOS.x, y: restY('thermos'), z: THERMOS.z, tag: 'thermos' },
  { type: 'berries', x: BERRY_STALL.x, y: restY('berries', TOP), z: BERRY_STALL.z, tag: 'punnet' },
  // things to throw at the door bell, and things that are not on the menu (the guests comment on them)
  { type: 'bottle', x: -2, y: restY('bottle'), z: -10.5 },
  { type: 'bottle', x: -10, y: restY('bottle'), z: -10 },
  { type: 'ball', x: 2, y: restY('ball'), z: -14 },
  { type: 'map', x: -20, y: restY('map'), z: -24 },
  { type: 'glasses', x: 18, y: restY('glasses'), z: -12 },
  { type: 'flowers', x: -26, y: restY('flowers'), z: -20 },
  { type: 'salmiakki', x: 20, y: restY('salmiakki'), z: -22 },
  { type: 'salmiakki', x: -38, y: restY('salmiakki'), z: -28 },
  { type: 'bun', x: 4, y: restY('bun'), z: -26 },
  { type: 'bun', x: -18, y: restY('bun'), z: -9 },
  { type: 'candy', x: 30, y: restY('candy'), z: -26 },
  { type: 'toy', x: -32, y: restY('toy'), z: -9 },
  // the side orders' things
  ...(BOMBS_AWAY.extraProps ?? []).map((p) => shift(p, FREAK_D.dx, FREAK_D.dz)),
  ...(NOSY_PARKERS.extraProps ?? []).map((p) => shift(p, BOTTLE_D.dx, BOTTLE_D.dz)),
];

const served = (id: string, propType: PropSpawn['type'], tag: string) => ({ id: `served:${id}`, kind: 'propInZone' as const, event: `picnic:${id}`, propType, tag, zone: BLANKET });

/** What the guests say about things put on the blanket that are not on the menu (by prop type). */
export const PICNIC_COMMENTS: Partial<Record<PropSpawn['type'], string>> = {
  bottle: 'A bottle. The guests look at it, then at you.',
  map: 'A map. Now the pigeons know where we live.',
  glasses: 'Sunglasses. Very chic. Not edible.',
  flowers: 'Flowers! Somebody nibbles one. Somebody regrets it.',
  ball: 'A ball. Nobody knows what to do with it.',
  salmiakki: 'Salmiakki. The guests shuffle away from it.',
  bun: 'A cinnamon bun! Lovely, but it is not on the menu.',
  candy: 'Sweets. The guests squabble over them.',
  toy: 'A teddy. It gets a seat at the table.',
  icecream: 'An ice cream! Gone in one gulp. Not on the menu, though.',
  fish: 'More fish. Nobody complains.',
};

export const GULL_PICNIC = stage(1, 2, {
  name: '1.2 The Gull Picnic',
  blurb: 'Six things, six owners, one picnic on the roof. Poop, toss and honk.',
  intro: { title: 'The Gull Picnic', text: 'Morning. Throw the flock a picnic on the market hall roof: everything on the menu belongs to somebody down below. Find out who has what (the note fills in as you go). New: poop (F), toss (Q), honk (tap T).' },
  timetable: ['ferry'],
  ferryGap: 85,
  quests: [],
  extraQuests: [PICNIC_QUEST, RAID_QUEST, GONG_QUEST, SIDE_FREAK, SIDE_HONK, SIDE_BOTTLE, SCARF_SECRET, BOOT_SECRET],
  side: [SIDE_FREAK.id, SIDE_HONK.id, SIDE_BOTTLE.id],
  secret: [SCARF_SECRET.id, BOOT_SECRET.id],
  picnic: { ...PICNIC, raidAt: 3, guests: 6 },
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
  ],
  splatZones: [{ event: 'splash:float', zone: { minX: FLOAT.x - 2.5, maxX: FLOAT.x + 2.5, minZ: FLOAT.z - 2.2, maxZ: FLOAT.z + 2.2 } }],
  decor: [
    { kind: 'hall', x: HALL_AT.x, z: HALL_AT.z },
    { kind: 'blanket', x: PICNIC.x, z: PICNIC.z, y: PICNIC.y },
    { kind: 'stall', x: LOAF_STALL.x, z: LOAF_STALL.z },
    { kind: 'stall', x: BERRY_STALL.x, z: BERRY_STALL.z },
    { kind: 'kiosk', x: KIOSK.x, z: KIOSK.z },
    { kind: 'table', x: DINERS.x, z: DINERS.z },
    { kind: 'float', x: FLOAT.x, z: FLOAT.z },
  ],
  switches: [
    { id: 'doorbell', x: DOORBELL.x, z: DOORBELL.z, label: 'door bell', effect: 'summon', role: 'baker', hitOnly: true, cooldown: 12 },
    { id: 'gong', x: GONG.x, z: GONG.z, y: PICNIC.y, label: 'dinner gong', effect: 'summon', free: true, cooldown: 3 },
  ],
  reactions: [
    // the Waiter's flourish
    { on: 'ritual:waiter', nth: 1, say: 'The Waiter: "Et... voilà!" (and up goes the cloth)' },
    { on: 'flourishLost:waiter', say: 'The Waiter bows to an empty table, then looks at his empty hands. "...Monsieur?"', witness: { x: DINERS.x, z: DINERS.z, r: 8, emote: 'laugh' } },
    { on: 'picnic:cloth', say: 'The Waiter, looking up: "That is MY good cloth on that roof!"', witness: { role: 'waiter', r: 6, emote: 'anger' } },
    // the Baker and her bell
    { on: 'hit:doorbell', oblivious: { role: 'baker', seconds: 12 }, say: 'The Baker: "Coming!"', repeat: true },
    { on: 'arrived:bell:baker', nth: 1, say: 'The Baker: "Hello? ...Who rang?"', witness: { role: 'baker', r: 3, emote: 'question' } },
    { on: 'arrived:bell:baker', nth: 2, say: 'The Baker: "Is this a joke?"', mood: { role: 'baker', mood: 'annoyed' }, witness: { role: 'baker', r: 3, emote: 'anger' } },
    { on: 'discovered:baker', say: 'The Baker: "My last loaf! I counted it!"', witness: { role: 'baker', r: 10, emote: 'laugh' }, repeat: true },
    { on: 'picnic:loaf', say: 'The Baker shades her eyes: "...Is that my rye? On the ROOF?"', witness: { role: 'baker', r: 6, emote: 'point' } },
    // the Fisherman's false bites
    { on: 'splash:float', oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "A bite! It\'s a big one!" (he reels in, wildly)', witness: { role: 'fisher', r: 2, emote: 'alert' }, nth: 1 },
    { on: 'splash:float', oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "Another one!" ...it is a boot.', spawn: { type: 'boot', x: FISHER.x - 1.4, z: FISHER.z - 1.2, tag: 'oldBoot' }, witness: { x: FISHER.x, z: FISHER.z, r: 12, emote: 'laugh' }, nth: 2 },
    { on: 'splash:float', oblivious: { role: 'fisher', seconds: 7 }, say: 'The Fisherman: "This time for sure!"', repeat: true },
    { on: 'discovered:fisher', say: 'The Fisherman: "...and the small ones are gone too."', witness: { role: 'fisher', r: 12, emote: 'laugh' }, repeat: true },
    { on: 'picnic:herring', say: 'The Fisherman: "Those are MY herring up there!"', witness: { role: 'fisher', r: 6, emote: 'anger' } },
    // the Captain and his ferry
    { on: 'ferryIn', send: { role: 'captain', goals: [{ x: GANGWAY.x, z: GANGWAY.z, name: 'gangway' }] }, oblivious: { role: 'captain', seconds: 16 }, say: 'The Captain: "Ferry\'s in! Welcome aboard, welcome ashore!"', repeat: true },
    { on: 'discovered:captain', say: 'The Captain reaches for his coffee. A long, slow horn of pure rage.', sound: 'horn', witness: { role: 'captain', r: 12, emote: 'laugh' }, repeat: true },
    { on: 'picnic:thermos', say: 'The Captain, to nobody: "Who drinks a captain\'s coffee?"', witness: { role: 'captain', r: 6, emote: 'facepalm' } },
    // the Berry Sellers blame each other
    { on: 'discovered:berryW', say: 'West Berry Seller: "YOU ate them!"', witness: { role: 'berryE', r: 3, emote: 'question' }, repeat: true },
    { on: 'discovered:berryE', say: 'East Berry Seller: "I did NOT! YOU ate them!"', witness: { role: 'berryW', r: 3, emote: 'anger' }, repeat: true },
    { on: 'picnic:berries', say: 'The Berry Sellers look up together: "...oh."', witness: { role: 'berryW', r: 10, emote: 'facepalm' } },
    // the Nervous Diner
    { on: 'honkDrop:diner', say: 'The Nervous Diner leaps up. The cone flies. "...Why is it always me."', witness: { x: KIOSK.x, z: KIOSK.z, r: 9, emote: 'laugh' } },
    { on: 'picnic:vendace', say: 'The Cook pats the Nervous Diner on the shoulder. Up on the roof, a gull eats his lunch.', witness: { role: 'diner', r: 6, emote: 'facepalm' } },
    // the raid
    { on: 'raidShooed', say: 'The pigeons flap off, then come back to sit politely at the edge. Guests after all.' },
    { on: 'pigeonsFriends', say: 'The Pigeon Gang take the bun and sit politely at the edge. Guests after all.' },
    // the secrets
    { on: 'ritual:granny', nth: 1, say: 'Granny nods off on her bench, her good scarf in her lap.' },
    { on: 'picnic:scarf', say: 'Granny wakes: "Is that my good scarf? As a NAPKIN?"', witness: { role: 'granny', r: 8, emote: 'point' } },
    { on: 'picnic:boot', say: 'The guests take turns drinking from the boot. Very refined.', witness: { role: 'fisher', r: 10, emote: 'laugh' } },
    // the finale: every victim looks up and comes to shout at the roof
    {
      on: 'picnicFeast',
      say: 'Dinner is served! The guests tuck in, and down below everybody who lost something looks up at once.',
      sound: 'horn',
      send: { role: 'waiter', goals: [{ x: SHOUT.waiter.x, z: SHOUT.waiter.z, name: 'shout' }], stay: true },
      witness: { x: HALL_AT.x, z: HALL_AT.z, r: 30, emote: 'point' },
    },
    { on: 'picnicFeast', send: { role: 'baker', goals: [{ x: SHOUT.baker.x, z: SHOUT.baker.z, name: 'shout' }], stay: true } },
    { on: 'picnicFeast', send: { role: 'fisher', goals: [{ x: SHOUT.fisher.x, z: SHOUT.fisher.z, name: 'shout' }], stay: true } },
    { on: 'picnicFeast', send: { role: 'captain', goals: [{ x: SHOUT.captain.x, z: SHOUT.captain.z, name: 'shout' }], stay: true } },
    { on: 'picnicFeast', send: { role: 'berryW', goals: [{ x: SHOUT.berryW.x, z: SHOUT.berryW.z, name: 'shout' }], stay: true } },
    { on: 'picnicFeast', send: { role: 'diner', goals: [{ x: SHOUT.diner.x, z: SHOUT.diner.z, name: 'shout' }], stay: true }, mood: { role: 'baker', mood: 'annoyed' } },
    { on: 'arrived:shout:baker', say: 'Everybody at once: "MY CLOTH!" "MY LOAF!" "MY HERRING!" "MY COFFEE!" Up on the roof: "Caw."', witness: { x: -8, z: -11.5, r: 10, emote: 'anger' } },
    // watchers who catch you
    { on: 'gotcha:baker', say: 'The Baker: "Shoo! Not my rye!"', sound: 'bonk' },
    { on: 'gotcha:fisher', say: 'The Fisherman: "Get your own fish!"', sound: 'bonk' },
    { on: 'gotcha:captain', say: 'The Captain: "Hands off, sailor."', sound: 'bonk' },
    { on: 'gotcha:berryW', say: 'A Berry Seller: "Not today, gull!"', sound: 'bonk' },
    { on: 'gotcha:berryE', say: 'A Berry Seller: "Not today, gull!"', sound: 'bonk' },
    // the side orders (as in the old Fish Market)
    { on: 'grab:honkCone', say: 'A gull flies off with the cone. Its owner stares at an empty hand.', witness: { x: 38, z: -38.5, r: 8, emote: 'laugh' } },
    { on: 'snatch:fish', witness: { x: -40, z: -38, r: 14, emote: 'laugh' }, say: 'His fish! He turns round too late.', sound: 'gasp' },
    { on: 'snatch:icecream', witness: { x: 10, z: -68, r: 12, emote: 'alert' } },
  ],
  coopRequired: [
    { id: 'passVendace', title: 'Pass it on', teaser: 'From beak to beak in mid-air.', timed: false, objectives: [{ id: 'pass', text: 'Pass something in mid-air', kind: 'event', event: 'coop:pass', hint: 'One gull tosses (Q) in front of the other, who catches it before it lands (E).' }] },
    { id: 'twoSeats', title: 'Two seats at the table', teaser: 'Sit down together.', timed: false, objectives: [{ id: 'seats', text: 'Both gulls sit on the picnic roof after the gong', kind: 'event', event: 'coop:seats', hint: 'Once dinner is served, land on the roof together, both of you.' }] },
  ],
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  strollers: 4,
  start: { x: -2, z: -26 },
  defense: false,
  parTime: 540,
  reward: 'fatbird',
});
