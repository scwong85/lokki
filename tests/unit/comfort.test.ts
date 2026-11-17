import { describe, expect, it } from 'vitest';
import { COMFORT, FOLLOW_RATE, LookSmoother, followYawStep, smoothAxis, vignetteAmount } from '../../src/core/comfort';
import { applyOptions, defaultOptions, sanitizeOptions } from '../../src/core/options';
import { comfort } from '../../src/core/comfort';
import { tuning } from '../../src/core/tuning';

describe('comfort presets', () => {
  it('get gentler step by step: less FOV kick, roll, shake, look-ahead and slow motion, more vignette and smoothing', () => {
    const s = COMFORT.standard, g = COMFORT.gentle, c = COMFORT.calm;
    for (const k of ['fovKick', 'roll', 'shake', 'lookAhead', 'slowmo'] as const) {
      expect(s[k], k).toBeGreaterThan(g[k]);
      expect(g[k], k).toBeGreaterThanOrEqual(c[k]);
    }
    expect(c.roll).toBe(0); // a steady horizon
    expect(c.vignette).toBeGreaterThan(g.vignette);
    expect(g.vignette).toBeGreaterThan(s.vignette);
    expect(c.stickTau).toBeGreaterThan(s.stickTau);
  });
});

describe('smooth steering', () => {
  it('ramps towards the target and never overshoots', () => {
    let v = 0;
    const seen: number[] = [];
    for (let i = 0; i < 30; i++) { v = smoothAxis(v, 1, 1 / 60, 0.1); seen.push(v); }
    expect(seen[0]).toBeGreaterThan(0);
    expect(seen[0]).toBeLessThan(0.3); // not an instant jump
    expect(seen[29]).toBeGreaterThan(0.95);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
    expect(smoothAxis(0, 1, 1 / 60, 0)).toBe(1); // tau 0: off
  });
});

describe('camera follow', () => {
  it('eases the yaw towards the heading the short way round', () => {
    let yaw = 0;
    for (let i = 0; i < 600; i++) yaw = followYawStep(yaw, 1.5, 1 / 60, FOLLOW_RATE.gentle);
    expect(yaw).toBeCloseTo(1.5, 1);
    // across the +-pi seam: from 3 towards -3 goes through pi (up), not back through 0
    const y = followYawStep(3, -3, 0.5, 1);
    expect(y).toBeGreaterThan(3);
  });
  it('does nothing when off, and strong catches up faster than gentle', () => {
    expect(followYawStep(0.3, 2, 1, FOLLOW_RATE.off)).toBe(0.3);
    expect(followYawStep(0, 2, 0.5, FOLLOW_RATE.strong)).toBeGreaterThan(followYawStep(0, 2, 0.5, FOLLOW_RATE.gentle));
  });
});

describe('comfort vignette', () => {
  it('is off in standard, and grows with fast turns and dives', () => {
    expect(vignetteAmount(2, true, 1, 0)).toBe(0);
    const calm = vignetteAmount(0, false, 0, 0.6);
    const turning = vignetteAmount(1.4, false, 0.5, 0.6);
    const diving = vignetteAmount(0, true, 1, 0.6);
    expect(turning).toBeGreaterThan(calm);
    expect(diving).toBeGreaterThan(calm);
    expect(Math.max(turning, diving, vignetteAmount(5, true, 1, 0.6))).toBeLessThanOrEqual(0.6);
  });
});

describe('look smoothing', () => {
  it('spreads a movement over frames but loses none of it', () => {
    const s = new LookSmoother();
    let sum = 0, first = 0;
    for (let i = 0; i < 240; i++) { const o = s.step(i === 0 ? 100 : 0, 0, 1 / 60, 0.06); sum += o.dx; if (i === 0) first = o.dx; }
    expect(first).toBeLessThan(40); // softer than an instant 100
    expect(sum).toBeGreaterThan(99.9);
    expect(sum).toBeLessThanOrEqual(100.0001);
    expect(new LookSmoother().step(5, 3, 1 / 60, 0)).toEqual({ dx: 5, dy: 3 }); // tau 0: off
  });
});

describe('options', () => {
  it('have sensible defaults and survive bad saves', () => {
    const d = defaultOptions();
    expect([d.comfort, d.invertY, d.smoothSteer, d.camFollow]).toEqual(['standard', false, true, 'gentle']);
    const o = sanitizeOptions({ comfort: 'nope', camFollow: 'strong', fov: 500, camDistance: 1, invertY: 'yes' });
    expect(o.comfort).toBe('standard');
    expect(o.camFollow).toBe('strong');
    expect(o.fov).toBe(100); // clamped
    expect(o.camDistance).toBe(4);
    expect(o.invertY).toBe(false);
  });
  it('apply to the live settings', () => {
    const before = { fov: tuning.camera.fov.value, dist: tuning.camera.distance.value };
    applyOptions({ ...defaultOptions(), comfort: 'calm', fov: 80, camDistance: 9, invertY: true, camFollow: 'off', smoothSteer: false });
    expect(comfort.mods).toBe(COMFORT.calm);
    expect(comfort.invertY).toBe(true);
    expect(comfort.follow).toBe('off');
    expect(comfort.smoothSteer).toBe(false);
    expect(tuning.camera.fov.value).toBe(80);
    expect(tuning.camera.distance.value).toBe(9);
    applyOptions({ ...defaultOptions(), fov: before.fov, camDistance: before.dist });
    expect(comfort.mods).toBe(COMFORT.standard);
  });
});
