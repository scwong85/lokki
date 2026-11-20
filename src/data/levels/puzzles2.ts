import type { LevelDef } from './types';
import { restY } from '../props';

const zone = (x: number, z: number, r: number, maxY = 4) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, maxY });
const COATS = [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e, 0xe8d5c0];

// ---------------------------------------------------------------------------------------------------------------------------------
// P2. The Grand Opening: the Mayor's big day (rewritten joke-first in M100)
// ---------------------------------------------------------------------------------------------------------------------------------
const KIOSK = { x: -10, z: -15 };
const RIBBON = { x: -10, z: -10.5 };
const MAYOR = { x: -10, z: -7.4 }; // three metres from the ribbon: scissors cut on the ribbon are not "his" to take back
const REPORTER = { x: -3.5, z: -8.2 };
const JUKE = { x: -16.5, z: -12 };

/**
 * P2. The Grand Opening (M97, rewritten in M100 after docs/design/hooky-objectives-research.md).
 * It is the Mayor's big day: a photo for the front page, a ribbon to cut, the first ice cream of summer. Every to-do takes one of
 * them away from him, and he is the one who has to stand there:
 *   the Reporter's countdown photo has a gull in it instead of him;
 *   the ribbon is cut before he can (his scissors, your beak);
 *   furious, he treats himself to the first cone at the kiosk, and loses that too (he chases you through his own crowd).
 * Hidden: let him catch you red-handed. Co-op: both gulls in the photo.
 */
export const GRAND_OPENING: LevelDef = {
  id: 'grand-opening',
  name: 'P2. The Grand Opening',
  blurb: 'The Mayor\'s big day: a photo, a ribbon, the first ice cream of summer.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'opening',
      title: 'The Mayor\'s big day',
      teaser: 'Steal the Mayor\'s photo, his ribbon and his ice cream.',
      timed: false,
      chain: true,
      joke: {
        joke: 'A pompous mayor loses his front-page photo to a gull, his ribbon to a gull, and then his consolation ice cream to the same gull.',
        insight: 'The Reporter counts down before every photo, the scissors are only safe in his hand, and an angry mayor buys himself a treat.',
        reaction: 'The Mayor glowers at the camera, mimes cutting with empty hands, beams over his cone, and then chases a gull through his own crowd.',
      },
      objectives: [
        {
          id: 'photo',
          victim: 'mayor',
          text: 'Be in the Reporter\'s photo when the camera clicks',
          outcome: 'Get into the Mayor\'s front-page photo instead of him.',
          nudge: 'A camera counting down is a stage with a timer.',
          hint: 'The Reporter counts 3, 2, 1 at the Mayor. Be between them on the 1. Honk behind the Mayor on the 2 and he turns away, too.',
          kind: 'event',
          event: 'photobomb',
          markers: [{ x: REPORTER.x, z: REPORTER.z, r: 3, label: 'Reporter' }],
        },
        {
          id: 'cut',
          victim: 'mayor',
          text: 'Cut the ribbon with the Mayor\'s scissors before he can',
          outcome: 'Cut the ribbon before the Mayor can.',
          nudge: 'The scissors are in the wrong hands. A startled man, a dancing man and a showing-off man all drop things.',
          hint: 'Honk from behind him (T) so he drops the scissors, or start the jukebox, or lead him away (hold T). Grab the scissors (E) and drop them on the red ribbon.',
          kind: 'event',
          event: 'ribbonCut',
          markers: [{ x: RIBBON.x, z: RIBBON.z, r: 3, label: 'The ribbon' }],
          showMarker: true,
        },
        {
          id: 'cone',
          victim: 'mayor',
          text: 'Take the Mayor\'s consolation ice cream',
          outcome: 'Make the Mayor lose the first ice cream of summer too.',
          nudge: 'An angry mayor treats himself. A treated mayor has something worth taking.',
          hint: 'After the ribbon he is furious and buys himself a cone at the kiosk. Snatch it on his way back: dive at his hand, or honk behind him.',
          kind: 'event',
          event: 'robbed:mayor',
          after: 'cut',
        },
      ],
    },
    {
      id: 'openingSecret',
      title: 'Red-handed',
      teaser: 'The Mayor gets one thing today.',
      timed: false,
      objectives: [{ id: 'gotcha', victim: 'mayor', text: 'Let the Mayor catch you with his scissors, for the paper', kind: 'event', event: 'gotcha:mayor', hint: 'Let him see you with the scissors and let him catch you.' }],
    },
  ],
  secret: ['openingSecret'],
  coopRequired: [
    { id: 'starDecoy', title: 'Star and decoy', teaser: 'Both of you in the paper.', timed: false, objectives: [{ id: 'both', victim: 'mayor', text: 'Both gulls in one front-page photo', kind: 'event', event: 'coop:photobomb', hint: 'Be in the frame together on the 1.' }] },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'ribbonCut', kind: 'propInZone', event: 'ribbonCut', propType: 'scissors', tag: 'scissors', zone: zone(RIBBON.x, RIBBON.z, 3.2, 2) },
  ],
  tourists: [],
  extraTourists: [
    { x: MAYOR.x, z: MAYOR.z, heading: Math.PI, role: 'mayor', name: 'Mayor', stationary: true, post: true, follows: true, watch: 'scissors', holds: 'scissors', holdTag: 'scissors', craves: 'icecream', color: 0x2f3a55, hat: 'top', hatColor: 0x2a2a35 },
    // the Reporter photographs the Mayor on a countdown (the selfie routine, pointed at him)
    { x: REPORTER.x, z: REPORTER.z, heading: Math.atan2(-(MAYOR.x - REPORTER.x), -(MAYOR.z - REPORTER.z)), role: 'selfie', name: 'Reporter', stationary: true, color: 0x3d4a66, hat: 'cap', hatColor: 0x2a5ea8 },
    { x: KIOSK.x + 0.8, z: KIOSK.z - 1.4, heading: Math.PI, role: 'vendor', name: 'Vendor', stationary: true, post: true, color: 0xffffff, hat: 'chef', hatColor: 0xffffff },
    // the crowd that came for the ceremony: they stand round the ribbon and laugh at the Mayor
    ...[[-14, -9], [-12.5, -6.5], [-7.5, -6.5], [-6, -9.5], [-14.5, -12], [-5.5, -12]].map(([x, z], i) => ({ x, z, heading: Math.atan2(-(RIBBON.x - x), -(RIBBON.z - z)), role: 'guest', stationary: true, roam: 1.5, color: COATS[i % COATS.length] })),
  ],
  // the kiosk sells the first cones of summer: an angry Mayor buys one
  stations: [{ id: 'kiosk', x: KIOSK.x, z: KIOSK.z + 1.2, r: 9, sells: 'icecream', goods: { y: 1.08, dz: -0.2 } }],
  extraProps: [
    { type: 'icecream', x: KIOSK.x - 0.7, y: restY('icecream', 1.08), z: KIOSK.z - 0.2, tag: 'kioskCone' },
    { type: 'icecream', x: KIOSK.x + 0.7, y: restY('icecream', 1.08), z: KIOSK.z - 0.2, tag: 'kioskCone' },
    { type: 'bottle', x: -2, y: restY('bottle'), z: -13 },
  ],
  decor: [
    { kind: 'kiosk', x: KIOSK.x, z: KIOSK.z },
    { kind: 'ribbon', x: RIBBON.x, z: RIBBON.z },
  ],
  switches: [{ id: 'juke', x: JUKE.x, z: JUKE.z, label: 'jukebox', effect: 'dance', cooldown: 8 }],
  reactions: [
    { on: 'photobomb', say: 'The Reporter: "Better picture!"', witness: { x: MAYOR.x, z: MAYOR.z, r: 12, emote: 'laugh' } },
    { on: 'photobomb', witness: { x: MAYOR.x, z: MAYOR.z, r: 1.5, emote: 'anger' } },
    { on: 'ribbonCut', say: 'The Mayor: "My ribbon! I had a SPEECH!"', sound: 'gasp', mood: { role: 'mayor', mood: 'angry' }, witness: { x: RIBBON.x, z: RIBBON.z, r: 16, emote: 'laugh' } },
    { on: 'ribbonCut', witness: { x: MAYOR.x, z: MAYOR.z, r: 1.5, emote: 'question' } },
    { on: 'bought:mayor', say: 'The Mayor: "A little treat. After the day I have had."', witness: { x: KIOSK.x, z: KIOSK.z, r: 3, emote: 'heart' } },
    { on: 'robbed:mayor', say: 'The Mayor: "NOT THE FIRST CONE OF SUMMER!"', sound: 'gasp', witness: { x: MAYOR.x, z: MAYOR.z, r: 18, emote: 'laugh' } },
    { on: 'caught:mayor', say: 'The Mayor: "My scissors! Stop that gull!"' },
    { on: 'discovered:mayor', say: 'The Mayor: "My scissors? Who has taken the ceremonial scissors?"', witness: { x: MAYOR.x, z: MAYOR.z, r: 14, emote: 'laugh' }, repeat: true },
    { on: 'gotcha:mayor', say: 'The Mayor: "Ha! Got you!" (the Reporter takes the picture)', sound: 'bonk', witness: { x: REPORTER.x, z: REPORTER.z, r: 14, emote: 'laugh' } },
  ],
  strollers: 2,
  defense: false,
  start: { x: -16, z: -6.5 },
  parTime: 480,
};

// ---------------------------------------------------------------------------------------------------------------------------------
// P3. Fire Drill: the Guard's favourite day (rewritten joke-first in M100)
// ---------------------------------------------------------------------------------------------------------------------------------
const STALL = { x: -22, z: -14 };
const SIGN = { x: -20, z: -12.4 }; // the Fishmonger's shiny price sign, in front of his counter
const MUSTER = { x: -4, z: -9 };
const musterRing = (n: number) => Array.from({ length: n }, (_, i) => ({ x: MUSTER.x - 2.4 + (i % 3) * 1.4, z: MUSTER.z - 0.8 + Math.floor(i / 3) * 1.4, name: 'muster' }));

/**
 * P3. Fire Drill (M97, rewritten in M100). The Guard lives for procedure and runs to any alarm. The Fishmonger is a clean freak
 * about his counter and minds his golden fish. The muster crowd becomes the audience:
 *   the Guard marches the whole fish queue to the assembly point for nothing;
 *   the Fishmonger gets soaked (or splatted) at his own spotless counter and scrubs in a panic;
 *   the Fishmonger chases you, fish in beak, straight into the Guard's drill, and is made to stand in line.
 * Hidden: the Guard slips during his own drill.
 */
export const FIRE_DRILL: LevelDef = {
  id: 'fire-drill',
  name: 'P3. Fire Drill',
  blurb: 'A guard who loves drills, a fishmonger who loves his counter, and a golden fish.',
  district: 'kauppatori',
  series: 'Puzzles (new)',
  quests: [],
  extraQuests: [
    {
      id: 'drill',
      title: 'Fire drill',
      teaser: 'The Guard\'s favourite day, and the Fishmonger\'s worst.',
      timed: false,
      chain: true,
      joke: {
        joke: 'A fishmonger chasing a seagull through a fire drill is stopped by the guard and made to stand in line, while the gull sits on the MUSTER sign with his fish.',
        insight: 'The Guard obeys any alarm and makes everyone obey the drill; the Fishmonger chases anyone who takes his fish.',
        reaction: 'The queue stands in a neat line at the green sign, the Fishmonger scrubs his counter dripping wet, then fumes in line while the crowd laughs.',
      },
      objectives: [
        {
          id: 'drill',
          victim: 'guard',
          text: 'Get the whole fish queue to the assembly point (the alarm, a bun trail)',
          outcome: 'Make the Guard march the whole fish queue to the assembly point, for nothing.',
          nudge: 'The Guard believes in alarms. The queue believes in the Guard. Or in buns.',
          hint: 'Peck the red fire alarm (E): the Guard marches everyone to the green MUSTER sign. A trail of buns leads hungry people there, too.',
          kind: 'event',
          event: 'musterFull',
          markers: [{ x: MUSTER.x, z: MUSTER.z, r: 4, label: 'MUSTER' }],
          showMarker: true,
        },
        {
          id: 'soak',
          victim: 'cleaner',
          text: 'Soak the Fishmonger at his counter, or splat his shiny sign',
          outcome: 'Soak the Fishmonger at his own spotless counter.',
          nudge: 'A man who polishes his sign all day cannot bear a single drop on it, or on himself.',
          hint: 'Peck the blue sprinkler button (E), or poop on his shiny price sign (F): he drops everything to scrub, his back to the fish.',
          kind: 'event',
          event: 'soaked:cleaner',
          events: ['soaked:cleaner', 'signSplat'],
          markers: [{ x: STALL.x, z: STALL.z - 1.8, r: 3, label: 'The Fishmonger' }],
        },
        {
          id: 'line',
          victim: 'cleaner',
          text: 'Make the Fishmonger chase you into the drill',
          outcome: 'Make the Fishmonger run into the Guard\'s fire drill.',
          nudge: 'He chases anything that takes his fish. The Guard allows no running during a drill.',
          hint: 'Take the golden fish (E) where he can see you, and fly to the green MUSTER sign: he follows you right into the drill, and the Guard makes him stand in line.',
          kind: 'event',
          event: 'mongerInDrill',
        },
      ],
    },
    {
      id: 'drillSecret',
      title: 'Health and safety',
      teaser: 'Procedure is procedure.',
      timed: false,
      objectives: [{ id: 'slip', victim: 'guard', text: 'Make the Guard slip during his own drill', kind: 'event', event: 'slipped:guard', hint: 'He paces his round: a splat where he walks.' }],
    },
  ],
  secret: ['drillSecret'],
  triggers: [],
  extraTriggers: [
    { id: 'musterFull', kind: 'npcsInZone', event: 'musterFull', role: 'guest', zone: zone(MUSTER.x, MUSTER.z, 4.5), count: 4 },
    { id: 'mongerInDrill', kind: 'npcsInZone', event: 'mongerInDrill', role: 'cleaner', zone: zone(MUSTER.x, MUSTER.z, 4.5), count: 1 },
  ],
  tourists: [],
  extraTourists: [
    // the Fishmonger is a clean freak (role 'cleaner': a splat on his sign makes him scrub) who minds his golden fish
    { x: STALL.x, z: STALL.z - 1.8, heading: Math.PI, role: 'cleaner', name: 'Fishmonger', stationary: true, post: true, watch: 'goldFish', signAt: SIGN, color: 0x4a6fa5, hat: 'chef', hatColor: 0xffffff },
    { x: -30, z: -8, heading: Math.PI / 2, role: 'guard', name: 'Guard', patrol: [{ x: -12, z: -8 }, { x: -30, z: -8 }], color: 0xd6f23c, hat: 'cap', hatColor: 0xffc400 },
    ...[[-24, -10.5], [-22, -10], [-20, -10.8], [-23, -11.8], [-21, -11.8]].map(([x, z], i) => ({ x, z, heading: i * 1.3, role: 'guest', color: COATS[i % COATS.length] })),
    { x: -12, z: -16, heading: 1, role: 'bystander', color: 0xc7b5e0 },
  ],
  extraProps: [
    { type: 'fish', x: STALL.x, y: 0.99, z: STALL.z, tag: 'goldFish' },
    { type: 'sign', x: SIGN.x, y: restY('sign'), z: SIGN.z, tag: 'cleanSign' },
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
    { on: 'pecked:alarm', say: 'The Guard: "FIRE DRILL! Everyone to the assembly point! Walk, do not run!"', sound: 'alarm', send: { role: 'guest', goals: musterRing(5) }, oblivious: { role: 'guest', seconds: 25 } }, // they march; a gull on the way does not stop them
    { on: 'pecked:alarm', send: { role: 'guard', goals: [{ x: MUSTER.x + 2.6, z: MUSTER.z + 0.6, name: 'muster' }] } },
    { on: 'musterFull', say: 'The Guard: "Head count... all present! Excellent drill, everyone."', witness: { x: MUSTER.x, z: MUSTER.z, r: 5, emote: 'question' } },
    { on: 'soaked:cleaner', say: 'The Fishmonger: "My counter! My beautiful counter!"', distract: { role: 'cleaner', seconds: 8 }, witness: { x: STALL.x, z: STALL.z + 3, r: 14, emote: 'laugh' } },
    { on: 'signSplat', say: 'The Fishmonger: "Not the sign! I polished that this morning!"', witness: { x: STALL.x, z: STALL.z + 3, r: 14, emote: 'laugh' } },
    { on: 'mongerInDrill', say: 'The Guard: "NO RUNNING DURING A DRILL! Get in line, sir."', sound: 'whistle', mood: { role: 'cleaner', mood: 'angry' }, send: { role: 'cleaner', goals: [{ x: MUSTER.x, z: MUSTER.z + 2.2, name: 'inLine' }] }, oblivious: { role: 'cleaner', seconds: 20 }, witness: { x: MUSTER.x, z: MUSTER.z, r: 16, emote: 'laugh' } },
    { on: 'slipped:guard', say: 'The Guard: "...That was a demonstration."', witness: { x: -20, z: -8, r: 16, emote: 'laugh' } },
    { on: 'caught:cleaner', say: 'The Fishmonger: "My golden fish!"' },
    { on: 'discovered:cleaner', say: 'The Fishmonger: "Where is my golden fish? It was RIGHT HERE."', witness: { x: STALL.x, z: STALL.z + 3, r: 14, emote: 'laugh' }, repeat: true },
    { on: 'gotcha:cleaner', say: 'The Fishmonger: "Back on the counter with you!"', sound: 'bonk' },
  ],
  strollers: 2,
  defense: false,
  start: { x: -14, z: -6.5 },
  parTime: 480,
};
