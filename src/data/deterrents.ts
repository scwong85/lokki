import type { Seg, Zone } from '../gameplay/deterrents';

/** Where the market's deterrents go (local metres, north = -Z). The tents span x -32..32, z -58..-30. */
export const STALL_ZONE = { minX: -37, maxX: 37, minZ: -62, maxZ: -26 };

/** Vendors stand behind the south row of stalls, facing the square (+Z). */
export const VENDOR_SPAWNS: { x: number; z: number; heading: number; color: number }[] = [
  { x: -16, z: -31.2, heading: Math.PI, color: 0xff9a4d },
  { x: 0, z: -31.2, heading: Math.PI, color: 0xff9a4d },
  { x: 16, z: -31.2, heading: Math.PI, color: 0xff9a4d },
];

const LINE_Y = 3.6;
/** Scare lines strung over the stalls: one along each row, three across. */
export const LINES: Seg[] = [
  ...[-58, -44, -30].map((z): Seg => ({ a: [STALL_ZONE.minX, LINE_Y, z], b: [STALL_ZONE.maxX, LINE_Y, z] })),
  ...[-36, 0, 36].map((x): Seg => ({ a: [x, LINE_Y, STALL_ZONE.minZ], b: [x, LINE_Y, STALL_ZONE.maxZ] })),
];
/** Poles the lines hang from. */
export const LINE_POSTS: [number, number][] = [
  [-37, -62], [37, -62], [-37, -26], [37, -26], [0, -62], [0, -26],
];

/** A net over the stalls: catches gulls coming down from above, but gulls learn to fly in under it. */
export const NET_Y = 3.1;
export const NET_ZONE: Zone = { ...STALL_ZONE, maxY: NET_Y - 0.5 }; // "under the net"
export const LINE_ZONE: Zone = { ...STALL_ZONE, maxY: 6 };

export const WARDEN_SPAWN = { x: -38, z: -10 };
export const WARDEN_PATROL: [number, number][] = [[-34, -10], [34, -10], [34, -22], [-34, -22]];
