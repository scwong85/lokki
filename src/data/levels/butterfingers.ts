import type { LevelDef } from './types';
import { restY } from '../props';
import { CHILD_SPOT } from '../places';

/** The food blogger and the fishermen's crate with the raw herring. */
export const BLOGGER = { x: 6, z: -15 };
const HERRING_CRATE = { x: 19, z: -14 };

/**
 * Level 4: Butterfingers. Teaches carrying, dropping, and that people want things. Headline puzzle ("Bait and Switch"):
 * a food blogger photographs her salmon soup (3, 2, 1 ...) and adjusts her camera. Take the soup while she fiddles,
 * leave a raw herring at her feet, and wait for the review.
 */
export const BUTTERFINGERS: LevelDef = {
  id: 'butterfingers',
  name: '4. Butterfingers',
  blurb: 'Grab it, carry it, swap it.',
  district: 'kauppatori',
  requires: 'nosy-parkers',
  quests: ['swap', 'toy'],
  extraQuests: [
    {
      id: 'switch',
      title: 'Bait and Switch',
      teaser: 'A food blogger is about to meet the Baltic.',
      timed: false,
      objectives: [
        {
          id: 'soup',
          text: 'Take the blogger\'s soup while she adjusts her camera',
          kind: 'event',
          event: 'snatch:soup',
          hint: 'She holds the bowl up for a photo: 3, 2, 1, then she fiddles with the phone. The red ring turns green: take it.',
          markers: [{ x: BLOGGER.x, z: BLOGGER.z, r: 3, label: 'Food blogger' }],
        },
        {
          id: 'herring',
          text: 'Leave her a raw herring',
          kind: 'event',
          event: 'review',
          after: 'soup',
          hint: 'Take a herring from the fishermen\'s crate (E), and drop it (E) at her feet. Wait for her to try it.',
          markers: [{ x: HERRING_CRATE.x, z: HERRING_CRATE.z, r: 2.5, label: 'Raw herring' }],
        },
      ],
    },
    {
      id: 'photobomb',
      title: 'Camera shy',
      timed: false,
      objectives: [{ id: 'photo', text: 'Be in the blogger\'s photo', kind: 'event', event: 'photobomb', hint: 'Stand in front of her phone at the click.' }],
    },
  ],
  coopQuests: [
    {
      id: 'duoPass',
      title: 'Pass the parcel',
      timed: false,
      objectives: [{ id: 'duoPass', text: 'Mid-air passes: toss an item (Q) and the other gull catches it in flight, three times', kind: 'event', event: 'coop:pass', count: 3, hint: 'Toss with Q toward your partner. If they are flying close with an empty beak, it jumps into their beak.' }],
    },
  ],
  secret: ['photobomb'],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: BLOGGER.x, z: BLOGGER.z, heading: Math.PI, holds: 'soup', wants: ['herring'], role: 'blogger', stationary: true, color: 0xf7a1c4 },
    // the lilac tourist loves sweets (salmiakki swap) and the child on the quay lost the teddy (good bird)
    { x: -30, z: -14, heading: 0.2, holds: 'candy', wants: ['candy', 'salmiakki'], color: 0xc9a7f0 },
    { x: CHILD_SPOT.x, z: CHILD_SPOT.z, heading: 0, role: 'child', stationary: true, wants: ['toy'], scale: 0.65, color: 0x7ec8ff },
  ],
  extraProps: [
    { type: 'crate', x: HERRING_CRATE.x, y: restY('crate'), z: HERRING_CRATE.z },
    { type: 'herring', x: HERRING_CRATE.x - 0.15, y: restY('herring', 0.72), z: HERRING_CRATE.z },
    { type: 'herring', x: HERRING_CRATE.x + 0.2, y: restY('herring', 0.72), z: HERRING_CRATE.z + 0.1, rotY: 0.6 },
  ],
  defense: false,
  parTime: 300,
  reward: 'flight',
};
