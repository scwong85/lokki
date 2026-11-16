import type { LevelDef } from './types';
import { restY } from '../props';

/** Where the Warden eats his lunch (the sandwich is on the bench beside him). */
export const LUNCH_BENCH = { x: -20, z: -10 };
export const SANDWICH = { x: -19, z: -10 };

/**
 * Level 7: The Warden. The nemesis walks his rounds with his umbrella up. At lunch time he sits on his bench with the
 * umbrella down and his sandwich beside him (the level announces it). Poop him, or steal the sandwich.
 */
export const THE_WARDEN: LevelDef = {
  id: 'the-warden',
  name: '7. The Warden',
  blurb: 'He never takes the umbrella down. Except at lunch.',
  district: 'kauppatori',
  requires: 'owl-be-back',
  quests: [],
  extraQuests: [
    {
      id: 'lunch',
      title: 'Lunch Break',
      teaser: 'Catch the Warden at lunch.',
      timed: false,
      objectives: [
        {
          id: 'wait',
          text: 'Wait for the Warden to go for lunch',
          kind: 'event',
          event: 'wardenLunch',
          hint: 'He takes a lunch break soon: the level tells you. Until then keep away from him.',
        },
        {
          id: 'poop',
          text: 'Poop on the Warden while his umbrella is down',
          kind: 'event',
          event: 'poopWarden',
          after: 'wait',
          hint: 'He sits on his bench for a while with the umbrella down: dive in and drop it from above.',
          markers: [{ x: LUNCH_BENCH.x, z: LUNCH_BENCH.z, r: 3, label: 'The Warden\'s bench' }],
        },
      ],
    },
    {
      id: 'sandwich',
      title: 'Lunch thief',
      teaser: 'Steal the Warden\'s sandwich.',
      timed: false,
      objectives: [
        {
          id: 'take',
          text: 'Steal his sandwich',
          kind: 'event',
          event: 'grab:wardenSandwich',
          hint: 'It lies on the bench beside him.',
          markers: [{ x: SANDWICH.x, z: SANDWICH.z, r: 3, label: 'Sandwich' }],
        },
      ],
    },
    {
      id: 'unseen',
      title: 'Perfect lunch',
      timed: false,
      objectives: [{ id: 'unseen', text: 'Take the sandwich while he is still eating', kind: 'event', event: 'sandwichUnseen', hint: 'Come in from behind while he is busy with his lunch.' }],
    },
  ],
  secret: ['unseen'],
  coopQuests: [
    {
      id: 'duoWarden',
      title: 'Pincer',
      timed: false,
      objectives: [{ id: 'duoWarden', text: 'Both gulls poop on people within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each.' }],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -8, z: -18, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 14, z: -20, heading: -1.2, ice: true, color: 0xffc971 },
  ],
  extraProps: [{ type: 'bun', x: SANDWICH.x, y: restY('bun', 0), z: SANDWICH.z, tag: 'wardenSandwich' }],
  defense: true,
  deploy: ['warden'],
  wardenLunch: { at: 18, duration: 40, x: LUNCH_BENCH.x, z: LUNCH_BENCH.z, repeat: 100 },
  parTime: 300,
  reward: 'disguise',
};
