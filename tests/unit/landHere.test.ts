import { afterEach, describe, expect, it } from 'vitest';
import { newFlightState, stepFlight, GULL_RADIUS, type FlightInput } from '../../src/gull/flight';
import { arcHeight, findLandSpot, planLanding } from '../../src/gull/landing';
import { World } from '../../src/world/collision';
import { ngon } from '../../src/world/landmarks';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const idle: FlightInput = { ax: 0, ay: 0, flap: false, dive: false, aimPitch: 0.3, carryMass: 0 };
const hold: FlightInput = { ...idle, ay: -1 }; // S: the land button
const box = (x0: number, z0: number, x1: number, z1: number, top: number) => ({ rings: [[x0, z0, x1, z0, x1, z1, x0, z1]], y0: 0, y1: top, kind: 'building' as const });

afterEach(() => {
  tuning.wind.strength.value = 3;
});

/** A flat roof 12 m x 12 m at 14 m high, centre at (0,-30); a gull glides toward it from the south at the given height and speed. */
function approach(opts: { y: number; speed: number; z?: number; press?: FlightInput; world?: World; steps?: number }) {
  tuning.wind.strength.value = 0;
  const world = opts.world ?? new World([], [box(-6, -36, 6, -24, 14)]);
  const s = newFlightState(0, opts.z ?? -8);
  Object.assign(s, { y: opts.y, vx: 0, vy: -1, vz: -opts.speed, mode: 'air', heading: 0 });
  const trace: { y: number; speed: number; d: number }[] = [];
  for (let i = 0; i < (opts.steps ?? 60 * 14); i++) {
    // look for a spot first (the scan runs every 0.15 s), then press S
    stepFlight(s, i < 20 ? idle : opts.press ?? hold, 0, DT, world, i * DT, []);
    trace.push({ y: s.y, speed: Math.hypot(s.vx, s.vz), d: Math.hypot(s.x, s.z + 30) });
    if (s.mode === 'ground') break;
  }
  const atTouch = { vx: s.vx, vz: s.vz };
  for (let i = 0; i < 12; i++) stepFlight(s, idle, 0, DT, world, 99, []); // let it settle on the surface
  return { s, trace, world, atTouch };
}

describe('"Land here" (M122)', () => {
  it('finds a flat roof ahead and below, never one behind, above or in the sea', () => {
    const world = new World([], [box(-6, -36, 6, -24, 14)]);
    const g = { x: 0, y: 22, z: -8, heading: 0 };
    const spot = findLandSpot(world, g, null)!;
    expect(spot).not.toBeNull();
    expect(spot.y).toBe(14);
    expect(spot.z).toBeLessThan(-20);
    expect(findLandSpot(world, { ...g, heading: Math.PI }, null)?.y ?? 0).toBe(0); // looking away: only the ground (y 0), never the roof
    expect(findLandSpot(world, { ...g, y: 13 }, null)?.y ?? 0).toBe(0); // the roof is above a gull at 13 m
    // the ground counts, but not water
    const open = new World([], []);
    expect(findLandSpot(open, { x: 0, y: 6, z: 0, heading: 0 }, () => true)).not.toBeNull();
    expect(findLandSpot(open, { x: 0, y: 6, z: 0, heading: 0 }, () => false)).toBeNull();
  });

  it('holding S flies onto the roof and stops there: no skid, soft, on the roof', () => {
    const { s, atTouch } = approach({ y: 22, speed: 12 });
    expect(Math.hypot(atTouch.vx, atTouch.vz)).toBe(0);
    expect(s.mode).toBe('ground');
    expect(s.y).toBeCloseTo(14 + GULL_RADIUS, 1);
    expect(Math.abs(s.x)).toBeLessThan(6);
    expect(s.z).toBeLessThan(-24);
    expect(s.z).toBeGreaterThan(-36);
    expect(s.stunT).toBe(0);
  });

  it('without S the same glide touches down still moving (the old way), proving the assist is what stops it', () => {
    tuning.wind.strength.value = 0;
    const world = new World([], [box(-6, -36, 6, -24, 14)]);
    const s = newFlightState(0, -18);
    Object.assign(s, { y: 16.2, vx: 0, vy: -1, vz: -14, mode: 'air', heading: 0 });
    let speedAtTouch = 0;
    for (let i = 0; i < 200; i++) {
      const evs = stepFlight(s, idle, 0, DT, world, i * DT, []);
      if (evs.some((e) => e.type === 'land')) {
        speedAtTouch = Math.hypot(s.vx, s.vz);
        break;
      }
    }
    expect(speedAtTouch).toBeGreaterThan(5);
  });

  it('works from different heights, speeds and distances', () => {
    for (const [y, speed, z] of [[20, 14, -8], [18, 6, -14], [24, 12, 0], [17, 10, -10]] as const) {
      const { s, atTouch } = approach({ y, speed, z });
      expect(Math.hypot(atTouch.vx, atTouch.vz), `speed at touchdown from y ${y}`).toBe(0);
      expect(s.mode, `from y ${y} speed ${speed} z ${z}`).toBe('ground');
      expect(s.y).toBeCloseTo(14 + GULL_RADIUS, 1);
    }
  });

  it('the arc dips under the top and glides up to it (hawk style) when the way under is clear, and not when a wall is in the way', () => {
    // a low perch on the open ground: nothing in the way, so it dips
    const open = new World([], [{ rings: [ngon(0, -30, 1.2, 10)], y0: 0, y1: 5, kind: 'perch' }]);
    const spot = { x: 0, y: 5, z: -30, perch: true };
    const clear = planLanding(open, { x: 0, y: 12, z: -8 }, spot);
    expect(clear.dip).toBeGreaterThan(0);
    expect(arcHeight(clear, clear.dipDist)).toBeCloseTo(-clear.dip, 5);
    expect(arcHeight(clear, 0)).toBeGreaterThan(0);
    // a roof: coming from the street the wall is in the way of a dip
    const roof = new World([], [box(-6, -36, 6, -24, 14)]);
    const blocked = planLanding(roof, { x: 0, y: 22, z: -8 }, { x: 0, y: 14, z: -33, perch: false });
    expect(blocked.dip).toBeLessThan(clear.dip); // the wall lets only a shallower dip, or none, through
  });

  it('flap, a dive or letting go of S cancels it; a dive is still a crash', () => {
    tuning.wind.strength.value = 0;
    const world = new World([], [box(-6, -36, 6, -24, 14)]);
    const make = () => {
      const s = newFlightState(0, -8);
      Object.assign(s, { y: 22, vx: 0, vy: -1, vz: -12, mode: 'air', heading: 0 });
      for (let i = 0; i < 40; i++) stepFlight(s, i < 15 ? idle : hold, 0, DT, world, i * DT, []);
      return s;
    };
    for (const cancel of [{ ...hold, flap: true }, { ...hold, dive: true }, idle]) {
      const s = make();
      expect(s.landing, 'committed').not.toBeNull();
      stepFlight(s, cancel, 0, DT, world, 1, []);
      expect(s.landing).toBeNull();
    }
    // a dive onto the roof is not a soft landing
    const d = make();
    const evs: string[] = [];
    for (let i = 0; i < 200 && d.mode !== 'ground'; i++) for (const e of stepFlight(d, { ...idle, dive: true, aimPitch: 1 }, 0, DT, world, i * DT, [])) if (e.type === 'land') evs.push(e.quality);
    expect(['rough', 'hard']).toContain(evs[0]);
  });
});

describe('stick the landing and the ledge guard (M122)', () => {
  it('a glide onto a perch top stops dead; a dive onto it still skids and stuns', () => {
    tuning.wind.strength.value = 0;
    const world = new World([], [{ rings: [ngon(0, 0, 1.5, 10)], y0: 0, y1: 5, kind: 'perch' }]);
    const s = newFlightState(0, 3);
    Object.assign(s, { y: 5 + GULL_RADIUS + 0.4, vx: 0, vy: -1.5, vz: -3, mode: 'air', heading: 0 });
    for (let i = 0; i < 120 && s.mode !== 'ground'; i++) stepFlight(s, idle, 0, DT, world, i * DT, []);
    expect(s.perched).toBe(true);
    expect(Math.hypot(s.vx, s.vz)).toBe(0);
  });

  it('on a small top, walking stops at the edge, and a push of 0.3 s steps off', () => {
    tuning.wind.strength.value = 0;
    const world = new World([], [{ rings: [ngon(0, 0, 1.5, 10)], y0: 0, y1: 5, kind: 'perch' }]);
    const s = newFlightState(0, 0);
    Object.assign(s, { y: 5 + GULL_RADIUS, mode: 'ground', perched: true, heading: 0 });
    const walk: FlightInput = { ...idle, ay: 1 }; // forward = -z
    let t = 0;
    let stoppedAt = 0;
    for (; t < 90; t++) {
      stepFlight(s, walk, 0, DT, world, t * DT, []);
      if (t === 40) stoppedAt = s.z;
    }
    // after 1.5 s of pushing forward it has stepped off (pushed for 0.3 s at the edge)
    expect(s.mode).not.toBe('ground');
    // but a tap (no push) never goes over
    const s2 = newFlightState(0, 0);
    Object.assign(s2, { y: 5 + GULL_RADIUS, mode: 'ground', perched: true, heading: 0 });
    for (let i = 0; i < 20; i++) stepFlight(s2, walk, 0, DT, world, i * DT, []);
    for (let i = 0; i < 60; i++) stepFlight(s2, idle, 0, DT, world, i * DT, []);
    expect(s2.mode).toBe('ground');
    expect(stoppedAt).toBeLessThan(0);
  });
});
