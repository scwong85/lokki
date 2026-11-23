import type { LevelDef } from './types';
import { restY } from '../props';

/** The watchful tourist and the crates with bottles on them. */
export const WATCHER = { x: 10, z: -12 };
const CRATES = [{ x: 16.5, z: -9 }, { x: 4, z: -9.5 }];
const crateTop = 0.72;

/**
 * Level 3: Nosy Parkers. Teaches what people see and hear: sight cones (nobody sees straight above or behind them) and
 * noise. Headline puzzle ("Bottle Service"): a watchful tourist never looks away from you. Make a noise behind her
 * (drop a bottle from the crates) and when she turns to look, her ice cream is on the open side.
 */
export const NOSY_PARKERS: LevelDef = {
  id: 'nosy-parkers',
  name: '3. Nosy Parkers',
  blurb: 'Eyes and ears: they see forward, they hear everything.',
  district: 'kauppatori',
  requires: 'bombs-away',
  quests: [],
  extraQuests: [
    {
      id: 'bottleService',
      title: 'Bottle Service',
      teaser: 'She never takes her eyes off you.',
      timed: false,
      objectives: [
        {
          id: 'distract',
          text: 'Make a noise so the watchful tourist looks away',
          kind: 'event',
          event: 'distract',
          hint: 'Grab a bottle from the crates (E) and drop or toss it (E / Q) away from her: bottles clatter loudly. Tourists turn toward noise.',
          markers: [{ x: CRATES[0].x, z: CRATES[0].z, r: 2.5, label: 'Bottles' }],
        },
        {
          id: 'snatch',
          text: 'Snatch her ice cream while she looks',
          kind: 'event',
          event: 'snatch:icecream',
          events: ['grab:watchCone'], // a honk makes her drop it: picking it up counts too
          after: 'distract',
          hint: 'The red ring turns green when her ice cream is open. Go in from the side her hand is on, or dive from straight above.',
          markers: [{ x: WATCHER.x, z: WATCHER.z, r: 2.5, label: 'Watchful tourist' }],
        },
      ],
    },
    {
      id: 'unseen',
      title: 'Never saw it coming',
      teaser: 'Nobody sees you from behind.',
      timed: false,
      objectives: [{ id: 'unseen', text: 'Snatch something from a tourist who has not noticed you', kind: 'event', event: 'snatchUnseen', hint: 'Tourists see in front of them only, and not straight above. Come in from behind or dive from high up.' }],
    },
    {
      id: 'double',
      title: 'Double snatch',
      timed: false,
      objectives: [{ id: 'double', text: 'Snatch two things within eight seconds', kind: 'event', event: 'doubleSnatch', hint: 'One noise, two distracted tourists.' }],
    },
  ],
  coopQuests: [
    {
      id: 'duoSnatch',
      title: 'Good cop, bad gull',
      timed: false,
      objectives: [{ id: 'duoSnatch', text: 'Decoy and thief: one gull taunts (hold T), the other snatches', kind: 'event', event: 'coop:decoy', hint: 'One gull holds T near the tourists: everyone watches it. The other snatches from behind while they stare.' }],
    },
  ],
  secret: ['double'],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: WATCHER.x, z: WATCHER.z, heading: 0, ice: true, holdTag: 'watchCone', look: 'f', stationary: true, color: 0xff8fa3 },
    { x: -14, z: -22, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 26, z: -20, heading: -1.2, ice: true, color: 0xffc971 },
    { x: -2, z: -26, heading: 2.4, ice: true, color: 0x9ec9f0 },
  ],
  extraProps: [
    ...CRATES.map((c) => ({ type: 'crate' as const, x: c.x, y: restY('crate'), z: c.z })),
    ...CRATES.map((c) => ({ type: 'bottle' as const, x: c.x, y: restY('bottle', crateTop), z: c.z })),
  ],
  defense: false,
  parTime: 270,
  reward: 'mimic',
};
