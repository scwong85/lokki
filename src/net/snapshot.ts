/**
 * Network-ready game state (M12 groundwork for online co-op, M14). A snapshot is plain, JSON-safe data with stable ids:
 * what the host would send to a guest about 20 times a second. Numbers are rounded to keep it small. Pure.
 */

export interface GullSnap {
  id: number;
  p: [number, number, number];
  v: [number, number, number];
  h: number;
  mode: string;
  /** Prop id in the beak. */
  carry: number | null;
  /** Wing animation clock, height above the surface and turn rate (what the other screen needs to draw the pose). */
  fa?: number;
  ha?: number;
  tr?: number;
  /** Pigeon disguise on. */
  dg?: number;
}

export interface PropSnap {
  id: number;
  p: [number, number, number];
  q: [number, number, number, number];
  /** Gull id carrying it, or null. */
  by: number | null;
  /** Person id holding it, or null. */
  held: number | null;
  broken?: true;
}

export interface NpcSnap {
  id: number;
  p: [number, number];
  h: number;
  mode: string;
  holding: number | null;
  /** Where the hand is, the selfie routine, the polishing timer, the way the shield faces (for the pose and the ring). */
  ha?: number;
  sf?: string;
  sc?: number;
  ct?: number;
  sh?: number;
}

export interface QuestSnap {
  id: string;
  status: string;
  t?: number;
  /** Per objective: [done, count]. */
  o: [0 | 1, number][];
}

/** The city's response (vendors, Warden, lines, nets) as a guest needs it to draw it. */
export interface DefenseSnap {
  /** Deployed deterrents. */
  dep: string[];
  /** Install progress of the lines and nets (0..1). */
  inst: [number, number];
  /** Vendors: [x, z, heading, mode, aimX, aimZ]. */
  v: [number, number, number, string, number, number][];
  /** The Warden, if out: [x, z, heading, mode, moving, walkPhase, distracted, exposed, aimX, aimZ]. */
  w: [number, number, number, string, number, number, number, number, number, number] | null;
  hawk: number;
}

export interface Snapshot {
  /** Simulation time (s). */
  t: number;
  gulls: GullSnap[];
  props: PropSnap[];
  npcs: NpcSnap[];
  heat: number;
  quests: QuestSnap[];
  /** Present when the level has a city defence. */
  d?: DefenseSnap;
}

/** Live game objects, described just enough for a snapshot (the game passes adapters). */
export interface SnapshotSource {
  time: number;
  gulls: { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; heading: number; mode: string; carry: number | null; flapAnim?: number; heightAbove?: number; turnRate?: number; disguised?: boolean }[];
  props: { id: number; x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number; by: number | null; held: number | null; broken: boolean }[];
  npcs: { id: number; x: number; z: number; heading: number; mode: string; holding: number | null; handAngle?: number; selfie?: string; selfieCount?: number; cleanT?: number; shieldFrom?: number }[];
  heat: number;
  d?: DefenseSnap;
  quests: { id: string; status: string; timeLeft: number; timed: boolean; objectives: { done: boolean; count: number }[] }[];
}

const r = (v: number, k = 100) => Math.round(v * k) / k || 0; // `|| 0` turns -0 into 0 (JSON cannot tell them apart)

export function makeSnapshot(s: SnapshotSource): Snapshot {
  return {
    ...(s.d ? { d: s.d } : {}),
    t: r(s.time, 1000),
    gulls: s.gulls.map((g) => ({ id: g.id, p: [r(g.x), r(g.y), r(g.z)], v: [r(g.vx), r(g.vy), r(g.vz)], h: r(g.heading, 1000), mode: g.mode, carry: g.carry, fa: r(g.flapAnim ?? 0, 100), ha: r(g.heightAbove ?? 0, 10), tr: r(g.turnRate ?? 0, 100), dg: g.disguised ? 1 : 0 })),
    props: s.props.map((p) => {
      const o: PropSnap = { id: p.id, p: [r(p.x), r(p.y), r(p.z)], q: [r(p.qx, 1000), r(p.qy, 1000), r(p.qz, 1000), r(p.qw, 1000)], by: p.by, held: p.held };
      if (p.broken) o.broken = true;
      return o;
    }),
    npcs: s.npcs.map((n) => ({ id: n.id, p: [r(n.x), r(n.z)], h: r(n.heading, 1000), mode: n.mode, holding: n.holding, ha: r(n.handAngle ?? 0, 100), sf: n.selfie, sc: n.selfieCount, ct: r(n.cleanT ?? 0, 10), sh: r(n.shieldFrom ?? 0, 100) })),
    heat: r(s.heat, 10),
    quests: s.quests.map((q) => {
      const o: QuestSnap = { id: q.id, status: q.status, o: q.objectives.map((x) => [x.done ? 1 : 0, x.count]) };
      if (q.timed) o.t = r(q.timeLeft, 10);
      return o;
    }),
  };
}

/** Wire form (JSON for now; a binary format can replace it later without touching the game). */
export const encodeSnapshot = (s: Snapshot): string => JSON.stringify(s);
export const decodeSnapshot = (text: string): Snapshot => JSON.parse(text) as Snapshot;
