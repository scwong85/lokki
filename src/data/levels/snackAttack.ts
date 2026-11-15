import type { LevelDef } from './types';

/** Where the selfie tourist stands (an open stretch of quay between the market and the ferry). */
export const SELFIE_SPOT = { x: 4, z: -16 };

/**
 * Level 1: Snack Attack. Teaches flight, the dive-snatch and carrying, with one headline puzzle ("Say cheese!"):
 * a tourist guards her ice cream perfectly, except when she takes a selfie. She counts "3, 2, 1" (shown above her
 * head) and for two seconds only has eyes for the phone. Dive on the 1.
 * Design: docs/design/levels-kauppatori.md (Act 1, level 1).
 */
export const SNACK_ATTACK: LevelDef = {
  id: 'snack-attack',
  name: '1. Snack Attack',
  blurb: 'Your first snack. Mind the selfie.',
  district: 'kauppatori',
  quests: [],
  extraQuests: [
    {
      id: 'snack',
      title: 'Say cheese!',
      teaser: 'Nick a tourist\'s ice cream.',
      timed: false,
      objectives: [
        {
          id: 'snatch',
          text: 'Snatch an ice cream from a tourist',
          kind: 'event',
          event: 'snatch:icecream',
          hint: 'A red ring means guarded. The tourist on the quay takes selfies: when she counts 3, 2, 1, dive on the 1, her ice cream is open for two seconds.',
          markers: [{ x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, r: 3, label: 'Selfie tourist' }],
        },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'snatch', hint: 'Keep the ice cream and stay far away from everyone until the bar fills.' },
      ],
    },
    {
      id: 'feast',
      title: 'Rooftop feast',
      teaser: 'Eat in peace, up high.',
      timed: false,
      objectives: [{ id: 'roof', text: 'Land on a rooftop with your loot', kind: 'event', event: 'feast', hint: 'Carry the ice cream and land on any roof (buildings are the tall boxes around the square).' }],
    },
    {
      id: 'photobomb',
      title: 'Photobomb',
      timed: false,
      objectives: [{ id: 'photo', text: 'Be in the selfie when she clicks', kind: 'event', event: 'photobomb', hint: 'Stand in front of her phone at the click.' }],
    },
  ],
  coopQuests: [
    {
      id: 'duoPhoto',
      title: 'Say cheese, together',
      timed: false,
      objectives: [{ id: 'duoPhoto', text: 'Both gulls in the selfie when she clicks', kind: 'event', event: 'coop:photobomb', hint: 'Both gulls stand in front of her phone at the click.' }],
    },
  ],
  secret: ['photobomb'],
  triggers: [],
  extraTriggers: [{ id: 'feast', kind: 'carryLanded', event: 'feast', propType: 'icecream', minY: 6 }],
  tourists: [],
  extraTourists: [
    { x: SELFIE_SPOT.x, z: SELFIE_SPOT.z, heading: Math.PI, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -22, z: -20, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
  ],
  defense: false,
  parTime: 240,
};
