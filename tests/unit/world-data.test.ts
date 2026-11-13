import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { World, type Prism } from '../../src/world/collision';
import { buildLandmarks } from '../../src/world/landmarks';
import { newFlightState, stepFlight } from '../../src/gull/flight';

const FILE = 'data/generated/kauppatori.json';
const load = () => JSON.parse(readFileSync(FILE, 'utf8'));

describe('generated Kauppatori data', () => {
  const d = load();
  it('has the expected layers and landmarks', () => {
    expect(d.buildings.length).toBeGreaterThan(200);
    expect(d.land.length).toBeGreaterThan(0);
    expect(d.streets.length).toBeGreaterThan(50);
    expect(d.landmarks.map((l: { type: string }) => l.type).sort()).toEqual(['cathedral', 'clock', 'ferry', 'lamps', 'sandbox', 'statue', 'tents', 'toy']);
  });
  it('buildings are sane: >=3 points per ring, heights 3..60 m, inside the map', () => {
    for (const b of d.buildings) {
      expect(b.rings[0].length).toBeGreaterThanOrEqual(6);
      expect(b.h).toBeGreaterThanOrEqual(3);
      expect(b.h).toBeLessThanOrEqual(60);
      expect(Math.abs(b.rings[0][0])).toBeLessThan(d.half + 200);
    }
  });
  it('the spawn point on the market square is free and standing on the ground', () => {
    const prisms: Prism[] = d.buildings.map((b: { rings: number[][]; h: number }) => ({ rings: b.rings, y0: 0, y1: b.h, kind: 'building' }));
    const w = new World([], prisms, d.half);
    const p = { x: 0, y: 0.5, z: -12 };
    expect(w.collide(p, 0.5)).toHaveLength(0);
    expect(w.surfaceBelow(0, -12, 5).y).toBe(0);
  });
  it('is reproducible: rebuilding from data/raw gives byte-identical output', () => {
    const before = readFileSync(FILE, 'utf8');
    execFileSync(process.execPath, ['scripts/build-world.ts'], { stdio: 'pipe' });
    expect(readFileSync(FILE, 'utf8')).toBe(before);
  });

  it('fuzz: random flying/diving never puts the gull inside a building or produces NaN', () => {
    const lm = buildLandmarks(d.landmarks);
    const prisms: Prism[] = [
      ...d.buildings.map((b: { rings: number[][]; h: number }) => ({ rings: b.rings, y0: 0, y1: b.h, kind: 'building' as const })),
      ...lm.prisms,
    ];
    const w = new World([], prisms, d.half);
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let run = 0; run < 6; run++) {
      const s = newFlightState(0, -12);
      let ax = 0, ay = 0, flap = false, dive = false, yaw = 0, pitch = 0.3;
      for (let i = 0; i < 60 * 90; i++) {
        if (i % 40 === 0) {
          ax = Math.round(rnd() * 2 - 1);
          ay = Math.round(rnd() * 2 - 1);
          flap = rnd() < 0.7;
          dive = rnd() < 0.2;
          yaw += (rnd() - 0.5) * 1.5;
          pitch = rnd();
        }
        stepFlight(s, { ax, ay, flap, dive, aimPitch: pitch }, yaw, 1 / 60, w, i / 60, lm.targets);
        if (!Number.isFinite(s.x + s.y + s.z + s.vx + s.vy + s.vz)) throw new Error(`NaN at run ${run} step ${i}`);
        if (w.solidAt(s.x, s.y, s.z)) throw new Error(`gull inside solid at run ${run} step ${i}: ${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)}`);
        if (Math.abs(s.x) > d.half || Math.abs(s.z) > d.half) throw new Error(`escaped the map at run ${run} step ${i}`);
      }
    }
  });
});
