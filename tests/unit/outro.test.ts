import { describe, expect, it } from 'vitest';
import { flatRun, Outro, outroCamera, planRun, yawFor, type Sample } from '../../src/gameplay/outro';

const flat: Sample = () => ({ y: 0, water: false });
/** A wall (a raised block) from x = 10 on, and water for z < -20. */
const walled: Sample = (x, z) => ({ y: x >= 10 ? 15 : 0, water: z < -20 });

describe('victory run planning', () => {
  it('measures the flat run and stops at a wall or the water', () => {
    expect(flatRun(flat, { x: 0, z: 0 }, { x: 1, z: 0 }, 20)).toBe(20);
    expect(flatRun(walled, { x: 0, z: 0 }, { x: 1, z: 0 }, 30)).toBe(9);
    expect(flatRun(walled, { x: 0, z: 0 }, { x: 0, z: -1 }, 30)).toBe(20);
    expect(flatRun(walled, { x: 0, z: -30 }, { x: 1, z: 0 }, 30)).toBe(0); // starting in water
  });
  it('does not run along a thin strip: the ground to the sides must be dry too', () => {
    const strip: Sample = (_x, z) => ({ y: 0, water: Math.abs(z) > 1 });
    expect(flatRun(strip, { x: 0, z: 0 }, { x: 1, z: 0 }, 20)).toBe(0);
    const wide: Sample = (_x, z) => ({ y: 0, water: Math.abs(z) > 5 });
    expect(flatRun(wide, { x: 0, z: 0 }, { x: 1, z: 0 }, 20)).toBe(20);
  });
  it('picks a direction with enough room, facing the way the gull was heading first', () => {
    const p = planRun(flat, { x: 0, z: 0 }, 25, 1.2);
    expect(p.flat).toBeGreaterThanOrEqual(25);
    expect(p.dir.x).toBeCloseTo(Math.cos(1.2), 5);
  });
  it('turns away from a wall and finds the long way', () => {
    const p = planRun(walled, { x: 0, z: 0 }, 25, 0); // heading straight at the wall
    expect(p.flat).toBeGreaterThanOrEqual(25);
    expect(p.dir.x).toBeLessThan(0.5);
  });
  it('moves the landing spot off the water', () => {
    const p = planRun(walled, { x: 0, z: -30 }, 20);
    expect(walled(p.start.x, p.start.z).water).toBe(false);
    expect(p.flat).toBeGreaterThan(10);
  });
  it('yawFor makes forward run along the direction', () => {
    for (const a of [0, 1, 2.5, -2]) {
      const d = { x: Math.cos(a), z: Math.sin(a) };
      const y = yawFor(d);
      expect(-Math.sin(y)).toBeCloseTo(d.x, 5);
      expect(-Math.cos(y)).toBeCloseTo(d.z, 5);
    }
  });
});

describe('victory run camera and clock', () => {
  it('the camera is ahead of the gull on the run line, looking back at it', () => {
    const c = outroCamera({ x: 5, y: 0.4, z: 5 }, { x: 0, z: 1 }, 0, { distance: 4, height: 1.1, sway: 1 });
    expect(c.pos.x).toBeCloseTo(5, 5);
    expect(c.pos.z).toBeCloseTo(9, 5);
    expect(c.pos.y).toBeCloseTo(1.5, 5);
    expect(c.look).toEqual({ x: 5, y: 0.55, z: 5 });
  });
  it('the camera backs away as the gull runs towards it (same distance all the way)', () => {
    const cfg = { distance: 4, height: 1.1, sway: 0 };
    for (const x of [0, 3, 9]) {
      const c = outroCamera({ x, y: 0.4, z: 0 }, { x: 1, z: 0 }, 2, cfg);
      expect(c.pos.x - x).toBeCloseTo(4, 5);
    }
  });
  it('lands, runs for the room there is, holds, then ends once', () => {
    const o = new Outro(() => ({ land: 1, run: 5, hold: 0.5 }));
    o.start({ start: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, flat: 20, y: 0 }, 4.5);
    expect(o.phase).toBe('land');
    expect(o.runFor).toBeCloseTo(3.78, 1); // 17 m of room at 4.5 m/s, less than the 5 s asked for
    expect(o.tick(0.2, false)).toBe(false);
    expect(o.phase).toBe('land'); // still in the air
    o.tick(0.4, true);
    expect(o.phase).toBe('run');
    o.tick(o.runFor + 0.01, true);
    expect(o.phase).toBe('hold');
    expect(o.tick(0.6, true)).toBe(true);
    expect(o.phase).toBe('done');
    expect(o.active).toBe(false);
    expect(o.tick(1, true)).toBe(false);
  });
  it('skip ends it, and a gull that never lands does not hang the level card', () => {
    const o = new Outro(() => ({ land: 1, run: 5, hold: 0.5 }));
    o.start({ start: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, flat: 30, y: 0 }, 4.5);
    o.skip();
    expect(o.active).toBe(false);
    const p = new Outro(() => ({ land: 1, run: 5, hold: 0.5 }));
    p.start({ start: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, flat: 30, y: 0 }, 4.5);
    for (let i = 0; i < 400; i++) p.tick(0.016, false);
    expect(p.phase === 'run' || p.phase === 'hold' || p.phase === 'done').toBe(true);
  });
});
