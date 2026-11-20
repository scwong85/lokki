import type { LevelDef } from './types';
import { restY } from '../props';

const TABLE = { x: 0, z: -20 };
const PIE_Y = 0.99; // on top of the table
const BELL = { x: 12, z: -26 };
const JUKE = { x: -14, z: -26 };
const GRANNY = { x: -17, z: -11 }; // her picnic blanket, out on the open paving

/**
 * P1. The Midsummer Buffet (M95, rewritten joke-first in M100; docs/design/hooky-objectives-research.md).
 *
 * The Chef is very proud of his golden fish pie and cannot ignore his service bell. The Maître struts up and down in front of the
 * buffet. Granny sits on her picnic blanket nearby and eats anything sweet that comes within reach. Every to-do is something that
 * happens TO one of them; the method is the player's:
 *   the Chef answers the bell three times for nobody (question, then anger, then he gives up);
 *   the Maître loses his dignity in front of the guests (a splat, a slip, a dance);
 *   Granny eats the Chef's pie, and he sees it (the finale: his face).
 * Hidden: Granny bites into salmiakki.
 */
export const BUFFET: LevelDef = {
  id: 'buffet',
  name: 'P1. The Midsummer Buffet',
  blurb: 'A proud chef, a strutting maître, a granny with a sweet tooth, and one golden pie.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'buffet',
      title: 'Pie in the sky',
      teaser: 'Three people, three bad days.',
      timed: false,
      chain: true,
      joke: {
        joke: 'A chef so proud of his pie that he runs to every bell, and finds a granny eating it on her blanket.',
        insight: 'Everyone here has one habit: the Chef answers bells, the Maître struts, Granny eats sweet things near her.',
        reaction: 'The Chef stares at the empty bell, then at Granny mid-bite; the guests laugh at both.',
      },
      objectives: [
        {
          id: 'bell',
          victim: 'chef',
          text: 'Make the Chef answer the service bell for nobody (three times)',
          outcome: 'Make the Chef answer the bell for nobody. Three times.',
          nudge: 'A proud chef answers every bell, every time. Somebody has to ring it.',
          hint: 'Peck the service bell by the stalls (E), or hit it from above (a splat or a dropped bottle rings it too), and keep out of sight: he walks over, finds nobody, and goes back. Three times.',
          kind: 'event',
          event: 'arrived:bell:chef',
          count: 3,
          markers: [{ x: BELL.x, z: BELL.z, r: 3, label: 'Service bell' }],
        },
        {
          id: 'maitre',
          victim: 'maitre',
          text: 'Make the Maître lose his dignity in front of the guests (splat him, trip him, or make him dance)',
          outcome: 'Make the Maître lose his dignity in front of the guests.',
          nudge: 'A man who struts the same line all day is a man with a lot of dignity to lose.',
          hint: 'Poop on him (F), splat his route so he slips, or start the jukebox as he passes: he cannot help dancing.',
          kind: 'event',
          event: 'slipped:maitre',
          events: ['slipped:maitre', 'poopNpc:maitre', 'dancing:maitre'],
          markers: [{ x: TABLE.x, z: TABLE.z + 4, r: 8, label: 'The Maître' }],
        },
        {
          id: 'granny',
          victim: 'chef',
          text: 'Make Granny eat the Chef\'s golden pie',
          outcome: 'Make Granny eat the Chef\'s golden pie, and let him see it.',
          nudge: 'Granny eats anything sweet that comes near her blanket. The Chef only watches his table, except when he tastes his own cooking: he counts himself in and shuts his eyes.',
          hint: 'Take the pie when the Chef is not looking (the bell helps) and put it down (E) on Granny\'s red-checked blanket. She eats it; he comes to look.',
          kind: 'event',
          event: 'tookItem:pie',
          markers: [{ x: GRANNY.x, z: GRANNY.z, r: 4, label: 'Granny' }],
          showMarker: true,
        },
      ],
    },
    {
      id: 'buffetSecret',
      title: 'A nasty surprise',
      teaser: 'Granny has a sweet tooth. Not every sweet is sweet.',
      timed: false,
      objectives: [{ id: 'yuck', victim: 'granny', text: 'Give Granny salmiakki', kind: 'event', event: 'yuck', hint: 'Salmiakki looks like sweets. She does not know that until she bites.' }],
    },
  ],
  secret: ['buffetSecret'],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: TABLE.x, z: TABLE.z - 2, heading: Math.PI, role: 'chef', name: 'Chef', stationary: true, post: true, watch: 'goldenPie', ritual: { every: 24, hold: 4, icon: '😋', phase: 6 }, color: 0xffffff, hat: 'chef', hatColor: 0xffffff },
    { x: TABLE.x - 8, z: TABLE.z + 4, heading: Math.PI / 2, role: 'maitre', name: 'Maître', patrol: [{ x: TABLE.x + 8, z: TABLE.z + 4 }, { x: TABLE.x - 8, z: TABLE.z + 4 }], color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
    { x: GRANNY.x - 1.2, z: GRANNY.z + 0.6, heading: Math.PI / 2, role: 'granny', name: 'Granny', stationary: true, post: true, wants: ['pie', 'salmiakki'], color: 0xb9a1d6, hat: 'sun', hatColor: 0xe6d9f5 },
    // the guests: the audience (they laugh), and happy to dance
    { x: -8, z: -30, heading: 0.5, role: 'guest', color: 0xf7a1c4 },
    { x: 6, z: -28, heading: -1, role: 'guest', color: 0x9ec9f0 },
    { x: -6, z: -15, heading: 1.5, role: 'guest', color: 0xffd36e },
    { x: 5, z: -15, heading: -1.5, role: 'guest', color: 0xb8e0c8 },
  ],
  extraProps: [
    { type: 'pie', x: TABLE.x, y: PIE_Y, z: TABLE.z, tag: 'goldenPie' },
    { type: 'salmiakki', x: JUKE.x + 2, y: restY('salmiakki'), z: JUKE.z + 1.5 },
    { type: 'bottle', x: -4, y: restY('bottle'), z: -28 },
  ],
  decor: [
    { kind: 'table', x: TABLE.x, z: TABLE.z },
    { kind: 'blanket', x: GRANNY.x, z: GRANNY.z },
  ],
  switches: [
    { id: 'bell', x: BELL.x, z: BELL.z, label: 'service bell', effect: 'summon', cooldown: 10, role: 'chef' },
    { id: 'juke', x: JUKE.x, z: JUKE.z, label: 'jukebox', effect: 'dance', cooldown: 8 },
  ],
  reactions: [
    { on: 'pecked:bell', oblivious: { role: 'chef', seconds: 14 }, sound: 'tramBell' },
    // the bell, three times: the victim is puzzled, then cross, then gives up; the guests enjoy it
    { on: 'arrived:bell:chef', nth: 1, say: 'The Chef: "Hello? ...Who rang?"', witness: { x: BELL.x, z: BELL.z, r: 3, emote: 'question' } },
    { on: 'arrived:bell:chef', nth: 1, witness: { x: TABLE.x, z: TABLE.z, r: 16, emote: 'laugh' } },
    { on: 'arrived:bell:chef', nth: 2, say: 'The Chef: "WHO keeps ringing this bell?!"', mood: { role: 'chef', mood: 'annoyed' }, witness: { x: BELL.x, z: BELL.z, r: 3, emote: 'anger' } },
    { on: 'arrived:bell:chef', nth: 2, witness: { x: TABLE.x, z: TABLE.z, r: 18, emote: 'point' } },
    { on: 'arrived:bell:chef', nth: 3, say: 'The Chef: "That is IT. I am never answering that bell again."', sound: 'gasp', mood: { role: 'chef', mood: 'angry' }, witness: { x: BELL.x, z: BELL.z, r: 3, emote: 'facepalm' } },
    { on: 'arrived:bell:chef', nth: 3, witness: { x: TABLE.x, z: TABLE.z, r: 20, emote: 'laugh' } },
    { on: 'ritual:chef', nth: 1, say: 'The Chef: "Three, two, one... mmm. Perfection." (eyes shut)' },
    { on: 'discovered:chef', say: 'The Chef: "My pie...? WHERE IS MY PIE?"', witness: { x: TABLE.x, z: TABLE.z, r: 16, emote: 'laugh' }, repeat: true },
    { on: 'slipped:maitre', say: 'Ahem. That was intentional.', witness: { x: TABLE.x, z: TABLE.z + 4, r: 16, emote: 'laugh' } },
    { on: 'poopNpc:maitre', say: 'This jacket was pressed this morning!', witness: { x: TABLE.x, z: TABLE.z + 4, r: 16, emote: 'point' } },
    { on: 'dancing:maitre', say: 'I... cannot... stop...', witness: { x: TABLE.x, z: TABLE.z + 4, r: 16, emote: 'laugh' } },
    // the finale: Granny is delighted, the Chef storms over and sees it
    { on: 'tookItem:pie', say: 'MY PIE! Granny!', sound: 'gasp', mood: { role: 'chef', mood: 'angry' }, send: { role: 'chef', goals: [{ x: GRANNY.x + 1.5, z: GRANNY.z - 1.2, name: 'pieScene' }] }, witness: { x: GRANNY.x, z: GRANNY.z, r: 18, emote: 'laugh' } },
    { on: 'tookItem:pie', witness: { x: GRANNY.x, z: GRANNY.z, r: 2, emote: 'heart' } },
    { on: 'yuck', say: 'Salmiakki! Who leaves salmiakki on a picnic?', witness: { x: GRANNY.x, z: GRANNY.z, r: 14, emote: 'laugh' } },
    { on: 'caught:chef', say: 'Thief! My pie!' },
    { on: 'gotcha:chef', say: 'Not my pie!', sound: 'bonk' },
  ],
  strollers: 2,
  defense: false,
  start: { x: -14, z: -42 },
  parTime: 420,
};
