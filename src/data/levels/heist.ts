import { stage } from '../arcs';
import { restY } from '../props';
import type { QuestDef } from '../quests';
import type { NpcSpawn } from '../../gameplay/npc';
import type { PropSpawn } from '../../gameplay/props';
import { TUG_OF_WAR, PEEKABOO, RED_BUTTON } from './mischief';
import { CITY_STRIKES } from './cityStrikes';
import { at, crowd, gongQuest, gongSwitch, homeDecor, PICNIC, row, served } from './rowKit';
import { sh, shHides, shSpawns, shSwitches } from './relocate';

/**
 * Act 1, stage 3, version two: Market Day Heist (M115; plan: docs/design/act1-v2.md). The city is on guard (heat, vendors with spray bottles,
 * scare lines over the stalls) and the flock wants the market's best lunch on the roof, six things in three courses:
 *
 *   Casing the joint   the Soup Man's bowl     (a bowl in two hands: land beside him and tug)          far west, 81 m
 *                      the Peeker's cone       (hide in the bush, wait, then BOO)                      far east, 106 m
 *   The inside job     the Bun Man's bun       (tug it, and the vendor sprays a gull that stays close) by the vendor, 15 m
 *                      the Rich Man's lunch    (get the vendor to soak him: he runs and drops it)     by the vendor, 19 m
 *   The getaway        the Balloon Man's balloon (held high: an air snatch)                           north-west, 72 m
 *                      the Queue's cone        (peck the alarm, then the sprinkler button)             far north-east, 90 m
 * The vendor and the lines are fixed in the city, so the inside job stays where they are; the rest is spread out.
 */
const SOUP = at(-96, -62);
const BALLOON = at(-30, -86);
const PEEK_S = { dx: 92, dz: -52 }; // the Peekaboo cluster (bush at -8,-16) moves to (84,-68)
const BTN_S = { dx: 36, dz: -70 }; // the button queue (around 0,-12) moves to (36,-82); the buttons to (14,-90) and (58,-90)
const BUN_MAN = at(-29, -17);
const RICH = at(-33.2, -17);
const SOUP_S = { dx: SOUP.x - 8, dz: SOUP.z + 18 };
const BAL_S = { dx: BALLOON.x - 20, dz: BALLOON.z + 15 };
const PEEKERS = shSpawns(PEEKABOO.extraTourists, PEEK_S);
const HIDE = shHides(PEEKABOO.hides, PEEK_S)[0];
const QUEUE = shSpawns(RED_BUTTON.extraTourists, BTN_S);
// the two buttons stand 10 m either side of the queue (the old level had them 22 m away)
const BUTTONS = shSwitches(RED_BUTTON.switches, BTN_S).map((b) => ({ ...b, x: b.id === 'alarm' ? 26 : 46, z: -88 }));
const QUEUE_AT = at(36, -82);

export const HEIST_QUEST: QuestDef = {
  id: 'picnic',
  title: 'Market Day Heist',
  teaser: 'Lift the market\'s best lunch, past the vendors, the lines and the heat.',
  timed: false,
  collect: {
    goal: 'Market day, and the city is on guard: vendors with spray bottles, scare lines over the stalls. Lift six things for the flock\'s lunch on the roof. Every one belongs to somebody, and every one needs a different trick. Look: far west, far east, the vendor\'s corner (close to the roof), the north-west and the north-east.',
    marker: { x: PICNIC.x, z: PICNIC.z, r: 3.5, y: PICNIC.y, label: 'The loot' },
    // one row of a course opens the next, so a row you cannot solve never locks the rest of the stage (M118)
    courses: [
      { name: 'Casing the joint', unlock: '' },
      { name: 'The inside job', unlock: 'opens when one thing of the first course is lifted', need: 1, where: 'far west, and the vendor\'s corner right by the roof.' },
      { name: 'The getaway', unlock: 'opens when one thing of the second course is lifted', need: 1, where: 'the vendor\'s corner again, and a queue far to the north-east.' },
    ],
  },
  objectives: [
    row('soup', 'A bowl of soup', 'the Soup Man', SOUP, 'something warm', 2, 'tugSoup', {
      victim: 'soupman',
      text: 'Take the Soup Man\'s bowl',
      outcome: 'Take the Soup Man\'s bowl.',
      nudge: 'A bowl in two hands cannot be snatched from the air.',
      hint: 'Land beside him and HOLD E (a tug of war); mash E to pull harder. A honk makes him let go. Then carry it home: the vendors and the scare lines are between you and the roof.',
      markers: [{ ...SOUP, r: 3, label: 'Soup Man' }],
      recap: 'You tugged the soup out of his hands and carried it home past the lines',
    }),
    row('boo', 'Something cold', 'the Peekers', sh(at(-8, -14), PEEK_S), 'something cold', 1, 'booCone', {
      victim: 'peeker',
      text: 'Take a cone from the Peekers',
      outcome: 'Take a cone from the Peekers.',
      nudge: 'Nobody sees a gull in a bush. Nobody expects a honk from one.',
      hint: 'Walk into the green bush and stay still: they cannot see you. When they are close, tap T (BOO). They jump and drop their cones: grab one (E).',
      markers: [{ ...HIDE, r: 3, label: 'The bush' }],
      recap: 'You hid in the bush, honked BOO and took a dropped cone',
    }),
    row('bun', 'A bun', 'the Bun Man', BUN_MAN, 'something sweet', 2, 'tugBun', {
      victim: 'bunman',
      text: 'Take the Bun Man\'s bun',
      outcome: 'Take the Bun Man\'s bun.',
      nudge: 'He stands right by a vendor with a spray bottle.',
      hint: 'Snatch it from the air (safe, but the heat rises), or tug it on the ground: the vendor sprays a gull that stays too close, and you lose the tug.',
      markers: [{ ...BUN_MAN, r: 3, label: 'Bun Man' }],
      recap: 'You took the bun from under the vendor\'s nose',
    }),
    row('lunch', 'A fried fish', 'the Rich Man', RICH, 'something fried', 3, 'richLunch', {
      victim: 'rich',
      text: 'Get the Rich Man\'s lunch',
      outcome: 'Get the Rich Man\'s lunch.',
      nudge: 'The vendor sprays whatever stands in front of the gull he is aiming at.',
      hint: 'Land or fly low just behind the tourist in the top hat, wait for the red fan of the spray, then dodge sideways: the spray soaks him, he runs and drops his lunch. Grab it (E).',
      markers: [{ ...RICH, r: 3, label: 'Rich Man' }],
      recap: 'You let the vendor soak him and took his lunch',
    }),
    row('balloon', 'Something to float', 'the Balloon Man', BALLOON, 'something light', 1, 'tugBalloon', {
      victim: 'balloonman',
      text: 'Take the Balloon Man\'s balloon',
      outcome: 'Take the Balloon Man\'s balloon.',
      nudge: 'It is held high, out of reach of a tug.',
      hint: 'Dive at it from the air (Shift): a snatch, not a tug. It is light, so fly it a long way home.',
      markers: [{ ...BALLOON, r: 3, label: 'Balloon Man' }],
      recap: 'You dived at his balloon and flew it home',
    }),
    row('queue', 'Something cool', 'the Queue', QUEUE_AT, 'something cool', 3, 'btnCone', {
      victim: 'queuer',
      text: 'Take a cone from the Queue',
      outcome: 'Take a cone from the Queue.',
      nudge: 'Buttons are pecked from a safe distance. One of them is a fire alarm.',
      hint: 'There are two buttons, a long way either side of the queue: peck the alarm (E), then the sprinkler button. The queue is drenched and drops its cones: grab a dry one.',
      markers: [{ ...QUEUE_AT, r: 4, label: 'The queue' }, ...BUTTONS.map((b) => ({ x: b.x, z: b.z, r: 2, label: b.label }))],
      recap: 'You pecked the alarm and the sprinkler, and took a dropped cone',
    }),
  ],
};

HEIST_QUEST.objectives.forEach((o) => { if (o.row) o.row.reveal.r = 16; }); // the half title shows from further away

export const HEIST_GONG = gongQuest('The loot is on the roof', 'Six things on the blanket first.', 'Ring the gong. Lunch is served.');

const person = (sp: NpcSpawn): NpcSpawn => sp;
const TOURISTS = TUG_OF_WAR.extraTourists ?? [];
const cast: NpcSpawn[] = [
  // casing the joint
  person(sh({ ...TOURISTS[0] }, SOUP_S)),
  ...PEEKERS,
  // the inside job: the vendor's corner, where the city put it
  TOURISTS[2],
  (CITY_STRIKES.extraTourists ?? [])[0],
  // the getaway
  person(sh({ ...TOURISTS[1] }, BAL_S)),
  ...QUEUE,
  // people for the crowd to be
  person({ x: -70, z: -58, heading: 0.6, ice: true, color: 0x9ec9f0 }),
  person({ x: 10, z: -44, heading: -1.2, ice: true, color: 0xffd36e }),
];

/** The crowd that comes ashore when the joint is cased, and the lunch rush when the inside job is done: more eyes, more heat. */
const FERRY_CROWD: NpcSpawn[] = crowd(5, at(0, -8.5));
const LUNCH_RUSH: NpcSpawn[] = Array.from({ length: 6 }, (_, i) => ({ x: -34 + i * 2.6, z: -52 + (i % 2) * 1.5, heading: 0, role: 'lunch', wander: 40, color: [0xffd36e, 0xf7a1c4, 0xb8e0c8][i % 3] }));

const things: PropSpawn[] = [
  { type: 'ball', x: 12, y: restY('ball'), z: -26 },
  { type: 'map', x: -60, y: restY('map'), z: -70 },
  { type: 'glasses', x: 50, y: restY('glasses'), z: -60 },
  { type: 'bottle', x: -12, y: restY('bottle'), z: -52 },
  { type: 'flowers', x: 20, y: restY('flowers'), z: -70 },
  { type: 'candy', x: -80, y: restY('candy'), z: -50 },
  { type: 'salmiakki', x: 64, y: restY('salmiakki'), z: -66 },
  { type: 'toy', x: -40, y: restY('toy'), z: -64 },
];

export const MARKET_DAY_HEIST = stage(1, 3, {
  name: '1.3 Market Day Heist',
  blurb: 'The city is on guard. Six things for the flock\'s lunch: tug, hide, peck.',
  intro: { title: 'Market Day Heist', text: 'Midday. The vendors have spray bottles and there are scare lines over the stalls; heat rises when you are seen. Lift six things for the flock\'s lunch, in three courses. New: tug (hold E on the ground), hide in a bush and BOO (T), peck the buttons (E).' },
  quests: [],
  extraQuests: [HEIST_QUEST, HEIST_GONG, ...(CITY_STRIKES.extraQuests ?? []).filter((q) => q.id === 'wanted')],
  secret: ['wanted'],
  picnic: { ...PICNIC, guests: 6 },
  triggers: [],
  extraTriggers: [
    served('soup', 'soup', 'tugSoup'),
    served('boo', 'icecream', 'booCone'),
    served('bun', 'bun', 'tugBun'),
    served('lunch', 'fish', 'richLunch'),
    served('balloon', 'balloon', 'tugBalloon'),
    served('queue', 'icecream', 'btnCone'),
  ],
  decor: homeDecor,
  hides: [HIDE],
  switches: [...BUTTONS, gongSwitch('lunch gong')],
  reactions: [
    { on: 'grab:tugSoup', mood: { role: 'soupman', mood: 'upset' }, say: 'The Soup Man: "My soup!"', sound: 'yelp' },
    { on: 'picnic:soup', say: 'The Soup Man looks up from his empty hands, far below: "...that was my SOUP."', witness: { role: 'soupman', r: 10, emote: 'point' } },
    { on: 'boo:peeker', say: 'The Peekers: "AAH! The BUSH honked!"', witness: { role: 'peeker', r: 8, emote: 'alert' } },
    { on: 'grab:booCone', say: 'The bush has an ice cream now.', witness: { role: 'peeker', r: 5, emote: 'anger' } },
    { on: 'courseServed:1', say: 'The joint is cased! The ferry horn sounds and a crowd comes ashore: more eyes on the square.', sound: 'horn', cast: FERRY_CROWD },
    { on: 'grab:tugBun', mood: { role: 'bunman', mood: 'upset' }, witness: { x: -29, z: -17, r: 8, emote: 'laugh' } },
    { on: 'soaked:rich', say: 'The vendor soaks the Rich Man, top hat and all.', witness: { x: -33, z: -17, r: 14, emote: 'laugh' }, sound: 'gasp' },
    { on: 'grab:richLunch', say: 'His lunch. Not any more.', witness: { x: -33, z: -17, r: 12, emote: 'laugh' } },
    { on: 'courseServed:2', say: 'The inside job is done! The lunch rush fills the square: the vendors are on their toes.', cast: LUNCH_RUSH },
    { on: 'grab:tugBalloon', witness: { role: 'balloonman', r: 10, emote: 'point' }, say: 'The balloon floats off with a gull.' },
    { on: 'pecked:alarm', say: 'The queue: "Fire?!" Nobody moves. It is only a test.', witness: { role: 'queuer', r: 10, emote: 'question' } },
    { on: 'pecked:sprinkle', say: 'The whole queue: "AAAH! My hair!"', sound: 'gasp', witness: { role: 'queuer', r: 10, emote: 'anger' } },
    { on: 'grab:btnCone', say: 'A soaked queue watches a gull take the last dry cone.', witness: { role: 'queuer', r: 4, emote: 'laugh' } },
    { on: 'picnicFeast', say: 'Lunch is served! The flock tucks in, and all over the square everybody who lost something looks up at once.', sound: 'horn' },
    ...['soupman', 'peeker', 'bunman', 'rich', 'balloonman', 'queuer'].map((role) => ({ on: 'picnicFeast', witness: { role, r: 8, emote: 'anger' as const } })),
  ],
  coopRequired: [
    { id: 'teamTug', title: 'Team tug', teaser: 'Two beaks are stronger than one.', timed: false, objectives: [{ id: 'teamTug', text: 'Both hold E on the same person\'s hand and pull it away', kind: 'event', event: 'coop:tug', hint: 'Both land beside the Soup Man, hold E and mash. Your pulls add up: the person pulls back half as hard on each of you.' }] },
    (CITY_STRIKES.coopQuests ?? [])[0],
  ],
  tourists: [],
  extraTourists: cast,
  extraProps: things,
  strollers: 6,
  start: { x: -2, z: -26 },
  defense: true,
  deploy: ['vendors', 'lines'],
  startHeat: 22,
  parTime: 600,
  reward: 'hawkeye',
});
