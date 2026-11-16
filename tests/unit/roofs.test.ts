import { describe, expect, it } from 'vitest';
import { area, offsetRing, planMansard } from '../../src/world/roofs';
import { PALETTES, districtOf, paletteAt } from '../../src/world/districts';

const rect = (x0: number, z0: number, x1: number, z1: number) => [x0, z0, x1, z0, x1, z1, x0, z1];
const L = [0, 0, 20, 0, 20, 8, 8, 8, 8, 20, 0, 20];

describe('offsetRing', () => {
  it('shrinks a rectangle evenly', () => {
    const r = offsetRing(rect(0, 0, 20, 10), 2)!;
    expect(Math.abs(area(r))).toBeCloseTo(16 * 6, 5);
  });
  it('grows when the distance is negative', () => {
    const grown = offsetRing(rect(0, 0, 10, 10), -1)!;
    expect(Math.abs(area(grown))).toBeCloseTo(144, 5);
    // a ring that runs the other way offsets the same way
    const rev = rect(0, 0, 10, 10);
    const cw: number[] = [];
    for (let k = rev.length / 2 - 1; k >= 0; k--) cw.push(rev[k * 2], rev[k * 2 + 1]);
    expect(Math.abs(area(offsetRing(cw, 1)!))).toBeCloseTo(64, 5);
  });
  it('handles an L shape and refuses a ring that would collapse', () => {
    const r = offsetRing(L, 1.5)!;
    expect(Math.abs(area(r))).toBeLessThan(Math.abs(area(L)));
    expect(offsetRing(rect(0, 0, 3, 3), 2)).toBeNull();
    expect(offsetRing([0, 0, 1, 1], 1)).toBeNull();
  });
});

describe('mansard roofs', () => {
  it('a big block gets a skirt and a flat top inside it', () => {
    const m = planMansard([rect(0, 0, 40, 25)])!;
    expect(m).not.toBeNull();
    expect(m.rise).toBeGreaterThan(0);
    expect(m.top.length).toBe(1);
    expect(Math.abs(area(m.top[0]))).toBeLessThan(40 * 25);
    expect(m.pairs[0][0].length).toBe(m.pairs[0][1].length);
  });
  it('a courtyard block grows its hole and keeps it inside the roof', () => {
    const m = planMansard([rect(0, 0, 60, 50), rect(20, 15, 40, 35)])!;
    expect(m.top.length).toBe(2);
    expect(Math.abs(area(m.top[1]))).toBeGreaterThan(20 * 20);
    expect(m.pairs.length).toBe(2);
  });
  it('small or over-complex footprints keep the flat roof', () => {
    expect(planMansard([rect(0, 0, 8, 8)])).toBeNull();
    const many: number[] = [];
    for (let i = 0; i < 60; i++) many.push(30 + Math.cos((i / 60) * Math.PI * 2) * 30, 30 + Math.sin((i / 60) * Math.PI * 2) * 30);
    expect(planMansard([many])).toBeNull();
  });
  it('a hole too near the edge to grow cleanly keeps the flat roof', () => {
    expect(planMansard([rect(0, 0, 60, 50), rect(2, 2, 10, 10)])).toBeNull();
  });
});

describe('districts', () => {
  it('knows the main places by position', () => {
    expect(districtOf(-156, -300)).toBe('senate'); // the Cathedral steps
    expect(districtOf(-300, -60)).toBe('esplanadi');
    expect(districtOf(275, -160)).toBe('jugend'); // Uspenski
    expect(districtOf(0, -44)).toBe('market');
    expect(districtOf(500, 400)).toBe('city');
  });
  it('every palette is complete, and the rest of the city keeps the old mix', () => {
    for (const p of Object.values(PALETTES)) {
      expect(p.walls.length).toBeGreaterThan(2);
      expect(p.pitched.length).toBeGreaterThan(1);
      expect(p.flat.length).toBeGreaterThan(1);
    }
    expect(paletteAt(900, 900)).toBe(PALETTES.city);
    expect(PALETTES.city.walls[0]).toBe(0xffe9c2);
  });
});
