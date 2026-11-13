import { beforeEach, describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { tuning } from '../../src/core/tuning';
import { Heat, tierOf } from '../../src/gameplay/heat';
import { CityResponse, ZoneTracker, applyHit, effectiveness, segmentHit } from '../../src/gameplay/deterrents';
import { inSpray, newVendor, stepVendor, vendorPooped } from '../../src/gameplay/vendor';
import { newWarden, stepWarden, umbrellaUp, wardenPooped, type WardenCtx } from '../../src/gameplay/warden';
import { World, type Box } from '../../src/world/collision';
import { newFlightState } from '../../src/gull/flight';

const DT = 1 / 60;
const world = new World();

describe('heat', () => {
  it('tiers follow the thresholds', () => {
    expect(tierOf(0)).toBe(0);
    expect(tierOf(tuning.heat.tier1.value)).toBe(1);
    expect(tierOf(tuning.heat.tier2.value)).toBe(2);
    expect(tierOf(tuning.heat.tier3.value)).toBe(3);
    expect(tierOf(100)).toBe(4);
  });
  it('rises with mischief, reports tier changes, and caps at 100', () => {
    const h = new Heat();
    expect(h.add('snatch')).toEqual({ from: 0, to: 1 }); // 25 heat crosses the first threshold (20)
    expect(h.tier).toBe(tierOf(h.value));
    expect(h.add('snatch')).toEqual({ from: 1, to: 2 }); // 50 > 40
    expect(h.add('clatter')).toBeNull(); // small gain, same tier
    for (let i = 0; i < 10; i++) h.add('snatch');
    expect(h.value).toBe(100);
  });
  it('only falls when nobody sees you, after a delay', () => {
    const h = new Heat();
    h.add('snatch');
    const v = h.value;
    for (let i = 0; i < 300; i++) h.tick(DT, true);
    expect(h.value).toBe(v); // seen: no decay
    for (let i = 0; i < Math.round((tuning.heat.decayDelay.value - 0.1) / DT); i++) h.tick(DT, false);
    expect(h.value).toBe(v); // still in the delay
    for (let i = 0; i < 300; i++) h.tick(DT, false);
    expect(h.value).toBeLessThan(v);
  });
  it('new mischief resets the out-of-sight delay; relieve lowers it', () => {
    const h = new Heat();
    h.add('snatch');
    h.add('break');
    const v = h.value;
    h.relieve(10);
    expect(h.value).toBe(v - 10);
    h.reset();
    expect(h.value).toBe(0);
  });
});

describe('city response and learning', () => {
  it('deploys in order as the tier rises', () => {
    const r = new CityResponse();
    expect(r.onTier(1)).toEqual(['vendors']);
    expect(r.onTier(3)).toEqual(['lines', 'nets']);
    expect(r.onTier(4)).toEqual(['warden']);
    expect(r.onTier(4)).toEqual([]);
  });
  it('effectiveness falls as the gulls learn, then drops to the learned factor', () => {
    expect(effectiveness(0, 4)).toBe(1);
    expect(effectiveness(2, 4)).toBeLessThan(1);
    expect(effectiveness(2, 4)).toBeGreaterThan(effectiveness(3, 4));
    expect(effectiveness(4, 4)).toBe(tuning.deter.learnedFactor.value);
  });
  it('enough successful bypasses make a deterrent learned and bring in the next one', () => {
    const r = new CityResponse();
    r.deploy('nets');
    const n = tuning.deter.learnNets.value;
    let last = { learnedNow: false, deployed: null as string | null };
    for (let i = 0; i < n; i++) last = r.onBypass('nets');
    expect(last.learnedNow).toBe(true);
    expect(last.deployed).toBe('warden');
    expect(r.deployed.has('warden')).toBe(true);
    expect(r.strength('nets')).toBe(tuning.deter.learnedFactor.value);
  });
  it('bypassing something that is not deployed teaches nothing', () => {
    const r = new CityResponse();
    expect(r.onBypass('lines')).toEqual({ learnedNow: false, deployed: null });
    expect(r.learned.lines).toBe(0);
  });
});

describe('zone tracker (clean visits count as bypasses)', () => {
  const zone = { minX: 0, maxX: 10, minZ: 0, maxZ: 10, maxY: 3 };
  it('a clean visit ends in a bypass; a visit with a hit does not', () => {
    const z = new ZoneTracker(zone);
    expect(z.update(-5, 1, 5)).toBeNull();
    expect(z.update(5, 1, 5)).toBeNull();
    expect(z.update(15, 1, 5)).toBe('bypass');
    z.update(5, 1, 5);
    z.markHit();
    expect(z.update(15, 1, 5)).toBeNull();
  });
  it('flying above the zone is not a visit', () => {
    const z = new ZoneTracker(zone);
    z.update(-5, 8, 5);
    z.update(5, 8, 5);
    expect(z.update(15, 8, 5)).toBeNull();
  });
});

describe('segment hits and the effect on the gull', () => {
  const line = { a: [-10, 3.4, 0] as [number, number, number], b: [10, 3.4, 0] as [number, number, number] };
  it('touching a line pushes the gull away from it; missing it does nothing', () => {
    expect(segmentHit({ x: 0, y: 3.4, z: 0.3 }, 0.55, line)).toMatchObject({ dz: 1 });
    expect(segmentHit({ x: 0, y: 6, z: 0 }, 0.55, line)).toBeNull();
    expect(segmentHit({ x: 20, y: 3.4, z: 0 }, 0.55, line)).toBeNull();
  });
  it('a hit stuns, drains stamina, pushes and ends a dive', () => {
    const s = newFlightState();
    s.mode = 'dive';
    s.stamina = 80;
    const dropped = applyHit(s, { kind: 'swat', dx: 1, dz: 0, strength: 1 });
    expect(dropped).toBe(true);
    expect(s.stunT).toBeCloseTo(tuning.deter.swatStun.value);
    expect(s.stamina).toBeCloseTo(80 - tuning.deter.swatStamina.value);
    expect(s.vx).toBeGreaterThan(5);
    expect(s.mode).toBe('air');
  });
  it('a fully learned deterrent barely works', () => {
    const s = newFlightState();
    expect(applyHit(s, { kind: 'net', dx: 0, dz: 0, strength: 0.1 })).toBe(false);
    expect(s.stunT).toBe(0);
    expect(applyHit(s, { kind: 'net', dx: 0, dz: 0, strength: tuning.deter.learnedFactor.value })).toBe(true);
    expect(s.stunT).toBeLessThan(tuning.deter.netStun.value * 0.5);
  });
});

describe('vendor with a spray bottle', () => {
  // vendor at the origin facing +Z (heading pi) toward the gull standing 4 m away
  const gullAt = (x: number, z: number, y = 1) => ({ x, y, z, diving: false });
  const run = (v: ReturnType<typeof newVendor>, g: { x: number; y: number; z: number; diving: boolean }, secs: number, alert = true) => {
    const ev = [];
    for (let i = 0; i < Math.round(secs / DT); i++) ev.push(...stepVendor(v, g, alert, DT, world));
    return ev;
  };
  beforeEach(() => {
    tuning.deter.sprayWindup.value = 0.6;
  });
  it('stays calm when the city is calm and the gull is far away', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    run(v, gullAt(0, 10), 3, false);
    expect(v.mode).toBe('idle');
  });
  it('aims, fires after the windup, and hits a gull that stays put', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    const ev = run(v, gullAt(0, 4), 3);
    const spray = ev.find((e) => e.type === 'spray');
    expect(spray).toMatchObject({ type: 'spray', hit: true });
  });
  it('a gull that moves out of the way during the windup dodges it', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    let ev = run(v, gullAt(0, 4), 0.2); // vendor notices and starts the windup
    // gull darts sideways before the shot
    ev = [...ev, ...run(v, gullAt(6, 4), 2)];
    expect(ev.some((e) => e.type === 'dodged')).toBe(true);
    expect(ev.some((e) => e.type === 'spray' && e.hit)).toBe(false);
  });
  it('the gull flying high is out of reach', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    expect(inSpray(v, { x: 0, y: 8, z: 3 }, 0, 3)).toBe(false);
    expect(inSpray(v, { x: 0, y: 1, z: 3 }, 0, 3)).toBe(true);
  });
  it('pooped on: out of action, no spray for a few seconds', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    vendorPooped(v);
    const ev = run(v, gullAt(0, 4), 3);
    expect(ev.some((e) => e.type === 'spray')).toBe(false);
  });
});

describe('the Gull Warden', () => {
  const patrol: [number, number][] = [[-20, 0], [20, 0]];
  const ctx = (w: World = world): WardenCtx => ({ world: w, walkable: () => true, patrol, rng: createRng(1) });
  const far = { x: 500, y: 5, z: 500, diving: false };
  const run = (w: ReturnType<typeof newWarden>, g: typeof far, secs: number, noises: { x: number; z: number; loud: number }[] = [], c = ctx()) => {
    const ev = [];
    for (let i = 0; i < Math.round(secs / DT); i++) ev.push(...stepWarden(w, g, i === 0 ? noises : [], DT, c));
    return ev;
  };
  it('patrols between waypoints when he sees nothing', () => {
    const w = newWarden(-20, 0);
    run(w, far, 20);
    expect(w.mode).toBe('patrol');
    expect(w.x).toBeGreaterThan(-20 + 5);
  });
  it('sees the gull, hunts it, and swats when it is close and low', () => {
    const w = newWarden(0, 0);
    w.heading = Math.PI; // facing +Z
    const ev = run(w, { x: 0, y: 1, z: 8, diving: false }, 8);
    expect(ev.some((e) => e.type === 'noticed')).toBe(true);
    expect(ev.some((e) => e.type === 'swat')).toBe(true);
  });
  it('a gull that is flying high is not swatted', () => {
    const w = newWarden(0, 0);
    w.heading = Math.PI;
    const ev = run(w, { x: 0, y: 6, z: 3, diving: false }, 6);
    expect(ev.some((e) => e.type === 'swat')).toBe(false);
  });
  it('the umbrella covers his head only while he is paying attention', () => {
    const w = newWarden(0, 0);
    expect(umbrellaUp(w)).toBe(true);
    run(w, far, 0.1, [{ x: 20, z: 0, loud: 1 }]); // a clang
    expect(umbrellaUp(w)).toBe(false); // distracted: head exposed
    run(w, far, tuning.npc.distractTime.value + 0.5);
    expect(umbrellaUp(w)).toBe(true);
    wardenPooped(w);
    expect(umbrellaUp(w)).toBe(false);
  });
  it('pooped on: sulks for a while, then goes back to patrolling', () => {
    const w = newWarden(0, 0);
    wardenPooped(w);
    expect(w.mode).toBe('recover');
    run(w, far, tuning.deter.wardenSulk.value + 0.5);
    expect(w.mode).toBe('patrol');
  });
  it('walls hide the gull from him', () => {
    const wall: Box = { min: [-5, 0, 3], max: [5, 10, 4], kind: 'building', color: 0 };
    const w = newWarden(0, 0);
    w.heading = Math.PI;
    const ev = run(w, { x: 0, y: 1, z: 8, diving: false }, 3, [], ctx(new World([wall])));
    expect(ev.some((e) => e.type === 'noticed')).toBe(false);
  });
});
