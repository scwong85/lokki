import type { LevelDef } from './types';

/** The angry vendor on the west side of the square, and the rich tourist who stands just in front of him (his back to the vendor). */
export const SPRAY_VENDOR = { x: -35, z: -17 };
export const RICH_TOURIST = { x: -33.2, z: -17 };

/**
 * Level 5: The City Strikes Back. The city fights back: vendors with spray bottles and scare lines are up from the start.
 * Headline puzzle ("Spray Tan"): the vendor sprays at gulls wherever they are. Stand just behind the rich tourist, the
 * spray goes through him and soaks him instead: he drops his lunch and storms off. Dodge out of the red fan in time.
 */
export const CITY_STRIKES: LevelDef = {
  id: 'city-strikes',
  name: '5. The City Strikes Back',
  blurb: 'Vendors spray, lines hang overhead. Let them hit someone else.',
  district: 'kauppatori',
  requires: 'butterfingers',
  quests: ['bun'],
  extraQuests: [
    {
      id: 'spray',
      title: 'Spray Tan',
      teaser: 'Make the angry vendor soak the rich tourist.',
      timed: false,
      objectives: [
        {
          id: 'soak',
          text: 'Get the vendor to spray the rich tourist',
          kind: 'event',
          event: 'soaked:rich',
          hint: 'The vendor sprays gulls near him. Land or fly low just behind the tourist in the top hat, wait for the red fan, then dodge sideways.',
          markers: [{ x: RICH_TOURIST.x, z: RICH_TOURIST.z, r: 3, label: 'Rich tourist' }],
        },
        {
          id: 'lunch',
          text: 'Grab the lunch he dropped',
          kind: 'event',
          event: 'grab:richLunch',
          after: 'soak',
          hint: 'He ran off and left his fried fish on the ground.',
          markers: [{ x: RICH_TOURIST.x, z: RICH_TOURIST.z, r: 5, label: 'Dropped lunch' }],
        },
      ],
    },
    {
      id: 'learn',
      title: 'The gulls learn',
      teaser: 'Slip through the scare lines five times.',
      timed: false,
      objectives: [{ id: 'lines', text: 'Fly through the scare lines without touching them (5 times)', kind: 'event', event: 'dodge:lines', count: 5, hint: 'Cross a line high above it or low under it: each clean pass teaches the gulls, and the city reacts.' }],
    },
    {
      id: 'wanted',
      title: 'Most wanted',
      timed: false,
      objectives: [{ id: 'heat', text: 'Push the city to heat 60', kind: 'event', event: 'heat60', hint: 'Snatch, splat and be seen until the meter is nearly full.' }],
    },
  ],
  secret: ['wanted'],
  coopQuests: [
    {
      id: 'duoSpray',
      title: 'Wet wingman',
      timed: false,
      objectives: [{ id: 'duoSpray', text: 'Rescue: peck your sprayed partner free', kind: 'event', event: 'coop:rescue', hint: 'A sprayed or netted gull is stuck for six seconds. Fly right up to it and it is free at once.' }],
    },
  ],
  triggers: ['bunRing'],
  tourists: [],
  extraTourists: [
    { x: RICH_TOURIST.x, z: RICH_TOURIST.z, heading: -Math.PI / 2, holds: 'fish', holdTag: 'richLunch', role: 'rich', stationary: true, hat: 'top', hatColor: 0x2a2a35, color: 0x6a4c93 },
    { x: -10, z: -20, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
  ],
  defense: true,
  deploy: ['vendors', 'lines'],
  startHeat: 22,
  parTime: 360,
  reward: 'hawkeye',
};
