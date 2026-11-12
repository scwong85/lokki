import { describe, expect, it } from 'vitest';
import { World, closestOnRings, pointInRings, type Box, type Prism } from '../../src/world/collision';

const wall: Box = { min: [0, 0, 0], max: [2, 10, 2], kind: 'building', color: 0 };
const world = (boxes: Box[] = [], prisms: Prism[] = [], half: number | null = null) => new World(boxes, prisms, half);

// 20x20 block with a 6x6 courtyard hole, 10 m tall, centred on the origin
const block: Prism = {
  rings: [
    [-10, -10, 10, -10, 10, 10, -10, 10],
    [-3, -3, 3, -3, 3, 3, -3, 3],
  ],
  y0: 0,
  y1: 10,
  kind: 'building',
};

describe('box collision', () => {
  it('rests on the ground plane', () => {
    const p = { x: 10, y: 0.1, z: 10 };
    const c = world().collide(p, 0.5);
    expect(p.y).toBeCloseTo(0.5);
    expect(c[0].ny).toBe(1);
    expect(c[0].kind).toBeNull();
  });
  it('pushes out of a box side and reports a horizontal normal', () => {
    const p = { x: -0.3, y: 5, z: 1 };
    const c = world([wall]).collide(p, 0.5);
    expect(p.x).toBeCloseTo(-0.5);
    expect(c[0].nx).toBe(-1);
  });
  it('lands on a box top', () => {
    const p = { x: 1, y: 10.2, z: 1 };
    const c = world([wall]).collide(p, 0.5);
    expect(p.y).toBeCloseTo(10.5);
    expect(c[0].ny).toBe(1);
  });
  it('surfaceBelow finds the roof, not boxes above', () => {
    const w = world([wall]);
    expect(w.surfaceBelow(1, 1, 20).y).toBe(10);
    expect(w.surfaceBelow(1, 1, 5).y).toBe(0);
    expect(w.surfaceBelow(50, 50, 20).y).toBe(0);
  });
});

describe('polygon helpers', () => {
  it('even-odd point in polygon respects holes', () => {
    expect(pointInRings(block.rings, -7, 0)).toBe(true);
    expect(pointInRings(block.rings, 0, 0)).toBe(false); // courtyard
    expect(pointInRings(block.rings, 15, 0)).toBe(false);
  });
  it('closest point on the ring edges', () => {
    const q = closestOnRings(block.rings, 14, 0);
    expect(q.x).toBeCloseTo(10);
    expect(q.z).toBeCloseTo(0);
  });
});

describe('prism collision (building footprints)', () => {
  it('is pushed out of an outer wall', () => {
    const p = { x: 10.2, y: 5, z: 0 };
    const c = world([], [block]).collide(p, 0.5);
    expect(p.x).toBeCloseTo(10.5);
    expect(c[0]).toMatchObject({ nx: 1, ny: 0 });
  });
  it('lands on the roof', () => {
    const p = { x: -7, y: 10.2, z: 0 };
    world([], [block]).collide(p, 0.5);
    expect(p.y).toBeCloseTo(10.5);
  });
  it('can fly and walk in the courtyard (hole) but hits the courtyard wall', () => {
    const w = world([], [block]);
    const a = { x: 0, y: 5, z: 0 };
    expect(w.collide(a, 0.5)).toHaveLength(0);
    const b = { x: 3.2, y: 5, z: 0 }; // 0.2 m from the inner wall at x=3, inside the hole
    const c = w.collide(b, 0.5);
    expect(c[0]).toMatchObject({ nx: -1 });
    expect(b.x).toBeCloseTo(2.5);
  });
  it('a centre that ends up inside the solid is expelled', () => {
    const p = { x: -9.5, y: 5, z: 0 };
    world([], [block]).collide(p, 0.5);
    expect(Math.abs(p.x)).toBeGreaterThan(10 - 1e-6);
  });
  it('surfaceBelow and solidAt see the prism, but not its courtyard', () => {
    const w = world([], [block]);
    expect(w.surfaceBelow(-7, 0, 20).y).toBe(10);
    expect(w.surfaceBelow(0, 0, 20).y).toBe(0);
    expect(w.solidAt(-7, 5, 0)).toBe(true);
    expect(w.solidAt(0, 5, 0)).toBe(false);
  });
  it('raised prisms (y0 > 0) leave a gap underneath', () => {
    const canopy: Prism = { rings: [[0, 0, 4, 0, 4, 4, 0, 4]], y0: 2.2, y1: 2.6, kind: 'prop' };
    const w = world([], [canopy]);
    const under = { x: 2, y: 0.4, z: 2 };
    expect(w.collide(under, 0.5)).toHaveLength(1); // only the ground
    expect(w.solidAt(2, 2.4, 2)).toBe(true);
    expect(w.solidAt(2, 1.0, 2)).toBe(false);
  });
});

describe('map edge', () => {
  it('stops the gull at the invisible bound', () => {
    const w = world([], [], 100);
    const p = { x: 120, y: 5, z: 0 };
    const c = w.collide(p, 0.5);
    expect(p.x).toBeCloseTo(99.5);
    expect(c[0].kind).toBe('bound');
  });
});
