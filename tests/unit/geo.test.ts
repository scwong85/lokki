import { describe, expect, it } from 'vitest';
import {
  clipRing, extendBoundary, hashId, heightFromFloors, openRing, pointInRings, signedArea, simplifyRing, toLocal, type Ring,
} from '../../scripts/lib/geo.ts';

describe('geo helpers', () => {
  it('toLocal: east = +x, north = -z, 1 unit = 1 m', () => {
    expect(toLocal(110, 205, { E: 100, N: 200 })).toEqual([10, -5]);
  });
  it('signedArea and openRing', () => {
    const sq: Ring = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(Math.abs(signedArea(sq))).toBe(4);
    expect(openRing([...sq, [0, 0]])).toHaveLength(4);
  });
  it('simplifyRing removes near-collinear points but keeps corners', () => {
    const ring: Ring = [[0, 0], [5, 0.05], [10, 0], [10, 10], [0, 10]];
    const s = simplifyRing(ring, 0.25);
    expect(s).toHaveLength(4);
    expect(Math.abs(signedArea(s))).toBeCloseTo(100, 0);
  });
  it('clipRing clips to the box', () => {
    const big: Ring = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
    const c = clipRing(big, { minX: -1, maxX: 1, minZ: -1, maxZ: 1 });
    expect(Math.abs(signedArea(c))).toBeCloseTo(4);
    expect(clipRing([[5, 5], [6, 5], [6, 6]], { minX: -1, maxX: 1, minZ: -1, maxZ: 1 })).toEqual([]);
  });
  it('extendBoundary pushes only edge vertices outward', () => {
    const b = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    const r = extendBoundary([[-10, 0], [0, 0], [10, 5]], b, 100);
    expect(r).toEqual([[-110, 0], [0, 0], [110, 5]]);
  });
  it('heightFromFloors is clamped and handles missing data', () => {
    expect(heightFromFloors(null)).toBe(4);
    expect(heightFromFloors(5)).toBeCloseTo(16.8);
    expect(heightFromFloors(100)).toBe(60);
  });
  it('hashId is deterministic', () => {
    expect(hashId(793522)).toBe(hashId(793522));
    expect(hashId(1)).not.toBe(hashId(2));
  });
  it('pointInRings handles holes', () => {
    const rings = [[-5, -5, 5, -5, 5, 5, -5, 5], [-1, -1, 1, -1, 1, 1, -1, 1]];
    expect(pointInRings(rings, 3, 0)).toBe(true);
    expect(pointInRings(rings, 0, 0)).toBe(false);
  });
});
