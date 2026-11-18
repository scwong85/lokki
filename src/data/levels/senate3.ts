import type { LevelDef } from './types';
import { restY } from '../props';
import { SENATE_START } from './senate';
import { EMPEROR, TRAM } from './senate2';

/** The concert stage (west side of the square) and the library annex (east side). */
export const STAGE = { x: -180.5, z: -303, top: 1.0 };
export const LIBRARY = { x: -133, z: -300 };
export const CHRISTMAS = { sackX: -150, sackZ: -312, kidsX: -166, kidsZ: -292 };

const zone = (x: number, z: number, r: number, maxY = 2.5) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, maxY });

/**
 * Senate Square, level 7: Concert Night. Headline puzzle ("Jumbotron"): get on the big screen three times (photobomb the camera
 * crew), then call (Mimic) in the quiet bit so every phone in the crowd rings. Mimic is lent for the evening.
 */
export const CONCERT_NIGHT: LevelDef = {
  id: 'concert-night',
  name: 'S7. Concert Night',
  blurb: 'Get on the big screen. Ring every phone.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'new-look',
  night: true,
  skills: ['mimic'],
  quietBreaks: { first: 18, every: 40, duration: 12 },
  quests: [],
  extraQuests: [
    {
      id: 'screen',
      title: 'Jumbotron',
      teaser: 'Get on the big screen three times, then ring every phone.',
      timed: false,
      objectives: [
        { id: 'bomb', text: 'Photobomb the camera crew (three times)', kind: 'event', event: 'photobomb', count: 3, hint: 'The two camera people count 3, 2, 1. Be in front of the lens at the click.', markers: [{ x: -172, z: -309, r: 3, label: 'Camera' }, { x: -172, z: -297, r: 3, label: 'Camera' }] },
        { id: 'phones', text: 'In the quiet bit, press V to caw so every phone rings', kind: 'event', event: 'mimicQuiet', hint: 'The band goes silent for 12 seconds every 40 seconds. Caw (V) then.', markers: [{ x: -166, z: STAGE.z, r: 6, label: 'Crowd' }] },
      ],
    },
    {
      id: 'baton',
      title: 'Galop Infernal',
      teaser: 'Steal the conductor\'s baton.',
      timed: false,
      objectives: [{ id: 'baton', text: 'Take the conductor\'s baton', kind: 'event', event: 'grab:baton', hint: 'He stands at the front of the stage.', markers: [{ x: STAGE.x + 1.5, z: STAGE.z, r: 3, y: STAGE.top, label: 'Baton' }] }],
    },
    {
      id: 'conduct',
      title: 'Maestro',
      timed: false,
      objectives: [
        { id: 'around', text: 'Carry the baton round the stage: conduct!', kind: 'event', event: 'conducted', hint: 'Walk or fly the baton past the three corners of the stage.' },
      ],
    },
  ],
  secret: ['conduct'],
  coopQuests: [{ id: 'duoConcert', title: 'Encore', timed: false, objectives: [{ id: 'duoConcert', text: 'Both gulls splat someone within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [
    {
      id: 'conduct',
      kind: 'carryCheckpoints',
      propType: 'baton',
      points: [{ x: STAGE.x + 4, z: STAGE.z - 7, r: 4 }, { x: STAGE.x + 4, z: STAGE.z + 7, r: 4 }, { x: STAGE.x + 8, z: STAGE.z, r: 4 }],
      events: ['conductA', 'conductB', 'conducted'],
      maxY: 6,
    },
  ],
  tourists: [],
  extraTourists: [
    { x: -172, z: -309, heading: Math.PI, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -172, z: -297, heading: Math.PI, role: 'selfie', stationary: true, color: 0x9ec9f0 },
    { x: -168, z: -304, heading: Math.PI, ice: true, color: 0xffc971 },
    { x: -165, z: -300, heading: Math.PI, ice: true, color: 0x7fd1ae },
    { x: -164, z: -308, heading: Math.PI, color: 0xc7b5e0 },
    { x: STAGE.x + 1.5, z: STAGE.z + 2, y: STAGE.top, heading: Math.PI / 2, role: 'conductor', stationary: true, color: 0x2f3a55 },
  ],
  extraProps: [{ type: 'baton', x: STAGE.x + 1.2, y: restY('baton', STAGE.top), z: STAGE.z, tag: 'baton' }],
  defense: false,
  parTime: 300,
};

/**
 * Senate Square, level 8: Christmas Market (winter). Headline puzzle ("Santa's Little Helper"): the toys are stuck in the
 * boring pile by Santa's sack. Carry two toys to the children. The market stall also has a gingerbread heart.
 */
export const CHRISTMAS_MARKET: LevelDef = {
  id: 'christmas-market',
  sky: 'dusk',
  name: 'S8. Christmas Market',
  blurb: 'Swap the presents. The children get the toys.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'concert-night',
  winter: true,
  quests: [],
  extraQuests: [
    {
      id: 'gifts',
      title: 'Santa\'s Little Helper',
      teaser: 'Get two toys from Santa\'s sack to the children.',
      timed: false,
      objectives: [
        { id: 'toys', text: 'Carry two toys from Santa\'s pile to the children', kind: 'event', event: 'toysDelivered', hint: 'The toys are in the red sack by Santa. The children wait in the middle of the square.', markers: [{ x: CHRISTMAS.sackX, z: CHRISTMAS.sackZ, r: 3, label: 'Santa\'s sack' }, { x: CHRISTMAS.kidsX, z: CHRISTMAS.kidsZ, r: 3, label: 'Children' }] },
      ],
    },
    {
      id: 'heart',
      title: 'Sweet tooth',
      teaser: 'Steal a gingerbread heart.',
      timed: false,
      objectives: [{ id: 'heart', text: 'Take a gingerbread heart from the stall', kind: 'event', event: 'grab:heart', hint: 'The stall is by the steps on the east side.', markers: [{ x: -140, z: -310, r: 3, label: 'Stall' }] }],
    },
    {
      id: 'santa',
      title: 'Ho ho ho',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat Santa', kind: 'event', event: 'poopNpc:santa', hint: 'He is by his sack.' }],
    },
  ],
  secret: ['santa'],
  coopQuests: [{ id: 'duoXmas', title: 'Two sacks', timed: false, objectives: [{ id: 'duoXmas', text: 'One gull drops a toy, the other picks it up', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'toysDelivered', kind: 'propInZone', event: 'toysDelivered', propType: 'toy', count: 2, zone: zone(CHRISTMAS.kidsX, CHRISTMAS.kidsZ, 3.5) }],
  tourists: [],
  extraTourists: [
    { x: CHRISTMAS.sackX + 2, z: CHRISTMAS.sackZ, heading: Math.PI, role: 'santa', stationary: true, color: 0xd9534f },
    { x: CHRISTMAS.kidsX - 1, z: CHRISTMAS.kidsZ, heading: 0, color: 0x9ec9f0 },
    { x: CHRISTMAS.kidsX + 1, z: CHRISTMAS.kidsZ + 1, heading: 0.3, color: 0xffc971 },
    { x: -136, z: -310, heading: 1.57, role: 'vendor', stationary: true, color: 0xf2a35e },
  ],
  extraProps: [
    { type: 'toy', x: CHRISTMAS.sackX, y: restY('toy'), z: CHRISTMAS.sackZ - 1 },
    { type: 'toy', x: CHRISTMAS.sackX + 0.6, y: restY('toy'), z: CHRISTMAS.sackZ - 0.4 },
    { type: 'toy', x: CHRISTMAS.sackX - 0.6, y: restY('toy'), z: CHRISTMAS.sackZ + 0.3 },
    { type: 'bun', x: -139.3, y: restY('bun', 1.0), z: -310, tag: 'heart' },
  ],
  defense: false,
  parTime: 300,
};

/**
 * Senate Square, level 9: The Library Rule. Headline puzzle ("Shhh!"): students revise on the library steps with snacks. Flying
 * or diving near the library makes a racket everyone hears; walk. Steal three snacks.
 */
export const LIBRARY_RULE: LevelDef = {
  id: 'library-rule',
  name: 'S9. The Library Rule',
  blurb: 'Quiet zone: walk, do not fly.',
  district: 'senaatintori',
  start: { x: -150, z: -290 },
  requires: 'christmas-market',
  quiet: { x: LIBRARY.x - 6, z: LIBRARY.z, r: 15 },
  quests: [],
  extraQuests: [
    {
      id: 'shhh',
      title: 'Shhh!',
      teaser: 'Steal three snacks from the students. Quietly.',
      timed: false,
      objectives: [{ id: 'snacks', text: 'Snatch three snacks from the revising students', kind: 'event', event: 'snatch', count: 3, hint: 'Walk up on foot: flying or diving near the library makes a racket (and heat).', markers: [{ x: LIBRARY.x - 8.5, z: LIBRARY.z, r: 6, label: 'Library steps' }] }],
    },
    {
      id: 'shushed',
      title: 'Noisy neighbour',
      teaser: 'Get shushed.',
      timed: false,
      objectives: [{ id: 'hushed', text: 'Get shushed by the librarian (fly near the library)', kind: 'event', event: 'hushed', hint: 'Flap near the library.' }],
    },
    {
      id: 'book',
      title: 'Overdue',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat the librarian', kind: 'event', event: 'poopNpc:librarian', hint: 'Make her drop her book loudly.' }],
    },
  ],
  secret: ['book'],
  coopQuests: [{ id: 'duoShh', title: 'Silent partners', timed: false, objectives: [{ id: 'duoShh', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: LIBRARY.x - 9, z: LIBRARY.z - 4, heading: 1.57, holds: 'bun', role: 'student', stationary: true, color: 0xf7a1c4 },
    { x: LIBRARY.x - 9, z: LIBRARY.z, heading: 1.57, holds: 'candy', role: 'student', stationary: true, color: 0x9ec9f0 },
    { x: LIBRARY.x - 9, z: LIBRARY.z + 4, heading: 1.57, holds: 'icecream', role: 'student', stationary: true, color: 0xc7b5e0 },
    { x: LIBRARY.x - 11, z: LIBRARY.z + 8, heading: 3.0, role: 'librarian', stationary: true, color: 0x6a5a8a },
  ],
  extraProps: [],
  defense: false,
  parTime: 300,
};

/**
 * Senate Square, level 10: the finale, The Key to the City. Headline puzzle ("Ceremony Crashers"): everything is in play at
 * once. Win the pigeons, ring the bell, ride the tram, photobomb the front page, and take the golden key.
 */
export const KEY_TO_THE_CITY: LevelDef = {
  id: 'key-to-the-city',
  sky: 'golden',
  name: 'S10. The Key to the City',
  blurb: 'Ceremony crashers: bells, trams, pigeons and cameras.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'library-rule',
  tram: TRAM,
  pigeons: { x: EMPEROR.x, z: EMPEROR.z },
  bells: { x: -138.95, z: -370.49, first: 15, every: 30, duration: 6 },
  quests: [],
  extraQuests: [
    {
      id: 'ceremony',
      title: 'Ceremony Crashers',
      teaser: 'Win the pigeons over and crash the photo.',
      timed: false,
      objectives: [
        { id: 'pigeons', text: 'Win the Pigeon Gang over with a bun', kind: 'event', event: 'pigeonsFriends', hint: 'Put a bun down by the statue.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 8, label: 'Pigeon Gang' }] },
        { id: 'photo', text: 'Photobomb the front-page photographer', kind: 'event', event: 'photobomb', hint: 'He counts 3, 2, 1 in front of the stage.', markers: [{ x: -156.5, z: -312, r: 3, label: 'Photographer' }] },
      ],
    },
    {
      id: 'key',
      title: 'The golden key',
      teaser: 'Take the key from the mayor and bring it to the pigeons.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Grab the golden key from the podium', kind: 'event', event: 'grab:key', hint: 'The mayor guards it. The bell makes everyone look up.', markers: [{ x: -156.5, z: -322, r: 3, label: 'Key' }] },
        { id: 'nest', text: 'Drop it at the foot of the emperor\'s statue', kind: 'event', event: 'keyNest', after: 'take', hint: 'The pigeons will guard it.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 4, label: 'Nest' }] },
      ],
    },
    {
      id: 'mayor',
      title: 'Your Honour',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat the mayor', kind: 'event', event: 'poopNpc:mayor', hint: 'Mid-speech.' }],
    },
  ],
  secret: ['mayor'],
  coopQuests: [{ id: 'duoKey', title: 'Smash and grab', timed: false, objectives: [{ id: 'duoKey', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [
    { id: 'keyNest', kind: 'propInZone', event: 'keyNest', propType: 'ring', tag: 'key', zone: zone(EMPEROR.x, EMPEROR.z, 4.2, 4) },
  ],
  tourists: [],
  extraTourists: [
    { x: -156.5, z: -312, heading: 0, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -156.5, z: -321, heading: 0, role: 'mayor', stationary: true, color: 0x2f3a55 },
    { x: -164, z: -318, heading: 0.4, color: 0xffc971, ice: true },
    { x: -149, z: -318, heading: -0.4, color: 0x9ec9f0 },
    { x: -140, z: -296, heading: 0.8, holds: 'bun', role: 'picnic', color: 0xf7a1c4 },
  ],
  extraProps: [{ type: 'ring', x: -156.5, y: restY('ring', 0.9), z: -322, tag: 'key' }],
  defense: false,
  parTime: 420,
};
