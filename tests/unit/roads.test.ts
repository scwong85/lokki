import { describe, expect, it } from 'vitest';
import { TRAM_LINE, isPlaza, planRoads, planTrack, streetWidth } from '../../src/world/roads';
import { area } from '../../src/world/roofs';
import { pointInRings } from '../../src/world/collision';
import data from '../../data/generated/kauppatori.json';

const strip = (len: number, w: number) => [0, 0, len, 0, len, w, 0, w];

describe('roads', () => {
  it('estimates the width of a strip', () => {
    expect(streetWidth(strip(80, 20))).toBeCloseTo(20, 4);
    expect(streetWidth(strip(20, 20))).toBeCloseTo(20, 4);
  });
  it('a wide straight street gets asphalt inside it, a kerb band and a dashed centre line', () => {
    const p = planRoads([{ rings: [strip(90, 18)] }]);
    expect(p.asphalt.length).toBe(1);
    expect(Math.abs(area(p.asphalt[0][0]))).toBeLessThan(90 * 18);
    for (let i = 0; i < p.asphalt[0][0].length; i += 2) expect(pointInRings([strip(90, 18)], p.asphalt[0][0][i], p.asphalt[0][0][i + 1])).toBe(true);
    expect(p.kerb.length).toBe(1);
    expect(Math.abs(area(p.kerb[0][0]))).toBeGreaterThan(Math.abs(area(p.kerb[0][1])));
    expect(p.dashes.length).toBeGreaterThan(5);
    for (const d of p.dashes) expect(pointInRings([strip(90, 18)], d[0], d[1])).toBe(true);
  });
  it('a narrow lane gets asphalt but no centre line, and a sliver gets nothing', () => {
    const lane = planRoads([{ rings: [strip(60, 6)] }]);
    expect(lane.asphalt.length).toBe(1);
    expect(lane.dashes.length).toBe(0);
    expect(planRoads([{ rings: [strip(60, 2)] }]).asphalt.length).toBe(0);
  });
  it('squares and quays are plazas, streets are not', () => {
    expect(isPlaza('Senaatintori')).toBe(true);
    expect(isPlaza('Kauppatori')).toBe(true);
    expect(isPlaza('Katajanokan laituri')).toBe(true);
    expect(isPlaza('Aleksanterinkatu')).toBe(false);
    expect(isPlaza('Eteläranta')).toBe(false);
    expect(isPlaza(undefined)).toBe(false);
    expect(planRoads([{ name: 'Kauppatori', rings: [strip(60, 18)] }]).asphalt.length).toBe(0);
    expect(planRoads([{ rings: [strip(60, 60)] }]).asphalt.length).toBe(0); // too wide to be a street
  });
  it('most of the real street areas turn into roads', () => {
    const streets = (data as unknown as { streets: { rings: number[][] }[] }).streets;
    const p = planRoads(streets);
    expect(p.asphalt.length).toBeGreaterThan(streets.length * 0.55);
    expect(p.dashes.length).toBeGreaterThan(20);
  });

  it('long straight streets get zebra crossings near both ends, and big streets get a few manholes on the asphalt', () => {
    const road = [{ rings: [strip(120, 18)] }];
    const p = planRoads(road);
    expect(p.zebra.length).toBeGreaterThan(10);
    // two crossings: the bars sit near both ends of the street (x about 8 and 112)
    expect(p.zebra.some((b) => b[0] < 20)).toBe(true);
    expect(p.zebra.some((b) => b[0] > 100)).toBe(true);
    for (const b of p.zebra) expect(pointInRings([strip(120, 18)], b[0] + 1.7, b[1] + 0.2)).toBe(true);
    expect(p.manholes.length).toBeGreaterThan(0);
    for (const m of p.manholes) expect(pointInRings(p.asphalt[0], m[0], m[1])).toBe(true);
    expect(planRoads(road)).toEqual(p); // same every time
    expect(planRoads([{ rings: [strip(30, 18)] }]).zebra.length).toBe(0); // too short for a crossing
  });
});

describe('tram track', () => {
  it('two rails inside a bed, with sleepers across', () => {
    const t = planTrack(TRAM_LINE);
    expect(t.rails.length).toBe(2);
    expect(t.sleepers.length).toBeGreaterThan(80);
    const bedZ = [t.bed[1], t.bed[5]];
    for (const r of t.rails) {
      expect(r[1]).toBeGreaterThan(Math.min(...bedZ));
      expect(r[5]).toBeLessThan(Math.max(...bedZ));
    }
    // the rails are about 1.4 m apart (standard gauge, centre to centre)
    expect((t.rails[1][1] + t.rails[1][5]) / 2 - (t.rails[0][1] + t.rails[0][5]) / 2).toBeCloseTo(1.44, 1);
  });
});
