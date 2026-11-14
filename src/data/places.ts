import cityJson from '../../data/generated/kauppatori.json';
import { VENDOR_SPAWNS } from './deterrents';

/** Named places on the map, read from the generated landmark list so quests and landmarks never drift apart. */
type Landmark = { id: string; x: number; z: number; cols?: number; rows?: number; dx?: number; dz?: number };
const landmarks = (cityJson as unknown as { landmarks: Landmark[] }).landmarks;
const lm = (id: string) => {
  const l = landmarks.find((x) => x.id === id);
  if (!l) throw new Error(`landmark ${id} missing from data/generated/kauppatori.json (run npm run data:build)`);
  return { x: l.x, z: l.z };
};

export const STATUE = lm('havis-amanda');
export const FERRY = lm('ferry');
export const CAFE = lm('cafe');
export const CLOCK = lm('clock');

/** A stall counter of the market (column c 0..8 west to east, row r 0..2 north to south), read from the landmark so quests never drift. */
const tents = landmarks.find((l) => l.id === 'market-tents')!;
export const counter = (c: number, r: number): { x: number; z: number } => {
  const cols = tents.cols ?? 9, rows = tents.rows ?? 3, dx = tents.dx ?? 8, dz = tents.dz ?? 14;
  return { x: tents.x + (c - (cols - 1) / 2) * dx, z: tents.z + (r - (rows - 1) / 2) * dz };
};
export const TOY_SPOT = lm('lost-toy');
/** The child who lost the teddy waits on the quay. */
export const CHILD_SPOT = { x: 22, z: -9 };

/** Roof of the ferry's upper cabin (9 m up): where the stolen cap goes. Geometry mirrors world/landmarks.ts (ferry). */
export const FERRY_ROOF = { minX: FERRY.x - 12, maxX: FERRY.x + 2, minZ: FERRY.z - 2.6, maxZ: FERRY.z + 2.6, minY: 8.6 };
/** Anywhere on the ferry (deck or roofs): a prop dropped here counts as delivered. */
export const FERRY_DECK = { minX: FERRY.x - 19, maxX: FERRY.x + 19, minZ: FERRY.z - 4.5, maxZ: FERRY.z + 4.5, minY: 3.0 };
/** The cabin roofs (6.6 m and 9 m up): land anywhere here to ring the ferry horn. */
export const FERRY_CABIN_ROOFS = { minX: FERRY.x - 14, maxX: FERRY.x + 4, minZ: FERRY.z - 3.5, maxZ: FERRY.z + 3.5, minY: 6.4 };
/** Top of the ferry funnel (12.5 m): land here to ring the ferry horn and start the finale. */
export const FERRY_FUNNEL = { x: FERRY.x - 8, z: FERRY.z };
export const FUNNEL_ZONE = { minX: FERRY_FUNNEL.x - 2, maxX: FERRY_FUNNEL.x + 2, minZ: FERRY_FUNNEL.z - 2, maxZ: FERRY_FUNNEL.z + 2, minY: 12 };
/** Where the tourist whose map ended up in the sea walks to: the quay in front of the wrong ferry. */
export const WRONG_FERRY = { x: FERRY.x, z: -6 };
/** The three vendors a bun must get past (south row, in front of their counters). */
/** Wide, so you can fly past (above the spray's 4.5 m reach) as well as walk. */
export const BUN_CHECKPOINTS = VENDOR_SPAWNS.slice(0, 3).map((v) => ({ x: v.x, z: v.z + 4.2, r: 5 }));
