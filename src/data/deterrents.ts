import type { Seg, Zone } from '../gameplay/deterrents';

/**
 * The area the city defends: the market stalls (z -62..-26) AND the square in front of them where the tourists
 * are (z -26..-6). Local metres, north = -Z.
 */
export const DEFENSE_ZONE = { minX: -37, maxX: 37, minZ: -62, maxZ: -6 };

/** Vendors: three behind the south row of stalls, two at the sides of the square (facing in). */
export const VENDOR_SPAWNS: { x: number; z: number; heading: number; color: number }[] = [
  { x: -16, z: -31.2, heading: Math.PI, color: 0xff9a4d },
  { x: 0, z: -31.2, heading: Math.PI, color: 0xff9a4d },
  { x: 16, z: -31.2, heading: Math.PI, color: 0xff9a4d },
  { x: -35, z: -17, heading: -Math.PI / 2, color: 0xffb36b },
  { x: 35, z: -17, heading: Math.PI / 2, color: 0xffb36b },
];

const LINE_Y = 3.6;
const ROWS = [-58, -44, -30, -16]; // the last row hangs over the tourists' square
const COLS = [-36, 0, 36];

/** Scare lines strung over stalls and square: one along each row, three across. */
export const LINES: Seg[] = [
  ...ROWS.map((z): Seg => ({ a: [DEFENSE_ZONE.minX, LINE_Y, z], b: [DEFENSE_ZONE.maxX, LINE_Y, z] })),
  ...COLS.map((x): Seg => ({ a: [x, LINE_Y, DEFENSE_ZONE.minZ], b: [x, LINE_Y, DEFENSE_ZONE.maxZ] })),
];

/** Poles the lines hang from. */
export const LINE_POSTS: [number, number][] = [
  ...ROWS.flatMap((z): [number, number][] => [[DEFENSE_ZONE.minX, z], [DEFENSE_ZONE.maxX, z]]),
  [0, DEFENSE_ZONE.minZ],
  [0, DEFENSE_ZONE.maxZ],
];

/** A net over the whole area: catches gulls coming down from above, but gulls learn to fly in under it. */
export const NET_Y = 3.1;
export const NET_ZONE: Zone = { ...DEFENSE_ZONE, maxY: NET_Y - 0.5 }; // "under the net"
export const LINE_ZONE: Zone = { ...DEFENSE_ZONE, maxY: 6 };

export const WARDEN_SPAWN = { x: -38, z: -10 };
export const WARDEN_PATROL: [number, number][] = [[-34, -10], [34, -10], [34, -22], [-34, -22]];
