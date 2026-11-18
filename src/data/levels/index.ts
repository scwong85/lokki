import type { LevelDef } from './types';
import { SNACK_ATTACK } from './snackAttack';
import { MAP_AND_CONE } from './mapAndCone';
import { FIRST_LIGHT, FISH_MARKET, STRINGS_ATTACHED, MOOD_SWINGS, THE_WARDEN_STAGE } from './arc1';
import { STEPS_STAGE, SAY_PIGEON_STAGE, DING_DONG_STAGE, TURF_WAR_STAGE, KEY_STAGE } from './arc2';
import { LEAF_BLOWER, DOMINO_RALLY, CAPTAIN_GULL, HUSH_PUPPY } from './mischief2';
import { WET_FLOOR, PIED_PIPER, HONK, SPLASH_LANDING, TUG_OF_WAR, RUSH_HOUR, STRIKE, JUKEBOX_HERO, RED_BUTTON, PEEKABOO, TABLECLOTH, SERVICE_BELL } from './mischief';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { BUTTERFINGERS } from './butterfingers';
import { CITY_STRIKES } from './cityStrikes';
import { OWL_BE_BACK } from './owlBeBack';
import { THE_WARDEN } from './theWarden';
import { HARBOUR_DAY } from './harbourDay';
import { CHEESE_RUN, SAY_PIGEON, DING_DONG } from './senate';
import { TRAM_SURFING, TURF_WAR, NEW_LOOK } from './senate2';
import { DONT_BLOCK_MY_SUN, GOOD_BOY, SPLASH_ZONE } from './espa1';
import { CONCERT_NIGHT, CHRISTMAS_MARKET, LIBRARY_RULE, KEY_TO_THE_CITY } from './senate3';
import { THE_RIVAL, NIGHT_MARKET, THE_DRONE, GRAND_FINALE } from './act3b';
import { VAPPU_EVE, HERRING_MARKET, WEDDING_BELLS, FROZEN_HARBOUR } from './act3a';
import { CAW_OF_THE_WILD, INVISIBLE_MAZE, HEAVY_LIFTING, GULLS_ELEVEN, COO_COO, THERMAL_EXPRESS } from './act2';

/** Free play: today's full Market Square (the eight-quest pack, the extras, the finale). */
export const SANDBOX: LevelDef = {
  id: 'sandbox',
  name: 'Free play',
  blurb: 'The whole Market Square: every quest, the finale and the city at full alert.',
  district: 'kauppatori',
  sandbox: true,
  quests: ['icecream', 'swap', 'cap', 'bun', 'map', 'date', 'toy', 'finale', 'extras', 'bonus'],
  triggers: ['capDelivered', 'mapInSea', 'finaleStart', 'bunRing'],
  tourists: 'all',
  defense: true,
};

/** Havoc Hour (prototype): three minutes in the Market Square, everything scores, chains multiply. */
export const HAVOC_HOUR: LevelDef = {
  id: 'havoc-hour',
  name: 'Havoc Hour',
  blurb: 'Three minutes of chaos. Chain different mischief for big multipliers.',
  district: 'kauppatori',
  sandbox: true,
  havoc: { seconds: 180 },
  skills: ['flight', 'mimic', 'hawkeye', 'fatbird', 'flock', 'disguise', 'quickpoop'],
  quests: [],
  triggers: [],
  tourists: 'all',
  defense: true,
  startHeat: 15,
};

export { CHEESE_RUN, SAY_PIGEON, DING_DONG };
export { TRAM_SURFING, TURF_WAR, NEW_LOOK };
export { DONT_BLOCK_MY_SUN, GOOD_BOY, SPLASH_ZONE };
export { CONCERT_NIGHT, CHRISTMAS_MARKET, LIBRARY_RULE, KEY_TO_THE_CITY };
export { THE_RIVAL, NIGHT_MARKET, THE_DRONE, GRAND_FINALE };
export { VAPPU_EVE, HERRING_MARKET, WEDDING_BELLS, FROZEN_HARBOUR };
export { CAW_OF_THE_WILD, INVISIBLE_MAZE, HEAVY_LIFTING, GULLS_ELEVEN, COO_COO, THERMAL_EXPRESS };
export { SNACK_ATTACK, BOMBS_AWAY, NOSY_PARKERS, BUTTERFINGERS, CITY_STRIKES, OWL_BE_BACK, THE_WARDEN, HARBOUR_DAY };

export const LEVELS: LevelDef[] = [FIRST_LIGHT, FISH_MARKET, STRINGS_ATTACHED, MOOD_SWINGS, THE_WARDEN_STAGE, STEPS_STAGE, SAY_PIGEON_STAGE, DING_DONG_STAGE, TURF_WAR_STAGE, KEY_STAGE, SNACK_ATTACK, BOMBS_AWAY, NOSY_PARKERS, BUTTERFINGERS, CITY_STRIKES, OWL_BE_BACK, THE_WARDEN, HARBOUR_DAY, CAW_OF_THE_WILD, INVISIBLE_MAZE, HEAVY_LIFTING, GULLS_ELEVEN, COO_COO, THERMAL_EXPRESS, VAPPU_EVE, HERRING_MARKET, WEDDING_BELLS, FROZEN_HARBOUR, THE_RIVAL, NIGHT_MARKET, THE_DRONE, GRAND_FINALE, CHEESE_RUN, SAY_PIGEON, DING_DONG, TRAM_SURFING, TURF_WAR, NEW_LOOK, CONCERT_NIGHT, CHRISTMAS_MARKET, LIBRARY_RULE, KEY_TO_THE_CITY, DONT_BLOCK_MY_SUN, GOOD_BOY, SPLASH_ZONE, MAP_AND_CONE, WET_FLOOR, PIED_PIPER, HONK, SPLASH_LANDING, TUG_OF_WAR, RUSH_HOUR, STRIKE, JUKEBOX_HERO, RED_BUTTON, PEEKABOO, TABLECLOTH, SERVICE_BELL, LEAF_BLOWER, DOMINO_RALLY, CAPTAIN_GULL, HUSH_PUPPY, SANDBOX, HAVOC_HOUR];

export const levelById = (id: string | null | undefined): LevelDef => LEVELS.find((l) => l.id === id) ?? SANDBOX;
