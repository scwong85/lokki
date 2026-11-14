import { describe, expect, it } from 'vitest';
import { bays, pitchedRoof, rectInfo, roofRise, storeys, wantsPitched, FLOOR_H, GROUND_H } from '../../src/world/facade';
import { DRESS_LIMITS, planDressing, type DressCtx } from '../../src/world/dressingPlan';
import { pointInRings } from '../../src/world/collision';
import { snap } from '../../src/render/graphics';

const normal = (t: number[][]) => {
  const [p, q, s] = t;
  const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [s[0] - p[0], s[1] - p[1], s[2] - p[2]];
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
};

describe('facade rules', () => {
  it('bays and storeys', () => {
    expect(bays(1.5)).toBe(0);
    expect(bays(5.2)).toBe(1);
    expect(bays(26)).toBe(5);
    expect(storeys(4)).toEqual({ ground: 4, upperFloors: 0 });
    expect(storeys(GROUND_H + FLOOR_H * 4)).toEqual({ ground: GROUND_H, upperFloors: 4 });
  });

  it('detects rectangles (either winding, closed or not) and rejects other shapes', () => {
    const r = rectInfo([0, 0, 10, 0, 10, 4, 0, 4]);
    expect(r).not.toBeNull();
    expect(r!.long).toBeCloseTo(10);
    expect(r!.short).toBeCloseTo(4);
    expect(rectInfo([0, 0, 0, 4, 10, 4, 10, 0, 0, 0])).not.toBeNull();
    expect(rectInfo([0, 0, 10, 0, 6, 4, 0, 4])).toBeNull(); // trapezoid
    expect(rectInfo([0, 0, 10, 0, 10, 4, 5, 6, 0, 4])).toBeNull(); // 5 corners
  });

  it('pitched roofs point outwards and step their collision up to a perch ridge', () => {
    for (const ring of [[0, 0, 12, 0, 12, 6, 0, 6], [0, 0, 0, 6, 12, 6, 12, 0]]) {
      for (const hip of [false, true]) {
        const r = rectInfo(ring)!;
        const roof = pitchedRoof(r, 10, roofRise(r.short), hip);
        for (const t of [...roof.slopes, ...roof.gables]) {
          const n = normal(t);
          const c = [(t[0][0] + t[1][0] + t[2][0]) / 3 - 6, (t[0][1] + t[1][1] + t[2][1]) / 3 - 9, (t[0][2] + t[1][2] + t[2][2]) / 3 - 3];
          expect(n[0] * c[0] + n[1] * c[1] + n[2] * c[2]).toBeGreaterThan(0);
        }
        expect(roof.slabs).toHaveLength(3);
        expect(roof.slabs[0].y0).toBe(10);
        expect(roof.slabs[2].perch).toBe(true);
        expect(roof.slabs[2].y1).toBeCloseTo(10 + roofRise(6));
        expect(roof.ridge[0][1]).toBeCloseTo(10 + roofRise(6));
      }
    }
  });

  it('pitched roofs only on modest rectangles', () => {
    expect(wantsPitched(null, 1, 10)).toBe(false);
    expect(wantsPitched(rectInfo([0, 0, 60, 0, 60, 40, 0, 40]), 1, 10)).toBe(false);
    const small = rectInfo([0, 0, 12, 0, 12, 8, 0, 8]);
    const ids = Array.from({ length: 100 }, (_, i) => i).filter((i) => wantsPitched(small, i, 10));
    expect(ids.length).toBeGreaterThan(40);
    expect(ids.length).toBeLessThan(95);
  });

  it('shadow box snapping is stable', () => {
    expect(snap(10.04, 0.1)).toBeCloseTo(10);
    expect(snap(-3.26, 0.5)).toBeCloseTo(-3.5);
  });
});

describe('set dressing plan', () => {
  // a 200 x 200 island with a park in the middle and one building; sea all around
  const land = [{ rings: [[-100, -100, 100, -100, 100, 100, -100, 100]] }];
  const park = { rings: [[-40, -40, 40, -40, 40, 40, -40, 40]] };
  const building = [10, 10, 25, 10, 25, 25, 10, 25];
  const ctx: DressCtx = {
    parks: [park],
    land,
    streets: [{ rings: [[50, -20, 70, -20, 70, 20, 50, 20]] }],
    isLand: (x, z) => pointInRings(land[0].rings, x, z),
    solid: (x, z) => pointInRings([building], x, z),
    keepClear: [{ x: -30, z: -30, r: 6 }],
  };
  const plan = planDressing(ctx);

  it('places every kind, within limits, deterministically', () => {
    for (const t of ['tree', 'bench', 'bollard', 'bike', 'umbrella', 'boat'] as const) {
      const n = plan.filter((p) => p.type === t).length;
      expect(n, t).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(DRESS_LIMITS[t]);
    }
    expect(planDressing(ctx)).toEqual(plan);
  });

  it('keeps land things on free land, boats in the water, and the keep-clear spots clear', () => {
    for (const p of plan) {
      if (p.type === 'boat') expect(ctx.isLand(p.x, p.z)).toBe(false);
      else {
        expect(ctx.isLand(p.x, p.z)).toBe(true);
        expect(ctx.solid(p.x, p.z)).toBe(false);
      }
      expect(Math.hypot(p.x + 30, p.z + 30)).toBeGreaterThan(6);
    }
    for (const t of plan.filter((p) => p.type === 'tree')) expect(pointInRings(park.rings, t.x, t.z)).toBe(true);
  });
});

describe('floating', () => {
  it('items in the water settle at the float line instead of sinking', async () => {
    const { floatVy, halfHeight } = await import('../../src/gameplay/buoyancy');
    let y = 0.02, vy = 0;
    const g = 14, dt = 1 / 60;
    for (let i = 0; i < 600; i++) {
      vy = floatVy(y, vy - g * dt, 0.15, g, 18, 2.5, dt);
      y = Math.max(0, y + vy * dt);
    }
    expect(y).toBeGreaterThan(0.1);
    expect(y).toBeLessThan(0.2);
    expect(floatVy(1, -2, 0.15, g, 18, 2.5, dt)).toBe(-2); // above the water: untouched
    expect(halfHeight({ kind: 'box', hy: 0.3 })).toBe(0.3);
    expect(halfHeight({ kind: 'capsule', hh: 0.12, r: 0.14 })).toBeCloseTo(0.26);
  });
});
