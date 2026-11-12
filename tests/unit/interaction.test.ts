import { beforeEach, describe, expect, it } from 'vitest';
import { PROPS, classifyImpact, halfHeight, hasTag } from '../../src/data/props';
import { pickGrabTarget } from '../../src/gameplay/grab';
import { predictPoop, spawnPoop, stepPoop } from '../../src/gameplay/poop';
import { World, type Box } from '../../src/world/collision';
import { tuning } from '../../src/core/tuning';

beforeEach(() => {
  tuning.wind.strength.value = 0;
});

describe('prop data', () => {
  it('every prop has positive mass, radius and a sane shape', () => {
    for (const [name, d] of Object.entries(PROPS)) {
      expect(d.mass, name).toBeGreaterThan(0);
      expect(d.radius, name).toBeGreaterThan(0);
      expect(halfHeight(d.shape), name).toBeGreaterThan(0);
      expect(d.tags.length, name).toBeGreaterThan(0);
    }
  });
  it('light things are liftable by default and heavy things are not', () => {
    const max = tuning.interaction.carryMax.value;
    expect(PROPS.icecream.mass).toBeLessThanOrEqual(max);
    expect(PROPS.cap.mass).toBeLessThanOrEqual(max);
    expect(PROPS.bin.mass).toBeGreaterThan(max);
    expect(hasTag('bin', 'container')).toBe(true);
  });
  it('fragile props break on a hard hit, noisy ones clatter, soft hits do nothing', () => {
    expect(classifyImpact('bottle', 8, 6, 2.5)).toBe('break');
    expect(classifyImpact('bottle', 3, 6, 2.5)).toBe('noise');
    expect(classifyImpact('bottle', 1, 6, 2.5)).toBeNull();
    expect(classifyImpact('bin', 20, 6, 2.5)).toBe('noise'); // not fragile
    expect(classifyImpact('icecream', 20, 6, 2.5)).toBeNull();
  });
});

describe('pickGrabTarget', () => {
  const beak = { x: 0, y: 0.5, z: 0 };
  // heading 0 faces -Z
  const ahead = { id: 1, x: 0, y: 0.5, z: -1, mass: 0.2 };
  it('grabs the nearest liftable prop ahead', () => {
    const r = pickGrabTarget(beak, 0, [{ ...ahead, id: 2, z: -1.5 }, ahead], 1.8, 80, 1);
    expect(r).toEqual({ id: 1, tooHeavy: false });
  });
  it('ignores props behind the gull and out of range', () => {
    expect(pickGrabTarget(beak, 0, [{ ...ahead, z: 1 }], 1.8, 80, 1)).toBeNull();
    expect(pickGrabTarget(beak, 0, [{ ...ahead, z: -5 }], 1.8, 80, 1)).toBeNull();
  });
  it('reports heavy props only when nothing liftable is in reach', () => {
    const heavy = { ...ahead, id: 9, mass: 30 };
    expect(pickGrabTarget(beak, 0, [heavy], 1.8, 80, 1)).toEqual({ id: 9, tooHeavy: true });
    expect(pickGrabTarget(beak, 0, [heavy, { ...ahead, id: 3, z: -1.6 }], 1.8, 80, 1)).toEqual({ id: 3, tooHeavy: false });
  });
});

describe('poop', () => {
  const floor = new World();
  it('falls and splats on the ground with an upward normal', () => {
    const p = spawnPoop({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 });
    let hit = null;
    for (let i = 0; i < 300 && !hit; i++) hit = stepPoop(p, 1 / 60, i / 60, floor);
    expect(hit).not.toBeNull();
    expect(hit!.y).toBeCloseTo(0, 0);
    expect(hit!.ny).toBe(1);
  });
  it('inherits forward speed and lands ahead of the gull', () => {
    const hit = predictPoop({ x: 0, y: 20, z: 0 }, { x: 0, y: 0, z: -14 }, 0, floor)!;
    expect(hit.z).toBeLessThan(-5);
  });
  it('wind drifts the poop downwind', () => {
    tuning.wind.strength.value = 8;
    tuning.wind.gustiness.value = 0;
    const calm = (() => {
      tuning.wind.strength.value = 0;
      return predictPoop({ x: 0, y: 30, z: 0 }, { x: 0, y: 0, z: 0 }, 0, floor)!;
    })();
    tuning.wind.strength.value = 8;
    const windy = predictPoop({ x: 0, y: 30, z: 0 }, { x: 0, y: 0, z: 0 }, 0, floor)!;
    expect(Math.hypot(windy.x - calm.x, windy.z - calm.z)).toBeGreaterThan(1);
    tuning.wind.gustiness.value = 0.5;
  });
  it('hits a roof (flat top) and a wall (side) with the right normals', () => {
    const block: Box = { min: [-5, 0, -5], max: [5, 10, 5], kind: 'building', color: 0 };
    const w = new World([block]);
    const roof = predictPoop({ x: 0, y: 20, z: 0 }, { x: 0, y: 0, z: 0 }, 0, w)!;
    expect(roof.y).toBeGreaterThan(9);
    expect(roof.ny).toBe(1);
    const p = spawnPoop({ x: -12, y: 5, z: 0 }, { x: 0, y: 0, z: 0 });
    p.vx = 12;
    p.vy = 0;
    let hit = null;
    for (let i = 0; i < 120 && !hit; i++) hit = stepPoop(p, 1 / 60, 0, w);
    expect(hit).not.toBeNull();
    expect(hit!.nx).toBe(-1);
  });
  it('hits a prop sphere on the way down', () => {
    const hit = predictPoop({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 }, 0, floor, [{ x: 0, y: 3, z: 0, r: 0.5 }])!;
    expect(hit.prop).toBe(0);
  });
});
