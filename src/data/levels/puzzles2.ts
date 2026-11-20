import type { LevelDef } from './types';
import { restY } from '../props';

const zone = (x: number, z: number, r: number, maxY = 4) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, maxY });
const COATS = [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e, 0xe8d5c0];
const guests = (pts: [number, number][]) => pts.map(([x, z], i) => ({ x, z, heading: i * 1.3, role: 'guest', color: COATS[i % COATS.length] }));

// ---------------------------------------------------------------------------------------------------------------------------------
// P2. The Grand Opening
// ---------------------------------------------------------------------------------------------------------------------------------
const KIOSK = { x: -10, z: -15 };
const JUKE = { x: -13.5, z: -11.5 }; // right by the ribbon: music gathers people round the jukebox, so it has to stand where the crowd should be
const RIBBON = { x: -10, z: -10.5 };
const PRESS = { x: -4, z: -9 };

/**
 * P2. The Grand Opening (M97): a long chain with several ways into each link.
 * A new ice-cream kiosk is about to open. The Mayor holds the big scissors, the Vendor holds the first cone of all, the Reporter waits
 * with a camera. The to-do list (wishes only, then the ladder) asks for six things; the order is partly free:
 *   five people waiting at the ribbon (music, crumbs...) | the Mayor losing the scissors (a honk from behind, music, a taunt...)
 *   -> the ribbon cut (the scissors dropped on it, but only with a crowd to see it) -> the Vendor, who forgets his cone to cheer ->
 *   the first cone, taken to the Reporter -> getting away with it.
 */
export const GRAND_OPENING: LevelDef = {
  id: 'grand-opening',
  name: 'P2. The Grand Opening',
  blurb: 'A ribbon, a pair of scissors, a crowd and the very first ice cream.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'opening',
      title: 'Cut the ribbon',
      teaser: 'Open the kiosk your own way, and take the first cone.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'crowd',
          text: 'Get a crowd to wait at the ribbon (music or food)',
          outcome: 'A crowd (four or more) should be waiting by the red ribbon, expecting something.',
          nudge: 'People gather for things they like: music, and food.',
          hint: 'Peck the jukebox beside the ribbon (E): everyone not busy comes over to dance round it. Or lay buns on the ground by the ribbon: hungry people come to eat them, and stay.',
          kind: 'event',
          event: 'crowdAtKiosk',
          markers: [{ x: RIBBON.x, z: RIBBON.z, r: 6, label: 'The ribbon' }],
          showMarker: true,
        },
        {
          id: 'scissors',
          text: 'Take the big scissors from the Mayor',
          outcome: 'The Mayor (top hat) should lose his big scissors.',
          nudge: 'A man holding something is only a man holding it while he has his back to the wind, and his mind on it.',
          hint: 'Honk from behind him (T) and he drops them, or start the jukebox, or hold T to lead him away. Then grab them (E) when he cannot see you.',
          kind: 'event',
          event: 'grab:scissors',
          markers: [{ x: RIBBON.x, z: RIBBON.z + 1.5, r: 3, label: 'The Mayor' }],
        },
        {
          id: 'cut',
          text: 'Drop the scissors on the ribbon, in front of the crowd',
          outcome: 'The ribbon should be cut, with everyone watching.',
          nudge: 'Scissors cut ribbons. A ribbon is cut properly only before an audience.',
          hint: 'Put the scissors down (E) on the red ribbon once a crowd is waiting.',
          kind: 'event',
          event: 'ribbonCut',
          after: 'scissors',
        },
        {
          id: 'cone',
          text: 'Take the Vendor\'s first cone',
          outcome: 'The first ice cream of all should be yours.',
          nudge: 'The vendor loves his first customer, and his first cone loves nobody. He will be cheering.',
          hint: 'Right after the cut he is too happy to watch his cone: take it (E) from the kiosk while he cheers. Be quick, he comes round.',
          kind: 'event',
          event: 'grab:firstCone',
          after: 'cut',
          markers: [{ x: KIOSK.x, z: KIOSK.z - 1, r: 3, label: 'The Vendor' }],
        },
        {
          id: 'press',
          text: 'Bring the cone to the Reporter',
          outcome: 'The Reporter should have the first cone for the front page.',
          nudge: 'Cameras love a first cone. They do not ask where it came from.',
          hint: 'Put the cone down (E) beside the reporter with the camera, on the east side.',
          kind: 'event',
          event: 'coneAtPress',
          after: 'cone',
          markers: [{ x: PRESS.x, z: PRESS.z, r: 3, label: 'Reporter' }],
          showMarker: true,
        },
        { id: 'escape', text: 'Get away with it', outcome: 'Nobody should know who did it.', nudge: 'Distance is a kind of alibi.', hint: 'Stay far from everyone until the bar fills.', kind: 'escape', after: 'press' },
      ],
    },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'crowdAtKiosk', kind: 'npcsInZone', event: 'crowdAtKiosk', role: 'guest', zone: zone(RIBBON.x, RIBBON.z, 7.5), count: 4 },
    { id: 'ribbonCut', kind: 'propInZone', event: 'ribbonCut', propType: 'scissors', tag: 'scissors', zone: zone(RIBBON.x, RIBBON.z, 3.2, 2), needs: 'crowdAtKiosk' },
    // the scissors on the ribbon with nobody to watch: a nudge (once)
    { id: 'ribbonDry', kind: 'propInZone', event: 'ribbonDry', propType: 'scissors', tag: 'scissors', zone: zone(RIBBON.x, RIBBON.z, 3.2, 2), unless: 'crowdAtKiosk', always: true },
    { id: 'coneAtPress', kind: 'propInZone', event: 'coneAtPress', propType: 'icecream', tag: 'firstCone', zone: zone(PRESS.x, PRESS.z, 2.6, 2) },
  ],
  tourists: [],
  extraTourists: [
    { x: RIBBON.x, z: RIBBON.z + 1.6, heading: 0, role: 'mayor', name: 'Mayor', stationary: true, post: true, follows: true, watch: 'scissors', holds: 'scissors', holdTag: 'scissors', color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
    { x: KIOSK.x, z: KIOSK.z - 1.4, heading: Math.PI, role: 'vendor', name: 'Vendor', stationary: true, post: true, watch: 'firstCone', holds: 'icecream', holdTag: 'firstCone', color: 0xffffff, hat: 'chef', hatColor: 0xffffff },
    { x: PRESS.x, z: PRESS.z, heading: -1.2, role: 'reporter', name: 'Reporter', stationary: true, post: true, color: 0x3d4a66, hat: 'cap', hatColor: 0x2a5ea8 },
    ...guests([[-22, -10], [-3, -14], [-16, -18], [2, -10], [-24, -16], [-6, -19], [0, -17]]),
  ],
  extraProps: [
    ...[-25, -24, -23, -22, -21].map((x) => ({ type: 'bun' as const, x, y: restY('bun'), z: -8 })),
    { type: 'bottle', x: -2, y: restY('bottle'), z: -13 },
  ],
  crumbs: ['bun'],
  decor: [
    { kind: 'kiosk', x: KIOSK.x, z: KIOSK.z },
    { kind: 'ribbon', x: RIBBON.x, z: RIBBON.z },
  ],
  switches: [{ id: 'juke', x: JUKE.x, z: JUKE.z, label: 'jukebox', effect: 'dance', cooldown: 8 }],
  reactions: [
    { on: 'ribbonDry', say: 'Cutting a ribbon with nobody watching? Where is the audience?', sound: 'gasp' },
    { on: 'ribbonCut', say: 'The ribbon is cut! Hooray!', sound: 'pop', mood: { role: 'vendor', mood: 'delighted' }, oblivious: { role: 'vendor', seconds: 22 }, witness: { x: RIBBON.x, z: RIBBON.z, r: 16, emote: 'heart' } },
    { on: 'ribbonCut', mood: { role: 'mayor', mood: 'angry' } },
    { on: 'coneAtPress', say: 'FRONT PAGE: the first cone, and no suspect.', sound: 'chime', witness: { x: PRESS.x, z: PRESS.z, r: 12, emote: 'laugh' } },
    { on: 'caught:mayor', say: 'My scissors! Stop that gull!' },
    { on: 'caught:vendor', say: 'My first cone!' },
    { on: 'gotcha:mayor', say: 'Give me those back!', sound: 'bonk' },
    { on: 'gotcha:vendor', say: 'Not the first cone!', sound: 'bonk' },
  ],
  strollers: 2,
  defense: false,
  start: { x: -10, z: -6.5 },
  parTime: 540,
};

// ---------------------------------------------------------------------------------------------------------------------------------
// P3. Fire Drill
// ---------------------------------------------------------------------------------------------------------------------------------
const STALL = { x: -22, z: -14 };
const MUSTER = { x: -4, z: -9 };
const musterRing = (n: number) => Array.from({ length: n }, (_, i) => ({ x: MUSTER.x + Math.cos(i * 1.256) * 2.4, z: MUSTER.z + Math.sin(i * 1.256) * 2.4, name: 'muster' }));

/**
 * P3. Fire Drill (M97): a long chain that is mostly about timing. A pecked alarm sends the customers (and the Guard) to the assembly
 * point, which empties the stall for a while; a sprinkler button soaks the Fishmonger; a puddle trips the Guard. Everything has a
 * time limit that nothing tells you about: the Guard comes back from the muster, the crowd drifts home.
 */
export const FIRE_DRILL: LevelDef = {
  id: 'fire-drill',
  name: 'P3. Fire Drill',
  blurb: 'An alarm, a sprinkler, a guard on his round, and a golden fish.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'drill',
      title: 'Fire drill',
      teaser: 'Empty the fish stall, and take the golden fish.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'stall',
          text: 'Empty the stall of customers (the alarm, a honk, a trail of buns)',
          outcome: 'The fish stall should have no customers.',
          nudge: 'People go where they are told, when they are told loudly enough. Or where there is something to eat.',
          hint: 'Peck the red alarm button (E): everyone is sent to the assembly point. A honk sends people away from you, and a bun trail leads hungry people off.',
          kind: 'event',
          event: 'stallEmpty',
          markers: [{ x: STALL.x, z: STALL.z + 3.5, r: 5, label: 'The queue' }],
        },
        {
          id: 'guard',
          text: 'Get the Guard off his round (a puddle, the alarm or a taunt)',
          outcome: 'The Guard (yellow cap) should not be on his round.',
          nudge: 'A man who walks the same line all day can be moved, tripped, or led, or sent somewhere by a noise.',
          hint: 'Splat his route from above (F) so he slips; the alarm sends him to the assembly point; or hold T and he follows you off his round.',
          kind: 'event',
          event: 'slipped:guard',
          events: ['slipped:guard', 'guardGone', 'distract:guard'],
          markers: [{ x: -21, z: -8, r: 8, label: 'The Guard' }],
        },
        {
          id: 'monger',
          text: 'Get the Fishmonger looking the other way (a soaking, a noise)',
          outcome: 'The Fishmonger (white hat) should be looking at something else.',
          nudge: 'Water makes anyone look at themselves. So does a loud noise.',
          hint: 'Peck the blue sprinkler button (E): it soaks everyone near the stall. A bottle clattering, or the alarm, makes him look away too.',
          kind: 'event',
          event: 'distract:fishmonger',
          events: ['distract:fishmonger', 'soaked:fishmonger', 'dancing:fishmonger'],
          markers: [{ x: STALL.x, z: STALL.z - 1.8, r: 3, label: 'The Fishmonger' }],
        },
        {
          id: 'fish',
          text: 'Take the golden fish from the stall',
          outcome: 'The golden fish should be yours.',
          nudge: 'Everyone minding it has to be looking elsewhere at the same time.',
          hint: 'Grab it (E) from the stall counter when the Fishmonger, the Guard and the queue cannot see you. Whoever sees you with it gives chase.',
          kind: 'event',
          event: 'grab:goldFish',
          markers: [{ x: STALL.x, z: STALL.z, r: 3, label: 'The golden fish' }],
          showMarker: true,
        },
        {
          id: 'muster',
          text: 'Put the fish on the assembly point',
          outcome: 'The fish should be at the green MUSTER sign.',
          nudge: 'Where a whole queue has been told to stand, nobody asks what is at their feet.',
          hint: 'Carry it to the green assembly point to the east and put it down (E).',
          kind: 'event',
          event: 'fishAtMuster',
          after: 'fish',
          markers: [{ x: MUSTER.x, z: MUSTER.z, r: 4, label: 'MUSTER' }],
          showMarker: true,
        },
        { id: 'escape', text: 'Get away with it', outcome: 'It should never be traced to you.', nudge: 'Distance is a kind of alibi.', hint: 'Stay far from everyone until the bar fills.', kind: 'escape', after: 'muster' },
      ],
    },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'stallEmpty', kind: 'npcsClear', event: 'stallEmpty', role: 'guest', zone: zone(STALL.x, STALL.z + 3.5, 5), min: 3, max: 0 },
    { id: 'guardGone', kind: 'npcsClear', event: 'guardGone', role: 'guard', zone: { minX: -32, maxX: -10, minZ: -10.5, maxZ: -5.5, maxY: 4 }, min: 1, max: 0 },
    { id: 'fishAtMuster', kind: 'propInZone', event: 'fishAtMuster', propType: 'fish', tag: 'goldFish', zone: zone(MUSTER.x, MUSTER.z, 3.4, 2) },
  ],
  tourists: [],
  extraTourists: [
    { x: STALL.x, z: STALL.z - 1.8, heading: Math.PI, role: 'fishmonger', name: 'Fishmonger', stationary: true, post: true, watch: 'goldFish', color: 0x4a6fa5, hat: 'chef', hatColor: 0xffffff },
    { x: -30, z: -8, heading: Math.PI / 2, role: 'guard', name: 'Guard', watch: 'goldFish', follows: true, patrol: [{ x: -12, z: -8 }, { x: -30, z: -8 }], color: 0xd6f23c, hat: 'cap', hatColor: 0xffc400 },
    ...guests([[-24, -10.5], [-22, -10], [-20, -10.8], [-23, -11.8], [-21, -11.8]]),
    { x: -12, z: -16, heading: 1, role: 'bystander', color: 0xc7b5e0 },
  ],
  extraProps: [
    { type: 'fish', x: STALL.x, y: 0.99, z: STALL.z, tag: 'goldFish' },
    { type: 'bottle', x: -16, y: restY('bottle'), z: -13 },
    ...[-32, -31, -30].map((x) => ({ type: 'bun' as const, x, y: restY('bun'), z: -12 })),
  ],
  crumbs: ['bun'],
  decor: [
    { kind: 'table', x: STALL.x, z: STALL.z },
    { kind: 'muster', x: MUSTER.x, z: MUSTER.z },
  ],
  switches: [
    { id: 'alarm', x: -14, z: -12, label: 'fire alarm', effect: 'alarm', cooldown: 25 },
    { id: 'spray', x: -30, z: -12, label: 'sprinkler button', effect: 'soak', cooldown: 12, target: { x: STALL.x, z: STALL.z - 1.8 } },
  ],
  reactions: [
    {
      on: 'pecked:alarm',
      say: 'FIRE DRILL! Everyone to the assembly point.',
      sound: 'alarm',
      send: { role: 'guest', goals: musterRing(5) },
      distract: { role: 'fishmonger', seconds: 6 },
    },
    { on: 'pecked:alarm', send: { role: 'guard', goals: [{ x: MUSTER.x - 2.5, z: MUSTER.z + 2, name: 'muster' }] } },
    { on: 'fishAtMuster', say: 'A golden fish at the assembly point. Nobody saw anything.', sound: 'pop', witness: { x: MUSTER.x, z: MUSTER.z, r: 10, emote: 'laugh' } },
    { on: 'caught:fishmonger', say: 'My golden fish!' },
    { on: 'caught:guard', say: 'Stop, thief!' },
    { on: 'gotcha:fishmonger', say: 'Back on the counter with you!', sound: 'bonk' },
    { on: 'gotcha:guard', say: 'Gotcha!', sound: 'bonk' },
  ],
  strollers: 2,
  defense: false,
  start: { x: -14, z: -6.5 },
  parTime: 540,
};
