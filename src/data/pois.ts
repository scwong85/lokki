import type { Poi } from '../gameplay/routine';
import { CAFE, CLOCK, FERRY, STATUE, counter } from './places';
import { EMPEROR } from './levels/senate2';
import { BELL_TOWER, STEPS_BOTTOM_Z, STEPS_X } from './levels/senate';
import { LIBRARY } from './levels/senate3';
import type { LevelDef } from './levels/types';

/** Places of interest by district (the landmarks people stop at): the strollers' routines are made of these. */
const KAUPPATORI: Poi[] = [
  { ...STATUE, kind: 'photo', stand: 5 },
  { ...FERRY, kind: 'watch', stand: 12 },
  { ...CAFE, kind: 'rest', stand: 4 },
  { ...CLOCK, kind: 'watch', stand: 5 },
  { ...counter(1, 1), kind: 'watch', stand: 5 },
  { ...counter(5, 1), kind: 'photo', stand: 6 },
];

const SENAATINTORI: Poi[] = [
  { ...EMPEROR, kind: 'photo', stand: 6 },
  { x: STEPS_X, z: STEPS_BOTTOM_Z, kind: 'watch', stand: 8 },
  { ...BELL_TOWER, kind: 'photo', stand: 20 },
  { ...LIBRARY, kind: 'watch', stand: 9 },
  { x: EMPEROR.x + 12, z: EMPEROR.z + 8, kind: 'rest', stand: 3 },
];

export const poisFor = (district: LevelDef['district']): readonly Poi[] => (district === 'kauppatori' ? KAUPPATORI : district === 'senaatintori' ? SENAATINTORI : []);
