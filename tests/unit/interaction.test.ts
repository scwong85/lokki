import { beforeEach, describe, expect, it } from 'vitest';
import { PROPS, classifyImpact, halfHeight, hasTag } from '../../src/data/props';
import { pickGrabTarget } from '../../src/gameplay/grab';
import { predictPoop, spawnPoop, spawnPoopAssisted, stepPoop } from '../../src/gameplay/poop';
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
  it('anything thrown hard enough thumps (so tossing a prop can distract someone)', () => {
    expect(classifyImpact('icecream', 6, 6, 2.5, 4.5)).toBe('thump');
    expect(classifyImpact('icecream', 3, 6, 2.5, 4.5)).toBeNull();
    expect(classifyImpact('bin', 6, 6, 2.5, 4.5)).toBe('noise'); // noisy beats thump
  });
  it('fragile props break on a hard hit, noisy ones clatter, soft hits do nothing', () => {
    expect(classifyImpact('bottle', 8, 6, 2.5)).toBe('break');
    expect(classifyImpact('bottle', 3, 6, 2.5)).toBe('noise');
    expect(classifyImpact('bottle', 1, 6, 2.5)).toBeNull();
    expect(classifyImpact('bin', 20, 6, 2.5)).toBe('noise'); // not fragile
    expect(classifyImpact('icecream', 20, 6, 2.5)).toBeNull();
  });
});

describe('pickGrabTarget (small things like bottles)', () => {
  const beak = { x: 0, y: 0.55, z: 0 };
  const body = { x: 0, y: 0.5, z: 0.85 }; // gull centre, 0.85 behind the beak
  it('a bottle beside the gull, outside the cone, is still grabbed when it is close', () => {
    const bottle = { id: 7, x: 1.1, y: 0.23, z: 0.4, mass: 0.4, r: 0.25 };
    expect(pickGrabTarget(beak, 0, [bottle], 2.2, 120, 1)).toBeNull(); // old rules: beside the beak, not in the cone
    expect(pickGrabTarget(beak, 0, [bottle], 2.2, 120, 1, 1.4, body)).toEqual({ id: 7, tooHeavy: false });
  });
  it('the prop radius counts: the beak only has to reach its edge', () => {
    const far = { id: 1, x: 0, y: 0.55, z: -2.55, mass: 0.2, r: 0.4 };
    expect(pickGrabTarget(beak, 0, [{ ...far, r: 0 }], 2.2, 120, 1)).toBeNull();
    expect(pickGrabTarget(beak, 0, [far], 2.2, 120, 1)).toEqual({ id: 1, tooHeavy: false });
  });
  it('far-away and behind things are still ignored', () => {
    expect(pickGrabTarget(beak, 0, [{ id: 1, x: 0, y: 0.3, z: 5, mass: 0.2, r: 0.25 }], 2.2, 120, 1, 1.4, body)).toBeNull();
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
  it('reports the tag of the sphere it hit (the umbrella blocks)', () => {
    const hit = predictPoop({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 }, 0, floor, [{ x: 0, y: 3, z: 0, r: 0.9, tag: 'umbrella' }, { x: 0, y: 1, z: 0, r: 0.5, tag: 'warden' }])!;
    expect(hit.tag).toBe('umbrella');
  });
  it('hits a prop sphere on the way down', () => {
    const hit = predictPoop({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 }, 0, floor, [{ x: 0, y: 3, z: 0, r: 0.5 }])!;
    expect(hit.prop).toBe(0);
  });

  it('aim assist pulls a near-miss toward a tourist, ignores far ones, and can be switched off', () => {
    const target = { x: 2, y: 1, z: 0, r: 0.5 }; // 2 m off the drop line
    const from = { x: 0, y: 12, z: 0 };
    const still = { x: 0, y: 0, z: 0 };
    const drift = (strength: number, t = target) => {
      tuning.poop.assistStrength.value = strength;
      const p = spawnPoopAssisted(from, still, 0, floor, [], [t]);
      return Math.hypot(p.vx, p.vz);
    };
    expect(drift(0)).toBe(0);
    expect(drift(0.8)).toBeGreaterThan(0.1);
    expect(drift(0.8, { ...target, x: 30 })).toBe(0); // out of radius
    tuning.poop.assistStrength.value = 0.8;
    const hit = predictPoop(from, still, 0, floor, [target], [target])!;
    expect(hit.prop).toBe(0); // with the assist the poop now reaches the tourist
    tuning.poop.assistStrength.value = 0;
    expect(predictPoop(from, still, 0, floor, [target], [target])!.prop).toBeNull();
    tuning.poop.assistStrength.value = 0.8;
  });
});

describe('market goods replace the sandbox', () => {
  it('the quest items lie around the market and the square, not in a test area', async () => {
    const { buildLandmarks } = await import('../../src/world/landmarks');
    const city = (await import('../../data/generated/kauppatori.json')).default as unknown as { landmarks: Parameters<typeof buildLandmarks>[0] };
    const out = buildLandmarks(city.landmarks);
    const count = (t: string) => out.props.filter((p) => p.type === t).length;
    expect(city.landmarks.some((l) => l.type === 'sandbox')).toBe(false);
    expect(count('salmiakki')).toBeGreaterThanOrEqual(2); // the swap quest
    expect(count('bun')).toBeGreaterThanOrEqual(5); // bun ring + the stall pastry
    expect(count('chair')).toBe(4); // the finale's chair stack
    expect(count('toy')).toBe(1);
    expect(out.props.filter((p) => p.type === 'bin').length).toBeGreaterThanOrEqual(3);
    // goods sit on counters (about 1 m up), the toy is near the market, not across the map
    expect(out.props.filter((p) => p.type === 'salmiakki').every((p) => p.y > 1.0 && p.y < 1.5)).toBe(true);
    const toy = out.props.find((p) => p.type === 'toy')!;
    expect(Math.hypot(toy.x, toy.z)).toBeLessThan(120);
  });
});
