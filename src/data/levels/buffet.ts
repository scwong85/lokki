import type { LevelDef } from './types';
import { restY } from '../props';

const TABLE = { x: 0, z: -20 };
const PIE_Y = 0.99; // on top of the table
const BELL = { x: 12, z: -26 };
const JUKE = { x: -14, z: -26 };
const BLANKET = { x: -17, z: -11 }; // out on the open paving, away from the tents and the water, so it can be seen from the table
const zone = (x: number, z: number, r: number, maxY = 4) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, maxY });

/**
 * P1. The Midsummer Buffet (M95): the first puzzle built on the research report (docs/design/puzzle-solving-research.md).
 *
 * A golden fish pie stands on the buffet table. Three people mind it (the chef, the maître who paces in front, and granny at the blanket
 * where it has to end up); anyone who sees the pie gone AND sees the gull gives chase. Nothing says how: each person has their own
 * weaknesses, found by looking (the gauge over their heads swells as they grow suspicious) and by trying things:
 *   chef:   the service bell (he goes to see who rang), a clattering bottle (he looks away), the jukebox (he dances), or a taunt-free snatch from behind
 *   maître: a puddle on his route (he slips), a taunt (he follows you off his route), the jukebox, a clattering bottle
 *   granny: a bottle, or simply speed
 * Each step accepts several things, and they can be done in any order. Then the pie has to get to the blanket.
 */
export const BUFFET: LevelDef = {
  id: 'buffet',
  name: 'P1. The Midsummer Buffet',
  blurb: 'A golden pie, three pairs of watchful eyes, and no instructions.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'buffet',
      title: 'Pie in the sky',
      teaser: 'Get the golden pie to the blanket.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'chef',
          text: 'Get the chef away from the table (bell, noise or music)',
          outcome: 'The Chef (white hat) should have somewhere else to be.',
          nudge: 'Chefs answer bells, and clatter, and music.',
          hint: 'Peck the service bell by the stalls (E): he goes to see who rang. Or drop a bottle near him, or start the jukebox.',
          kind: 'event',
          event: 'chefLeft',
          events: ['chefLeft', 'distract:chef', 'dancing:chef'],
          markers: [{ x: TABLE.x, z: TABLE.z - 2, r: 4, label: 'Chef' }],
        },
        {
          id: 'maitre',
          text: 'Get the maître off his route (a puddle, or a taunt)',
          outcome: 'The Maître (top hat, pacing) should stop pacing.',
          nudge: 'A man who walks the same stretch all day will walk through anything left on it, or after anything that shows off.',
          hint: 'Splat his route from above (F) so he slips, or hold T and lead him away.',
          kind: 'event',
          event: 'slipped:maitre',
          events: ['slipped:maitre', 'maitreGone'],
          markers: [{ x: TABLE.x, z: TABLE.z + 3, r: 8, label: 'His route' }],
        },
        {
          id: 'pie',
          text: 'Take the pie',
          outcome: 'The golden pie on the table should be yours.',
          nudge: 'Those who mind the pie only mind it while they can see you.',
          hint: 'Grab it from the table (E) when nobody who can see you is looking. They see the gull with the pie: they chase.',
          kind: 'event',
          event: 'grab:goldenPie',
          markers: [{ x: TABLE.x, z: TABLE.z, r: 3, label: 'The golden pie' }],
          showMarker: true,
        },
        {
          id: 'blanket',
          text: 'Put the pie on the picnic blanket',
          outcome: 'The pie belongs on the red-checked picnic blanket.',
          nudge: 'Granny sits by the blanket, and she is not asleep. She notices what comes her way.',
          hint: 'Carry it to the red-checked blanket on the open paving to the west and put it down (E). Granny sees the pie coming: a clatter looks away.',
          kind: 'event',
          event: 'pieHome',
          after: 'pie',
          markers: [{ x: BLANKET.x, z: BLANKET.z, r: 4, label: 'Picnic blanket' }],
          showMarker: true,
        },
      ],
    },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'chefLeft', kind: 'npcsClear', event: 'chefLeft', role: 'chef', zone: zone(TABLE.x, TABLE.z - 2, 3), min: 1, max: 0 },
    { id: 'maitreGone', kind: 'npcsClear', event: 'maitreGone', role: 'maitre', zone: { minX: -14, maxX: 14, minZ: TABLE.z + 1, maxZ: TABLE.z + 7, maxY: 4 }, min: 1, max: 0 },
    { id: 'pieHome', kind: 'propInZone', event: 'pieHome', propType: 'pie', tag: 'goldenPie', zone: zone(BLANKET.x, BLANKET.z, 3, 2) },
  ],
  tourists: [],
  extraTourists: [
    // the chef minds the pie and stands his ground; the maître paces in front of the table (he follows a showing-off gull);
    // granny sits by the blanket and sees everything that comes her way
    { x: TABLE.x, z: TABLE.z - 2, heading: Math.PI, role: 'chef', name: 'Chef', stationary: true, post: true, watch: 'goldenPie', color: 0xffffff, hat: 'chef', hatColor: 0xffffff },
    { x: TABLE.x - 8, z: TABLE.z + 4, heading: Math.PI / 2, role: 'maitre', name: 'Maître', watch: 'goldenPie', follows: true, patrol: [{ x: TABLE.x + 8, z: TABLE.z + 4 }, { x: TABLE.x - 8, z: TABLE.z + 4 }], color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
    { x: BLANKET.x - 2.6, z: BLANKET.z + 2, heading: Math.PI / 2, role: 'granny', name: 'Granny', stationary: true, post: true, watch: 'goldenPie', color: 0xb9a1d6, hat: 'sun', hatColor: 0xe6d9f5 },
    // guests: harmless, and happy to dance
    { x: -8, z: -30, heading: 0.5, role: 'guest', color: 0xf7a1c4 },
    { x: 6, z: -28, heading: -1, role: 'guest', color: 0x9ec9f0 },
    { x: -20, z: -18, heading: 1.5, role: 'guest', color: 0xffd36e },
  ],
  extraProps: [
    { type: 'pie', x: TABLE.x, y: PIE_Y, z: TABLE.z, tag: 'goldenPie' },
    // something to clatter: a bottle on the ground by the path
    { type: 'bottle', x: -4, y: restY('bottle'), z: -28 },
    { type: 'bottle', x: 12, y: restY('bottle'), z: -36 },
  ],
  decor: [
    { kind: 'table', x: TABLE.x, z: TABLE.z },
    { kind: 'blanket', x: BLANKET.x, z: BLANKET.z },
  ],
  switches: [
    { id: 'bell', x: BELL.x, z: BELL.z, label: 'service bell', effect: 'summon', cooldown: 14, role: 'chef' },
    { id: 'juke', x: JUKE.x, z: JUKE.z, label: 'jukebox', effect: 'dance', cooldown: 8 },
  ],
  reactions: [
    { on: 'pecked:bell', oblivious: { role: 'chef', seconds: 14 }, say: 'Ding! Somebody wants service.', sound: 'tramBell' },
    { on: 'slipped:maitre', witness: { x: TABLE.x, z: TABLE.z + 4, r: 14, emote: 'laugh' } },
    { on: 'caught:chef', say: 'Thief! My pie!' },
    { on: 'caught:maitre', say: 'Stop that gull!' },
    { on: 'caught:granny', say: 'Not on my watch!' },
    { on: 'gotcha:chef', say: 'Not my pie!', sound: 'bonk' },
    { on: 'gotcha:maitre', say: 'Not in my restaurant!', sound: 'bonk' },
    { on: 'gotcha:granny', say: 'Shoo! That is for the picnic.', sound: 'bonk' },
    { on: 'pieHome', witness: { x: BLANKET.x, z: BLANKET.z, r: 14, emote: 'heart' }, say: 'The pie is home. Nobody knows how.', sound: 'pop' },
  ],
  strollers: 2,
  defense: false,
  start: { x: -14, z: -42 },
  parTime: 420,
};
