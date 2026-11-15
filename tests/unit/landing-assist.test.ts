import { afterEach, describe, expect, it } from 'vitest';
import { headingToward, magnetSteer, newFlightState, stepFlight, GULL_RADIUS } from '../../src/gull/flight';
import { World } from '../../src/world/collision';
import { ngon } from '../../src/world/landmarks';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const saved = tuning.landing.magnet.value;
afterEach(() => {
  tuning.landing.magnet.value = saved;
  tuning.wind.strength.value = 3;
});

/** A statue-sized perch (0.9 m radius, top at 5.2 m) and a gull gliding slowly down past it, 2.2 m to the side. */
function glidePast(magnet: number): { perched: boolean; y: number } {
  tuning.landing.magnet.value = magnet;
  tuning.wind.strength.value = 0;
  const world = new World([], [{ rings: [ngon(0, 0, 0.9, 10)], y0: 0, y1: 5.2, kind: 'perch' }]);
  const s = newFlightState(2.2, 6);
  Object.assign(s, { y: 5.2 + GULL_RADIUS + 1.6, vx: 0, vy: -0.8, vz: -2.2, mode: 'air', heading: 0 });
  for (let i = 0; i < 60 * 6 && s.mode !== 'ground'; i++) {
    stepFlight(s, { ax: 0, ay: 0, flap: false, dive: false, aimPitch: 0.3, carryMass: 0 }, 0, DT, world, i * DT, []);
  }
  return { perched: s.perched, y: s.y };
}

describe('landing assist', () => {
  it('without the magnet the gull glides past the statue; with it, it lands on top', () => {
    expect(glidePast(0).perched).toBe(false);
    const r = glidePast(12);
    expect(r.perched).toBe(true);
    expect(r.y).toBeGreaterThan(5);
  });

  it('turns toward the spot, harder when closer, and flares only near it', () => {
    // gull at (2,0) heading -z (heading 0), spot at the origin: it should turn left (toward -x)
    const far = magnetSteer({ x: 3, z: 0.5, heading: 0 }, { x: 0, z: 0 }, 12, 3.5, DT);
    const near = magnetSteer({ x: 1, z: 0.5, heading: 0 }, { x: 0, z: 0 }, 12, 3.5, DT);
    expect(far.heading).toBeGreaterThan(0);
    expect(near.heading).toBeGreaterThan(far.heading);
    expect(far.flare).toBe(false);
    expect(near.flare).toBe(true);
  });

  it('only helps when heading toward the perch', () => {
    expect(headingToward({ x: 3, z: 0, vx: -5, vz: 0 }, { x: 0, z: 0 })).toBe(true);
    expect(headingToward({ x: 3, z: 0, vx: 5, vz: 0 }, { x: 0, z: 0 })).toBe(false);
  });

  it('only perch tops below the gull and within reach count', () => {
    const world = new World([], [{ rings: [ngon(0, 0, 0.9, 10)], y0: 0, y1: 5.2, kind: 'perch' }, { rings: [ngon(10, 0, 2, 8)], y0: 0, y1: 4, kind: 'building' }]);
    expect(world.perchNear(2, 6, 0, 3.5, 4)).not.toBeNull();
    expect(world.perchNear(2, 4, 0, 3.5, 4)).toBeNull(); // below the top
    expect(world.perchNear(2, 12, 0, 3.5, 4)).toBeNull(); // too high above
    expect(world.perchNear(9, 6, 0, 3.5, 4)).toBeNull(); // a plain roof is not a perch
  });
});
