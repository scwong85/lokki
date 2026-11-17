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
    { x: -188, z: -49, heading: -0.4, role: 'picnic', stationary: true, color: 0xf7a1c4 },
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
