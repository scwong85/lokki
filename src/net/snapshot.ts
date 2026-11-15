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
}

export interface QuestSnap {
  id: string;
  status: string;
  t?: number;
  /** Per objective: [done, count]. */
  o: [0 | 1, number][];
}

export interface Snapshot {
  /** Simulation time (s). */
  t: number;
  gulls: GullSnap[];
  props: PropSnap[];
  npcs: NpcSnap[];
  heat: number;
  quests: QuestSnap[];
}

/** Live game objects, described just enough for a snapshot (the game passes adapters). */
export interface SnapshotSource {
  time: number;
  gulls: { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; heading: number; mode: string; carry: number | null }[];
  props: { id: number; x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number; by: number | null; held: number | null; broken: boolean }[];
  npcs: { id: number; x: number; z: number; heading: number; mode: string; holding: number | null }[];
  heat: number;
  quests: { id: string; status: string; timeLeft: number; timed: boolean; objectives: { done: boolean; count: number }[] }[];
}

const r = (v: number, k = 100) => Math.round(v * k) / k || 0; // `|| 0` turns -0 into 0 (JSON cannot tell them apart)

export function makeSnapshot(s: SnapshotSource): Snapshot {
  return {
    t: r(s.time, 1000),
    gulls: s.gulls.map((g) => ({ id: g.id, p: [r(g.x), r(g.y), r(g.z)], v: [r(g.vx), r(g.vy), r(g.vz)], h: r(g.heading, 1000), mode: g.mode, carry: g.carry })),
    props: s.props.map((p) => {
      const o: PropSnap = { id: p.id, p: [r(p.x), r(p.y), r(p.z)], q: [r(p.qx, 1000), r(p.qy, 1000), r(p.qz, 1000), r(p.qw, 1000)], by: p.by, held: p.held };
      if (p.broken) o.broken = true;
      return o;
    }),
    npcs: s.npcs.map((n) => ({ id: n.id, p: [r(n.x), r(n.z)], h: r(n.heading, 1000), mode: n.mode, holding: n.holding })),
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
