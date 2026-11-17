import type { LevelDef } from './types';
import { stallGoods } from './chains';

/** The south-row ice cream stall: column 3, so customers come up from the quay side (south). */
export const ICE_STALL = { id: 'iceStall', x: -8, z: -27, r: 5, goods: { dz: -3, y: 1.0 } };
/** Where the tourist with the map starts: east end of the quay. */
export const MAPPER_SPOT = { x: 20, z: -14 };

/**
 * C1. Map and Cone: the first chain level (docs/design/chain-levels.md). One objective, five steps, and every step is
 * somebody reacting to the one before: snatch the map and the tourist gets angry and chases you; hold T to taunt and
 * lead him to the ice cream stall; upset, he buys a cone to feel better and for a while only has eyes for it; snatch the
 * cone and get away. Then the victory run.
 */
export const MAP_AND_CONE: LevelDef = {
  id: 'map-and-cone',
  name: 'C1. Map and Cone',
  blurb: 'Make a tourist buy you an ice cream. Anger, comfort food, the lot.',
  district: 'kauppatori',
  series: 'Chain levels (new)',
  quests: [],
  extraQuests: [
    {
      id: 'mapcone',
      title: 'Treat yourself',
      teaser: 'Get a tourist to buy you an ice cream.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'map',
          text: 'Snatch the map from the tourist',
          kind: 'event',
          event: 'robbed:mapper',
          hint: 'The tourist at the east end of the quay is holding a map. Dive on it, or wait until he looks away.',
          markers: [{ x: MAPPER_SPOT.x, z: MAPPER_SPOT.z, r: 4, label: 'Tourist with a map' }],
        },
        {
          id: 'lure',
          text: 'Lead the angry tourist to the ice cream stall',
          kind: 'event',
          event: 'atStation:mapper:iceStall',
          after: 'map',
          hint: 'He is chasing you. Hold T to taunt so he keeps following, and fly low towards the ice cream stall (the south row, in the middle).',
          markers: [{ x: ICE_STALL.x, z: ICE_STALL.z - 3, r: 5, label: 'Ice cream stall' }],
        },
        { id: 'buy', text: 'Let him buy himself a treat', kind: 'event', event: 'bought:mapper', after: 'lure', hint: 'Keep out of his sight for a moment. Comfort food takes a few seconds.' },
        {
          id: 'cone',
          text: 'Snatch his ice cream',
          kind: 'event',
          event: 'robbed:mapper',
          after: 'buy',
          hint: 'He only has eyes for the cone now. Come in from the side and take it.',
        },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'cone', hint: 'Keep the ice cream and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: MAPPER_SPOT.x, z: MAPPER_SPOT.z, heading: 1.6, holds: 'map', craves: 'icecream', role: 'mapper', color: 0xf7a1c4 },
    { x: -30, z: -14, heading: 0.2, ice: true, color: 0xc9a7f0 },
    { x: 4, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
  ],
  // the stall's cones are real: they stand on the counter (so a customer takes one, and so can you)
  stations: [{ ...ICE_STALL, sells: 'icecream' as const }],
  extraProps: stallGoods({ ...ICE_STALL, sells: 'icecream' }, 'stallCone'),
  defense: false,
  parTime: 240,
};
