import type { LevelDef } from './types';
import { restY } from '../props';
import { ESPA_START } from './espa1';

const finish = { id: 'escape', text: 'Get away with it', kind: 'escape' as const, hint: 'Keep it and stay far from everyone until the bar fills.' };

/** M13. Leaf Blower (gust): low, fast wingbeats blow light things away. Sweep three caps off the quay. */
export const LEAF_BLOWER: LevelDef = {
  id: 'leaf-blower',
  name: 'M13. Leaf Blower',
  blurb: 'Hover low and flap. Light things blow away.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'blowchain',
      title: 'Leaf Blower',
      teaser: 'Blow the three caps off the quay with your wings.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'one', text: 'Blow one cap off the quay', kind: 'event', event: 'blown:1', hint: 'Fly low over a cap, behind it, and flap (Space) a few times. Things blow away from you, towards the sea.', markers: [{ x: 0, z: -12, r: 6, label: 'Caps' }] },
        { id: 'three', text: 'Blow all three off', kind: 'event', event: 'blown:3', after: 'one', hint: 'Each flap pushes anything light below you.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraProps: [-4, 0, 4].map((x) => ({ type: 'cap' as const, x, y: restY('cap'), z: -14, tag: 'blowCap' })),
  sweep: { tag: 'blowCap', zone: { minX: -40, maxX: 40, minZ: -5.2, maxZ: 40 }, event: 'blown' },
  defense: false,
  start: { x: 0, z: -30 },
  parTime: 240,
};

/** M14. Domino Rally (domino): push the first tile and the row falls into the queue. */
export const DOMINO_RALLY: LevelDef = {
  id: 'domino-rally',
  name: 'M14. Domino Rally',
  blurb: 'Push the first tile. The queue is next.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'dominochain',
      title: 'Domino Rally',
      teaser: 'Topple the row into the queue, then take a cone.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'push', text: 'Push the first tile (E)', kind: 'event', event: 'pecked:dom', hint: 'Land by the first pink tile and press E.', markers: [{ x: -14, z: -20, r: 4, label: 'Tiles' }] },
        { id: 'fall', text: 'Knock down three people', kind: 'event', event: 'knockdown:3', after: 'push', hint: 'The last tile falls into the queue, and they knock each other over.' },
        { id: 'cone', text: 'Take a cone', kind: 'event', event: 'grab:domCone', hint: 'Grab one with E.' },
        { ...finish, after: 'cone' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: Array.from({ length: 4 }, (_, i) => ({ x: -4.4 + i * 1.3, z: -20, heading: Math.PI / 2, ice: true, holdTag: 'domCone', role: 'queuer', stationary: true, post: true, color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8][i] })),
  switches: [{ id: 'dom', x: -14, z: -20, label: 'first tile', effect: 'domino', cooldown: 12, target: { x: -6, z: -20 }, tiles: 8 }],
  defense: false,
  start: { x: -14, z: -34 },
  parTime: 240,
};

/** M15. Captain Gull (impersonation): wear the captain's cap and nobody sees a gull. */
export const CAPTAIN_GULL: LevelDef = {
  id: 'captain-gull',
  name: 'M15. Captain Gull',
  blurb: 'Put on the cap. Nobody sees a gull.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'captainchain',
      title: 'Captain Gull',
      teaser: 'Wear the captain\'s cap, and take a cone from under their noses.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'wear', text: 'Wear the captain\'s cap (E)', kind: 'event', event: 'pecked:cap', hint: 'The red hat on the post.', markers: [{ x: -6, z: -22, r: 4, label: 'Cap' }] },
        { id: 'cone', text: 'Take a cone from a guard', kind: 'event', event: 'grab:capCone', hint: 'While the cap lasts, nobody notices a gull. Walk right up and take it (E).', markers: [{ x: 2, z: -18, r: 8, label: 'Guards' }] },
        { ...finish, after: 'cone' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: 0, z: -16, heading: Math.PI, ice: true, holdTag: 'capCone', role: 'guard', stationary: true, color: 0xf7a1c4 },
    { x: 4, z: -18, heading: Math.PI, ice: true, holdTag: 'capCone', role: 'guard', stationary: true, color: 0x9ec9f0 },
    { x: 2, z: -21, heading: 0, ice: true, holdTag: 'capCone', role: 'guard', stationary: true, color: 0xffd36e },
  ],
  switches: [{ id: 'cap', x: -6, z: -22, label: 'captain\'s cap', effect: 'disguise', cooldown: 30 }],
  defense: false,
  start: { x: -6, z: -34 },
  parTime: 240,
};

/** M16. Hush Puppy (dog and honk): honk from beyond the picnic and the dog bounds straight through it. */
export const HUSH_PUPPY: LevelDef = {
  id: 'hush-puppy',
  name: 'M16. Hush Puppy',
  blurb: 'Honk. The dog comes running, through the picnic.',
  district: 'esplanadi',
  series: 'Mischief (new)',
  start: ESPA_START,
  dogs: [{ x: -178, z: -55, ownerX: -194, ownerZ: -49 }],
  quests: [],
  extraQuests: [
    {
      id: 'hushchain',
      title: 'Hush Puppy',
      teaser: 'Honk from the far side of the picnic, and take a sausage.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'honk', text: 'Honk (tap T) beyond the picnic so the dog runs through it', kind: 'event', event: 'dogScatter', hint: 'Fly past the blanket to the west and tap T. The dog bounds over and tramples the picnic. Stay in the air: a dog chases a gull on the ground.', markers: [{ x: -190, z: -52, r: 4, label: 'Picnic' }] },
        { id: 'sausage', text: 'Grab a sausage in the chaos', kind: 'event', event: 'grab:sausage', hint: 'The sausages fly. Grab one.' },
        { ...finish, after: 'sausage' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -194, z: -49, heading: 0.5, role: 'owner', stationary: true, color: 0x9ec9f0 },
    { x: -188, z: -49, heading: -0.4, role: 'picnic', stationary: true, roam: 3, color: 0xf7a1c4 },
  ],
  extraProps: [
    { type: 'sausage', x: -190.4, y: restY('sausage'), z: -52 },
    { type: 'sausage', x: -189.6, y: restY('sausage'), z: -52.4 },
    { type: 'sausage', x: -190.0, y: restY('sausage'), z: -51.4 },
    { type: 'sausage', x: -191.0, y: restY('sausage'), z: -52.8 },
  ],
  defense: false,
  parTime: 240,
};

/** M16. Block Party (attractors): a boom box draws the whole square; carry it and the crowd follows. */
export const BLOCK_PARTY: LevelDef = {
  id: 'block-party',
  name: 'M16. Block Party',
  blurb: 'Peck the boom box. Everyone comes to dance. Carry it with Fat bird and they follow.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'partychain',
      title: 'Block Party',
      teaser: 'Start the music, get a crowd dancing, then take a dancer\'s ice cream.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'play', text: 'Start the music (E on the boom box)', kind: 'event', event: 'pecked:boombox', hint: 'The pink boom box by the wall. Without Fat bird you peck it; with it you can lift it and the crowd follows.', markers: [{ x: -14, z: -20, r: 4, label: 'Boom box' }] },
        { id: 'dance', text: 'Get five people dancing', kind: 'event', event: 'dancers:5', after: 'play', hint: 'Everyone who is not busy walks over. Wait for them, or carry the box to them.' },
        { id: 'cone', text: 'Take a dancer\'s ice cream', kind: 'event', event: 'grab:partyCone', hint: 'Dancers are too happy to guard. Grab the cone with E.' },
        { ...finish, after: 'cone' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraProps: [{ type: 'boombox', x: -14, y: 0.4, z: -20 }],
  extraTourists: [
    { x: -4, z: -14, heading: 0.4, ice: true, holdTag: 'partyCone', role: 'partygoer', color: 0xf7a1c4 },
    { x: 6, z: -22, heading: -0.4, ice: true, holdTag: 'partyCone', role: 'partygoer', color: 0x9ec9f0 },
    { x: 0, z: -30, heading: 0.9, ice: true, holdTag: 'partyCone', role: 'partygoer', color: 0xffd36e },
    { x: -12, z: -10, heading: -0.9, ice: true, holdTag: 'partyCone', role: 'partygoer', color: 0xb8e0c8 },
    { x: 10, z: -12, heading: 0.2, role: 'partygoer', color: 0xc7b5e0 },
    { x: 2, z: -6, heading: 2.2, role: 'partygoer', color: 0xf2a35e },
  ],
  strollers: 4,
  timetable: ['ferry'],
  defense: false,
  start: { x: -14, z: -34 },
  parTime: 300,
};

const sq = (x: number, z: number, r: number) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
const BYSTANDERS = (pts: [number, number][]) => pts.map(([x, z], i) => ({ x, z, heading: i, role: 'bystander', color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e][i % 6] }));

/** M17. Shoo! (repulsor): a honk sends free people away; clear the stall, then take what the crowd was guarding. */
export const SHOO: LevelDef = {
  id: 'shoo',
  name: 'M17. Shoo!',
  blurb: 'A honk sends the crowd packing. Clear the stall, take the cone.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'shoochain',
      title: 'Shoo!',
      teaser: 'Honk the crowd away from the stall, then take the cone.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'clear', text: 'Honk the crowd away from the stall (T)', kind: 'event', event: 'squareClear', hint: 'Stand near the crowd and honk: everyone jumps and walks away from you.', markers: [{ x: -6, z: -20, r: 7, label: 'The crowd' }] },
        { id: 'cone', text: 'Take the cone from the empty stall', kind: 'event', event: 'grab:shooCone', after: 'clear', hint: 'Nobody is guarding it now: grab it (E).' },
        { ...finish, after: 'cone' },
      ],
    },
  ],
  triggers: [],
  extraTriggers: [{ id: 'squareClear', kind: 'npcsClear', event: 'squareClear', role: 'bystander', zone: sq(-6, -20, 7), min: 4, max: 0 }],
  tourists: [],
  extraTourists: BYSTANDERS([[-9, -22], [-3, -22], [-6, -17], [-10, -18], [-2, -18], [-6, -24]]),
  extraProps: [{ type: 'icecream', x: -6, y: restY('icecream'), z: -20, tag: 'shooCone' }],
  strollers: 0,
  defense: false,
  start: { x: -6, z: -34 },
  parTime: 240,
};

/** M18. Breadcrumbs (food attractor): drop buns in a line and a crowd comes to eat, and gathers where the trail ends. */
export const BREADCRUMBS: LevelDef = {
  id: 'breadcrumbs',
  name: 'M18. Breadcrumbs',
  blurb: 'Hungry people follow a trail of buns. Lay one, and gather a crowd.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'crumbchain',
      title: 'Breadcrumbs',
      teaser: 'Lay a trail of buns and gather four people at the bench.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'bun', text: 'Pick up a bun (E)', kind: 'event', event: 'grab:bun', hint: 'The buns lie on the ground by the crates.', markers: [{ x: -24, z: -30, r: 4, label: 'Buns' }] },
        { id: 'trail', text: 'Let three buns be eaten', kind: 'event', event: 'crumbs:3', after: 'bun', hint: 'Put a bun down (E) anywhere in the square: anybody within about 18 m spots it (a ! over their head) and comes to eat. Then step back.' },
        { id: 'crowd', text: 'Get four people to the bench', kind: 'event', event: 'crowdAtBench', after: 'trail', hint: 'Drop the next buns by the bench: the crowd comes to eat them there.', markers: [{ x: -6, z: -14, r: 6, label: 'Bench' }] },
        { ...finish, after: 'crowd' },
      ],
    },
  ],
  triggers: [],
  extraTriggers: [{ id: 'crowdAtBench', kind: 'npcsInZone', event: 'crowdAtBench', role: 'bystander', zone: sq(-6, -14, 6), count: 4 }],
  tourists: [],
  extraTourists: BYSTANDERS([[-16, -24], [-12, -12], [-2, -14], [-4, -24], [-20, -18], [-10, -28]]),
  extraProps: [-26, -25, -24, -23, -22].map((x) => ({ type: 'bun' as const, x, y: restY('bun'), z: -30 })),
  crumbs: ['bun'],
  strollers: 0,
  defense: false,
  start: { x: -24, z: -36 },
  parTime: 300,
};
