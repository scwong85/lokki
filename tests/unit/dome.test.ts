import { describe, expect, it } from 'vitest';
import data from '../../data/generated/kauppatori.json';
import { DOME, THERMAL_EXPRESS } from '../../src/data/levels/act2';
import { pointInRings } from '../../src/world/collision';

describe('Thermal Express dome', () => {
  const b = (data as unknown as { buildings: { style?: string; rings: number[][]; h: number }[] }).buildings.find((x) => x.style === 'uspenski')!;
  it('the level\'s dome is where the Uspenski onion really stands (the corner average of its footprint)', () => {
    const r = b.rings[0];
    const n = r.length / 2;
    let cx = 0, cz = 0;
    for (let i = 0; i < r.length; i += 2) {
      cx += r[i];
      cz += r[i + 1];
    }
    expect(Math.hypot(DOME.x - cx / n, DOME.z - cz / n)).toBeLessThan(1);
    expect(pointInRings(b.rings, DOME.x, DOME.z)).toBe(true);
  });
  it('the landing zone is around the dome, high above the 18 m roof', () => {
    const t = THERMAL_EXPRESS.extraTriggers!.find((x) => x.id === 'domeTop')!;
    expect(t.kind).toBe('carryLanded');
    if (t.kind !== 'carryLanded' || !t.zone) throw new Error('zone');
    expect(DOME.x).toBeGreaterThan(t.zone.minX);
    expect(DOME.x).toBeLessThan(t.zone.maxX);
    expect(DOME.z).toBeGreaterThan(t.zone.minZ);
    expect(DOME.z).toBeLessThan(t.zone.maxZ);
    expect(t.minY).toBeGreaterThan(b.h);
    expect(t.minY).toBeLessThan(b.h + 5.65 * 0.9); // even the small onions' collars count
  });
});
