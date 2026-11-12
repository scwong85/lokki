import { beforeEach, describe, expect, it } from 'vitest';
import { aimDiveAngle, divePreview, newFlightState, stepFlight, type FlightEvent, type FlightInput, type FlightState } from '../../src/gull/flight';
import { tuning } from '../../src/core/tuning';
import { World, type Box } from '../../src/world/collision';
import type { Target } from '../../src/gameplay/targets';

const DT = 1 / 60;
const idle: FlightInput = { ax: 0, ay: 0, flap: false, dive: false, aimPitch: 0.5 };
let t = 0;
let evs: FlightEvent[] = [];

function run(
  s: FlightState,
  secs: number,
  inp: FlightInput | ((s: FlightState) => FlightInput),
  boxes: Box[] = [],
  camYaw = 0,
  targets: Target[] = [],
) {
  for (let i = 0; i < Math.round(secs / DT); i++) {
    const input = typeof inp === 'function' ? inp(s) : inp;
    evs.push(...stepFlight(s, input, camYaw, DT, new World(boxes), (t += DT), targets));
  }
}

/** A state already flying at height y, gliding forward. */
function airborne(y = 50): FlightState {
  const s = newFlightState();
  s.y = y;
  s.mode = 'air';
  s.vz = -tuning.flight.glideSpeed.value;
  return s;
}

beforeEach(() => {
  evs = [];
  t = 0;
  tuning.wind.strength.value = 0; // deterministic unless a test wants wind
});

describe('ground', () => {
  it('stays grounded when idle and walks toward -Z when pushing forward', () => {
    const s = newFlightState();
    run(s, 1, idle);
    expect(s.mode).toBe('ground');
    run(s, 1, { ...idle, ay: 1 });
    expect(s.z).toBeLessThan(-2);
    expect(Math.hypot(s.vx, s.vz)).toBeLessThanOrEqual(tuning.walk.speed.value + 1e-6);
  });
  it('hops into the air with space', () => {
    const s = newFlightState();
    run(s, 0.3, { ...idle, flap: true });
    expect(evs.some((e) => e.type === 'hop')).toBe(true);
    expect(s.y).toBeGreaterThan(0.6);
  });
});

describe('flapping and stamina', () => {
  it('flap climbs and costs stamina', () => {
    const s = airborne(10);
    const y0 = s.y;
    const st0 = s.stamina;
    run(s, 2, { ...idle, flap: true });
    expect(s.y).toBeGreaterThan(y0 + 3);
    expect(evs.filter((e) => e.type === 'flap').length).toBeGreaterThan(3);
    expect(s.stamina).toBeLessThan(st0);
  });
  it('cannot flap with no stamina', () => {
    const s = airborne(100);
    s.stamina = 0;
    run(s, 0.1, { ...idle, flap: true });
    expect(evs.some((e) => e.type === 'exhausted')).toBe(true);
    expect(evs.some((e) => e.type === 'flap')).toBe(false);
  });
  it('stamina regenerates on the ground', () => {
    const s = newFlightState();
    s.stamina = 0;
    run(s, 1, idle);
    expect(s.stamina).toBeGreaterThan(20);
  });
});

describe('glide', () => {
  it('sinks no faster than glideSink and holds cruise speed', () => {
    const s = airborne(200);
    run(s, 3, idle);
    expect(s.vy).toBeGreaterThanOrEqual(-tuning.flight.glideSink.value - 1e-6);
    expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(tuning.flight.glideSpeed.value, 1);
  });
  it('turns toward the steering direction', () => {
    const s = airborne(200);
    run(s, 1, { ...idle, ax: 1 }); // camera yaw 0: right = +X
    expect(s.vx).toBeGreaterThan(1);
  });
  it('wind pushes a flying gull but not a grounded one', () => {
    tuning.wind.strength.value = 6;
    tuning.wind.gustiness.value = 0;
    const a = airborne(300);
    a.vz = 0;
    a.vx = 0;
    a.mode = 'air';
    const g = newFlightState();
    run(a, 1, idle);
    run(g, 1, idle);
    expect(Math.hypot(a.x, a.z)).toBeGreaterThan(0.5);
    expect(Math.hypot(g.x, g.z)).toBeLessThan(0.01);
    tuning.wind.gustiness.value = 0.5;
  });
});

describe('dive', () => {
  it('is committed: releasing early does not end it before minTime', () => {
    const s = airborne(100);
    run(s, DT, { ...idle, dive: true });
    expect(s.mode).toBe('dive');
    run(s, tuning.dive.minTime.value * 0.5, idle); // key released
    expect(s.mode).toBe('dive');
    run(s, tuning.dive.minTime.value, idle);
    expect(s.mode).toBe('air');
  });
  it('speeds up toward diveSpeed, going down', () => {
    const s = airborne(300);
    run(s, 1.5, { ...idle, dive: true });
    expect(s.vy).toBeLessThan(-20);
    expect(Math.hypot(s.vx, s.vy, s.vz)).toBeLessThanOrEqual(tuning.dive.speed.value + 1e-6);
  });
  it('needs minimum clearance to start', () => {
    const s = airborne(1.2);
    run(s, DT, { ...idle, dive: true });
    expect(s.mode).not.toBe('dive');
  });
  it('swoops up on release', () => {
    const s = airborne(300);
    run(s, 1, { ...idle, dive: true });
    run(s, 0.1, idle);
    expect(s.vy).toBeGreaterThan(0);
  });
  it('hitting the ground in a dive is a stunned landing, not a crash through', () => {
    const s = airborne(15);
    run(s, 2, { ...idle, dive: true });
    expect(s.y).toBeGreaterThanOrEqual(0.5 - 1e-6);
    expect(evs.some((e) => e.type === 'land' && e.quality === 'hard')).toBe(true);
    expect(s.mode).toBe('ground');
  });
});

describe('landing and perches', () => {
  it('glide into the ground is a soft landing, no stun', () => {
    const s = airborne(6);
    run(s, 5, idle);
    const land = evs.find((e) => e.type === 'land');
    expect(land).toMatchObject({ quality: 'soft' });
    expect(s.stunT).toBe(0);
  });
  it('flare slows the gull so it stops quickly on landing', () => {
    const a = airborne(5);
    const b = airborne(5);
    run(a, 4, idle);
    run(b, 4, { ...idle, ay: -1 });
    expect(Math.hypot(b.x, b.z - 0)).toBeLessThan(Math.hypot(a.x, a.z));
  });
  it('landing on a perch box sets perched', () => {
    const ledge: Box = { min: [-2, 4, -40], max: [2, 4.4, 40], kind: 'perch', color: 0 };
    const s = airborne(8);
    s.vz = -tuning.flight.flareSpeed.value;
    run(s, 4, { ...idle, ay: -1 }, [ledge]);
    expect(s.mode).toBe('ground');
    expect(s.perched).toBe(true);
  });
  it('slamming into a wall at speed stuns', () => {
    const wall: Box = { min: [-5, 0, -30], max: [5, 50, -28], kind: 'building', color: 0 };
    const s = airborne(20);
    tuning.flight.glideSpeed.value = 20;
    s.vz = -20;
    run(s, 2, idle, [wall]);
    tuning.flight.glideSpeed.value = 14;
    expect(evs.some((e) => e.type === 'bonk')).toBe(true);
  });
});

describe('aimed dive', () => {
  it('steeper camera pitch gives a steeper dive', () => {
    const shallow = airborne(300);
    const steep = airborne(300);
    run(shallow, 1, { ...idle, dive: true, aimPitch: 0.1 });
    run(steep, 1, { ...idle, dive: true, aimPitch: 0.95 });
    const slope = (s: FlightState) => -s.vy / Math.hypot(s.vx, s.vz);
    expect(slope(steep)).toBeGreaterThan(slope(shallow) * 2);
    expect(aimDiveAngle(0.95)).toBeGreaterThan(aimDiveAngle(0.1));
  });
  it('dives toward where the camera looks, not where the gull faced', () => {
    const s = airborne(300); // facing -Z
    run(s, 0.9, { ...idle, dive: true }, [], Math.PI / 2); // camera looks toward -X
    expect(s.vx).toBeLessThan(-5);
  });
  it('preview ray lands on the ground where a straight dive would', () => {
    const s = airborne(30);
    const hit = divePreview(s, 0, Math.PI / 4, new World())!;
    expect(hit.y).toBe(0);
    expect(hit.z).toBeCloseTo(-30, 0);
  });
  it('aim assist curves a slightly off-line dive into the target', () => {
    const closest = (strength: number) => {
      tuning.dive.assistStrength.value = strength;
      const target: Target = { x: 3, y: 0.9, z: -39, radius: 0.6, cooldown: 0 };
      const s = airborne(40);
      let best = Infinity;
      for (let i = 0; i < 200; i++) {
        stepFlight(s, { ...idle, dive: true, aimPitch: 0.4 }, 0, DT, new World(), (t += DT), [target]);
        best = Math.min(best, Math.hypot(s.x - target.x, s.y - target.y, s.z - target.z));
        if (s.mode === 'ground') break;
      }
      return best;
    };
    const without = closest(0);
    const withAssist = closest(0.6);
    tuning.dive.assistStrength.value = 0.6;
    expect(without).toBeGreaterThan(2.3);
    expect(withAssist).toBeLessThan(2.3);
  });
});
