import { tuning } from './tuning';

/**
 * Relaxed play (M120, an Options switch): people see less far, a snatch reaches further and the city heats up more slowly, for a calm game
 * or a younger player. The factors live in `tuning.assist`; this flag says whether they apply.
 */
export const assist = { easy: false };

export const reachScale = (): number => (assist.easy ? tuning.assist.reach.value : 1);
export const sightScale = (): number => (assist.easy ? tuning.assist.sight.value : 1);
export const heatScale = (): number => (assist.easy ? tuning.assist.heat.value : 1);
