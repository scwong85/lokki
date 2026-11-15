import type { LevelDef } from './types';
import { restY } from '../props';

export const OWL_SPOT = { x: -14, z: -10 };
export const GRANNY = { x: 24, z: -19 };

/**
 * Level 6: Owl Be Back. The city has put up nets and a plastic owl was left on the quay to scare gulls. Headline puzzle
 * ("Borrowed Authority"): the owl frightens everyone near it, so carry it to the bread granny: she runs, leaving her bread.
 */
export const OWL_BE_BACK: LevelDef = {
  id: 'owl-be-back',
  name: '6. Owl Be Back',
  blurb: 'Nets overhead, and a plastic owl that scares everyone.',
  district: 'kauppatori',
  requires: 'city-strikes',
  quests: [],
  extraQuests: [
    {
      id: 'owl',
      title: 'Borrowed Authority',
      teaser: 'Use the plastic owl against the bread granny.',
      timed: false,
      objectives: [
        {
          id: 'take',
          text: 'Pick up the plastic owl',
          kind: 'event',
          event: 'grab:owl',
          hint: 'The city left it on the quay to scare gulls. It is light: grab it with E.',
          markers: [{ x: OWL_SPOT.x, z: OWL_SPOT.z, r: 3, label: 'Plastic owl' }],
        },
        {
          id: 'scare',
          text: 'Carry it near the granny',
          kind: 'event',
          event: 'owlScare:granny',
          after: 'take',
          hint: 'People within a few metres of the owl run for it, and drop what they hold.',
          markers: [{ x: GRANNY.x, z: GRANNY.z, r: 4, label: 'Bread granny' }],
        },
        {
          id: 'bread',
          text: 'Take her bread',
          kind: 'event',
          event: 'grab:grannyBread',
          after: 'scare',
          hint: 'She fled and left the bag of bread on the ground.',
          markers: [{ x: GRANNY.x, z: GRANNY.z, r: 5, label: 'Bread' }],
        },
      ],
    },
    {
      id: 'nets',
      title: 'Under the net',
      teaser: 'Fly under the net three times.',
      timed: false,
      objectives: [{ id: 'net', text: 'Fly in under the net (3 times)', kind: 'event', event: 'dodge:nets', count: 3, hint: 'The net hangs high over the market. Fly in below it instead of diving from above.' }],
    },
    {
      id: 'wear',
      title: 'Wear the owl',
      timed: false,
      objectives: [{ id: 'wear', text: 'Scare three people with the owl in your beak', kind: 'event', event: 'owlScare:carried', count: 3, hint: 'Carry it through the square.' }],
    },
  ],
  secret: ['wear'],
  coopQuests: [
    {
      id: 'duoOwl',
      title: 'Double act',
      timed: false,
      objectives: [{ id: 'duoOwl', text: 'One gull holds the owl, the other takes the bread', kind: 'event', event: 'coop:handover', hint: 'Pass the owl or the bread from one gull to the other.' }],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: GRANNY.x, z: GRANNY.z, heading: Math.PI / 2, holds: 'bun', holdTag: 'grannyBread', role: 'granny', stationary: true, color: 0xb9a1d6 },
    { x: 4, z: -16, heading: 0.4, ice: true, color: 0x7fd1ae },
    { x: -2, z: -22, heading: 2.8, ice: true, color: 0xffc971 },
    { x: 12, z: -14, heading: -1.1, ice: true, color: 0xf7a1c4 },
  ],
  extraProps: [{ type: 'owl', x: OWL_SPOT.x, y: restY('owl'), z: OWL_SPOT.z }],
  defense: true,
  deploy: ['vendors', 'lines', 'nets'],
  startHeat: 22,
  parTime: 330,
  reward: 'fatbird',
};
