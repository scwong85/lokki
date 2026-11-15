import type { LevelDef } from './types';
import { restY } from '../props';

/** The Clean Freak, his sign and his plate of fried vendace, on the open quay. */
export const FREAK = { x: -13, z: -13 };
export const FREAK_SIGN = { x: -9.5, z: -13 };

/**
 * Level 2: Bombs Away. Teaches pooping (and a little wind). Headline puzzle ("The Clean Freak"): a vendor is so proud of his
 * polished sign that he drops everything to scrub it the moment it gets splatted. Every splat while he is still
 * scrubbing makes him more frantic. His back is turned, his plate is open.
 */
export const BOMBS_AWAY: LevelDef = {
  id: 'bombs-away',
  name: '2. Bombs Away',
  blurb: 'Aim high, aim true, mind the wind.',
  district: 'kauppatori',
  requires: 'snack-attack',
  quests: [],
  extraQuests: [
    {
      id: 'freak',
      title: 'The Clean Freak',
      teaser: 'He loves his shiny sign more than his fish.',
      timed: false,
      objectives: [
        {
          id: 'splatSign',
          text: 'Splat the vendor\'s polished sign',
          kind: 'event',
          event: 'signSplat',
          hint: 'Press F (or B on a pad) while flying over it: the ring on the ground shows where it lands.',
          markers: [{ x: FREAK_SIGN.x, z: FREAK_SIGN.z, r: 2.5, label: 'Shiny sign' }],
        },
        {
          id: 'steal',
          text: 'Steal his fish while he scrubs',
          kind: 'event',
          event: 'snatch:fish',
          after: 'splatSign',
          hint: 'He has his back to the plate for several seconds: dive on it.',
          markers: [{ x: FREAK.x, z: FREAK.z, r: 2.5, label: 'Fried vendace' }],
        },
      ],
    },
    {
      id: 'bombs',
      title: 'Bombs away',
      teaser: 'Splat three tourists.',
      timed: false,
      objectives: [{ id: 'splatThree', text: 'Splat three tourists', kind: 'event', event: 'poopNpc', count: 3, hint: 'Fly over a tourist and press F; aim a little ahead of anyone who is walking.' }],
    },
    {
      id: 'frantic',
      title: 'Meltdown',
      timed: false,
      objectives: [{ id: 'melt', text: 'Splat the sign three times while he is still scrubbing', kind: 'event', event: 'frantic', hint: 'Keep going: every splat adds scrubbing time.' }],
    },
  ],
  coopQuests: [
    {
      id: 'duoSplat',
      title: 'Splat squad',
      timed: false,
      objectives: [{ id: 'duoSplat', text: 'Both gulls poop on people within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each: poop on someone within five seconds of each other.' }],
    },
  ],
  secret: ['frantic'],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: FREAK.x, z: FREAK.z, heading: Math.PI / 2, holds: 'fish', role: 'cleaner', stationary: true, signAt: FREAK_SIGN, color: 0xffffff },
    { x: -22, z: -22, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 8, z: -24, heading: -1.2, ice: true, color: 0xffc971 },
    { x: 26, z: -18, heading: 1.5, color: 0x9ec9f0 },
    { x: -2, z: -20, heading: 2.4, color: 0xff8fa3 },
  ],
  extraProps: [
    { type: 'sign', x: FREAK_SIGN.x, y: restY('sign'), z: FREAK_SIGN.z, tag: 'cleanSign' },
  ],
  defense: false,
  parTime: 270,
  reward: 'quickpoop',
};
