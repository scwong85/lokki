import { tuning } from '../core/tuning';
import type { FlightState } from '../gull/flight';

/** Arms race, in the order the city introduces them. */
export type DeterrentId = 'vendors' | 'lines' | 'nets' | 'warden';
export const ORDER: readonly DeterrentId[] = ['vendors', 'lines', 'nets', 'warden'];

export const DETERRENT_NAMES: Record<DeterrentId, string> = {
  vendors: 'spray bottles',
  lines: 'scare lines',
  nets: 'nets',
  warden: 'the Gull Warden',
};

function learnAfter(id: DeterrentId): number {
  const d = tuning.deter;
  return id === 'vendors' ? d.learnVendors.value : id === 'lines' ? d.learnLines.value : id === 'nets' ? d.learnNets.value : d.learnWarden.value;
}

/** How well a deterrent still works: 1 when new, falling to `learnedFactor` once the gulls have learned it. */
export function effectiveness(learned: number, after: number): number {
  const f = tuning.deter.learnedFactor.value;
  if (learned >= after) return f;
  return 1 - (1 - f) * (learned / after) * 0.6; // gets weaker as the gulls learn, then drops once fully learned
}

export interface BypassResult {
  /** This bypass made the deterrent "learned". */
  learnedNow: boolean;
  /** The counter-measure the city brings in because of it. */
  deployed: DeterrentId | null;
}

/** Which deterrents are up, and how much the gulls have learned about each. */
export class CityResponse {
  deployed = new Set<DeterrentId>();
  learned: Record<DeterrentId, number> = { vendors: 0, lines: 0, nets: 0, warden: 0 };

  /** Heat reached `tier` (1..4): deploy everything up to it. Returns what is newly deployed. */
  onTier(tier: number): DeterrentId[] {
    const out: DeterrentId[] = [];
    for (let i = 0; i < Math.min(tier, ORDER.length); i++) if (this.deploy(ORDER[i])) out.push(ORDER[i]);
    return out;
  }

  deploy(id: DeterrentId): boolean {
    if (this.deployed.has(id)) return false;
    this.deployed.add(id);
    return true;
  }

  isLearned(id: DeterrentId): boolean {
    return this.learned[id] >= learnAfter(id);
  }

  strength(id: DeterrentId): number {
    return effectiveness(this.learned[id], learnAfter(id));
  }

  /** The gull got past a deterrent without being stopped. */
  onBypass(id: DeterrentId): BypassResult {
    if (!this.deployed.has(id) || this.isLearned(id)) return { learnedNow: false, deployed: null };
    this.learned[id]++;
    if (!this.isLearned(id)) return { learnedNow: false, deployed: null };
    const next = ORDER[ORDER.indexOf(id) + 1];
    return { learnedNow: true, deployed: next && this.deploy(next) ? next : null };
  }

  reset(): void {
    this.deployed.clear();
    this.learned = { vendors: 0, lines: 0, nets: 0, warden: 0 };
  }
}

export interface Zone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

/** A "visit" of a zone: entering and leaving without being stopped counts as a successful bypass. */
export class ZoneTracker {
  private inside = false;
  private hit = false;

  constructor(readonly zone: Zone) {}

  contains(x: number, y: number, z: number): boolean {
    const z0 = this.zone;
    return x >= z0.minX && x <= z0.maxX && z >= z0.minZ && z <= z0.maxZ && y <= z0.maxY;
  }

  markHit(): void {
    this.hit = true;
  }

  /** Returns 'bypass' when a clean visit just ended. */
  update(x: number, y: number, z: number): 'bypass' | null {
    const now = this.contains(x, y, z);
    let result: 'bypass' | null = null;
    if (now && !this.inside) this.hit = false;
    if (!now && this.inside && !this.hit) result = 'bypass';
    this.inside = now;
    return result;
  }

  reset(): void {
    this.inside = false;
    this.hit = false;
  }
}

export interface Seg {
  a: [number, number, number];
  b: [number, number, number];
}

/** Does a sphere (centre p, radius r) touch the segment? Returns the horizontal push direction away from it. */
export function segmentHit(p: { x: number; y: number; z: number }, r: number, s: Seg): { dx: number; dz: number } | null {
  const [ax, ay, az] = s.a, [bx, by, bz] = s.b;
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  const l2 = ex * ex + ey * ey + ez * ez;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey + (p.z - az) * ez) / l2)) : 0;
  const cx = ax + ex * t, cy = ay + ey * t, cz = az + ez * t;
  const d = Math.hypot(p.x - cx, p.y - cy, p.z - cz);
  if (d > r) return null;
  const hx = p.x - cx, hz = p.z - cz;
  const hl = Math.hypot(hx, hz);
  return hl > 1e-4 ? { dx: hx / hl, dz: hz / hl } : { dx: 0, dz: 1 };
}

export type HitKind = 'spray' | 'swat' | 'line' | 'net';

export interface GullHit {
  kind: HitKind;
  /** Horizontal push direction (unit). */
  dx: number;
  dz: number;
  /** 0..1, from effectiveness. */
  strength: number;
}

/** Apply a deterrent hit to the gull: stun, push, stamina loss. Returns true if the beak should drop what it carries. */
export function applyHit(s: FlightState, h: GullHit): boolean {
  const d = tuning.deter;
  if (h.strength < 0.15) return false; // the gull has learned this one: slips through
  const base =
    h.kind === 'spray' ? { stun: d.sprayStun.value, knock: d.sprayKnock.value, stam: d.sprayStamina.value }
    : h.kind === 'swat' ? { stun: d.swatStun.value, knock: d.swatKnock.value, stam: d.swatStamina.value }
    : h.kind === 'line' ? { stun: d.lineStun.value, knock: d.lineKnock.value, stam: d.lineStamina.value }
    : { stun: d.netStun.value, knock: 0, stam: d.netStamina.value };
  s.stunT = Math.max(s.stunT, base.stun * h.strength);
  s.stamina = Math.max(0, s.stamina - base.stam * h.strength);
  s.vx = h.dx * base.knock * h.strength;
  s.vz = h.dz * base.knock * h.strength;
  if (h.kind === 'line' || h.kind === 'net') s.vy = Math.min(s.vy, -1);
  if (s.mode === 'dive') {
    s.mode = 'air';
    s.diveCd = tuning.dive.cooldown.value;
  }
  return true;
}
