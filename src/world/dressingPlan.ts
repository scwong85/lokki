import { createRng } from '../core/rng';
import { pointInRings } from './collision';

export type DressType = 'tree' | 'bench' | 'bollard' | 'bike' | 'umbrella' | 'boat' | 'lamp' | 'planter' | 'cafetable' | 'sign' | 'van';

export interface Placement {
  type: DressType;
  x: number;
  z: number;
  rot: number;
  s: number;
}

export interface DressCtx {
  parks: { rings: number[][] }[];
  land: { rings: number[][] }[];
  streets: { rings: number[][] }[];
  isLand: (x: number, z: number) => boolean;
  /** Something solid (building, landmark) at ground level here. */
  solid: (x: number, z: number) => boolean;
  /** Keep-clear spots (ferry, market, quest props) with a radius. */
  keepClear: { x: number; z: number; r: number }[];
}

export const DRESS_LIMITS: Record<DressType, number> = { tree: 260, bench: 40, bollard: 120, bike: 70, umbrella: 24, boat: 14, lamp: 110, planter: 46, cafetable: 40, sign: 24, van: 9 };

const bbox = (r: number[]) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) {
    x0 = Math.min(x0, r[i]);
    x1 = Math.max(x1, r[i]);
    z0 = Math.min(z0, r[i + 1]);
    z1 = Math.max(z1, r[i + 1]);
  }
  return { x0, x1, z0, z1 };
};

const centroid = (r: number[]) => {
  let x = 0, z = 0;
  for (let i = 0; i < r.length; i += 2) {
    x += r[i];
    z += r[i + 1];
  }
  return { x: x / (r.length / 2), z: z / (r.length / 2) };
};

const area = (r: number[]) => {
  let a = 0;
  const n = r.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1];
  }
  return Math.abs(a / 2);
};

/** Where the set dressing goes: trees, benches and café umbrellas in parks, bollards and boats along the quays, bikes in streets. Pure and seeded. */
export function planDressing(ctx: DressCtx, seed = 1234): Placement[] {
  const rng = createRng(seed);
  const out: Placement[] = [];
  const clear = (x: number, z: number, pad = 0) => ctx.keepClear.every((k) => Math.hypot(x - k.x, z - k.z) > k.r + pad);
  // collect every candidate; the ones nearest the market (where the game happens) win when a type hits its limit
  const add = (type: DressType, x: number, z: number, rot: number, s = 1) => {
    out.push({ type, x, z, rot, s });
    return true;
  };
  const freeLand = (x: number, z: number, pad = 0.8) =>
    ctx.isLand(x, z) && clear(x, z) && [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]].every(([dx, dz]) => !ctx.solid(x + dx, z + dz));

  // parks: trees on a jittered grid, a couple of benches, a café cluster in the bigger ones
  for (const park of ctx.parks) {
    const ring = park.rings[0];
    const b = bbox(ring);
    for (let x = b.x0 + 4; x < b.x1; x += 8) {
      for (let z = b.z0 + 4; z < b.z1; z += 8) {
        const px = x + rng.range(-2.5, 2.5), pz = z + rng.range(-2.5, 2.5);
        if (pointInRings(park.rings, px, pz) && freeLand(px, pz, 2.5)) add('tree', px, pz, rng.range(0, Math.PI * 2), rng.range(0.8, 1.25));
      }
    }
    const c = centroid(ring);
    for (let i = 0; i < Math.min(2, ring.length / 2); i++) {
      const k = Math.floor(rng.next() * (ring.length / 2));
      const vx = ring[k * 2], vz = ring[k * 2 + 1];
      const d = Math.hypot(c.x - vx, c.z - vz) || 1;
      const px = vx + ((c.x - vx) / d) * 2.5, pz = vz + ((c.z - vz) / d) * 2.5;
      if (pointInRings(park.rings, px, pz) && freeLand(px, pz)) add('bench', px, pz, Math.atan2(c.x - px, c.z - pz));
    }
    if (area(ring) > 1500) {
      for (let i = 0; i < 3; i++) {
        const px = c.x + rng.range(-5, 5), pz = c.z + rng.range(-5, 5);
        if (pointInRings(park.rings, px, pz) && freeLand(px, pz, 1.4)) add('umbrella', px, pz, rng.range(0, Math.PI));
      }
    }
  }

  // quays: bollards just inside the edge near the market, boats a little way out
  let boatGap = 0;
  for (const l of ctx.land) {
    for (const r of l.rings) {
      const n = r.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = r[i * 2], z1 = r[i * 2 + 1], x2 = r[j * 2], z2 = r[j * 2 + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 1) continue;
        const tx = (x2 - x1) / len, tz = (z2 - z1) / len;
        for (let t = 2; t < len; t += 5) {
          const px = x1 + tx * t, pz = z1 + tz * t;
          const dist = Math.hypot(px, pz);
          if (dist > 320) continue;
          // which side is land?
          let nx = -tz, nz = tx;
          if (!ctx.isLand(px + nx * 1.5, pz + nz * 1.5)) {
            nx = -nx;
            nz = -nz;
          }
          if (!ctx.isLand(px + nx * 1.5, pz + nz * 1.5) || ctx.isLand(px - nx * 1.5, pz - nz * 1.5)) continue; // not a quay edge
          if (dist < 160 && freeLand(px + nx * 0.7, pz + nz * 0.7, 0.3)) add('bollard', px + nx * 0.7, pz + nz * 0.7, 0);
          boatGap -= 5;
          if (boatGap <= 0) {
            const bx = px - nx * 8, bz = pz - nz * 8;
            const wet = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].every(([dx, dz]) => !ctx.isLand(bx + dx, bz + dz));
            if (wet && clear(bx, bz, 4) && add('boat', bx, bz, Math.atan2(tx, tz) + (rng.next() < 0.5 ? 0 : Math.PI), rng.range(0.85, 1.2))) boatGap = 40;
          }
        }
      }
    }
  }

  // streets: little groups of parked bikes
  for (const st of ctx.streets) {
    const ring = st.rings[0];
    const c = centroid(ring);
    if (Math.hypot(c.x, c.z) > 240 || rng.next() < 0.4) continue;
    const k = Math.floor(rng.next() * (ring.length / 2));
    const vx = ring[k * 2], vz = ring[k * 2 + 1];
    const d = Math.hypot(c.x - vx, c.z - vz) || 1;
    const ux = (c.x - vx) / d, uz = (c.z - vz) / d;
    const px = vx + ux * 2, pz = vz + uz * 2;
    for (let i = 0; i < 3; i++) {
      const bx = px - uz * i * 0.7, bz = pz + ux * i * 0.7;
      if (freeLand(bx, bz, 0.5)) add('bike', bx, bz, Math.atan2(ux, uz) + Math.PI / 2);
    }
  }
  // street furniture along the edges of the street surfaces (inside them, so it stands on the pavement)
  for (const st of ctx.streets) {
    const ring = st.rings[0];
    const c = centroid(ring);
    if (Math.hypot(c.x, c.z) > 280) continue;
    const n = ring.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = ring[i * 2], z1 = ring[i * 2 + 1], x2 = ring[j * 2], z2 = ring[j * 2 + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 6) continue;
      const tx = (x2 - x1) / len, tz = (z2 - z1) / len;
      let nx = -tz, nz = tx; // pointing into the street surface
      if (!pointInRings(st.rings, x1 + tx * len * 0.5 + nx * 1.2, z1 + tz * len * 0.5 + nz * 1.2)) {
        nx = -nx;
        nz = -nz;
      }
      const along = Math.atan2(tx, tz);
      for (let t = 3; t < len - 2; t += 3) {
        const roll = rng.next();
        const px = x1 + tx * t + nx * 0.9, pz = z1 + tz * t + nz * 0.9;
        if (!pointInRings(st.rings, px, pz) || !freeLand(px, pz, 0.7)) continue;
        if (roll < 0.17) add('lamp', px, pz, along);
        else if (roll < 0.23) add('planter', px, pz, along, rng.range(0.9, 1.15));
        else if (roll < 0.27) add('sign', px, pz, along + Math.PI / 2);
        else if (roll < 0.285 && freeLand(px + nx * 1.4, pz + nz * 1.4, 1)) add('cafetable', px + nx * 1.4, pz + nz * 1.4, rng.range(0, Math.PI));
        else if (roll < 0.292 && len > 12) {
          // a parked delivery van, lengthways along the kerb
          const vx = px + nx * 1.1, vz = pz + nz * 1.1;
          if (freeLand(vx, vz, 2.4)) add('van', vx, vz, along);
        }
      }
    }
  }
  const MIN_GAP: Record<DressType, number> = { tree: 3, bench: 3, bollard: 2, bike: 0.5, umbrella: 2.5, boat: 25, lamp: 9, planter: 7, cafetable: 4, sign: 14, van: 14 };
  const kept: Placement[] = [];
  for (const type of Object.keys(DRESS_LIMITS) as DressType[]) {
    const mine: Placement[] = [];
    for (const p of out.filter((q) => q.type === type).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))) {
      if (mine.length >= DRESS_LIMITS[type]) break;
      if (mine.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < MIN_GAP[type])) continue;
      mine.push(p);
    }
    kept.push(...mine);
  }
  return kept;
}
