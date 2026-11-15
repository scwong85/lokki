import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { Interaction, type GagEvent, type InteractionInput } from '../../src/gameplay/interaction';
import { World } from '../../src/world/collision';
import { newFlightState } from '../../src/gull/flight';
import { restY } from '../../src/data/props';
import { PAD, readPad, type PadState } from '../../src/core/gamepad';
import { nearestGull, wardenTarget } from '../../src/gameplay/focus';
import { decodeSnapshot, encodeSnapshot, makeSnapshot, type SnapshotSource } from '../../src/net/snapshot';

const DT = 1 / 60;
const none: InteractionInput = { grab: false, toss: false, poop: false };

beforeAll(async () => {
  await RAPIER.init();
});

describe('two beaks', () => {
  it('each gull carries its own prop, drops only its own, and a breakage clears the right beak', () => {
    const phys = new PhysicsWorld(RAPIER);
    const it2 = new Interaction(phys, new World([]), new THREE.Group());
    const a = newFlightState(0, 0);
    const b = newFlightState(10, 0);
    phys.createGullBody(0.5, 0, 0.5, 0);
    const fish = it2.props.spawn({ type: 'fish', x: 0, y: restY('fish'), z: -1 });
    const bun = it2.props.spawn({ type: 'bun', x: 10, y: restY('bun'), z: -1 });
    const step = (ia: InteractionInput, ib: InteractionInput, t: number): GagEvent[] => [
      ...it2.updateGull(0, a, ia, DT, t),
      ...it2.updateGull(1, b, ib, DT, t),
      ...it2.step(DT, t, a),
    ];
    for (let i = 0; i < 20; i++) step(none, none, i * DT);
    const evs = step({ ...none, grab: true }, { ...none, grab: true }, 1);
    expect(evs.filter((e) => e.type === 'grab').map((e) => (e as { by?: number }).by).sort()).toEqual([0, 1]);
    expect(it2.beak(0).carried).toBe(fish);
    expect(it2.beak(1).carried).toBe(bun);
    expect(it2.carrierOf(bun)).toBe(1);
    expect(it2.carried).toBe(fish); // player 1's beak is still `carried`
    for (let i = 0; i < 40; i++) step(none, none, 1 + i * DT); // grab cooldown
    step(none, { ...none, grab: true }, 2);
    expect(it2.beak(1).carried).toBeNull();
    expect(it2.beak(0).carried).toBe(fish);
    expect(it2.carriedMass(0)).toBe(fish.def.mass);
    expect(it2.carriedMass(1)).toBe(0);
  });
});

describe('gamepad mapping', () => {
  const pad = (axes: number[], pressed: number[] = [], lt = 0): PadState => ({
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: i === PAD.LT ? lt : pressed.includes(i) ? 1 : 0 })),
  });

  it('sticks with a dead zone; up on the left stick is forward; the left trigger brakes', () => {
    const { frame } = readPad(pad([0.05, -1, 0, 0]), [], 0.18, 900);
    expect(frame.stick.x).toBe(0);
    expect(frame.stick.y).toBeCloseTo(1);
    expect(readPad(pad([0, 0, 0, 0], [], 1), [], 0.18, 900).frame.stick.y).toBe(-1);
    expect(readPad(pad([0, 0, 1, 0]), [], 0.18, 900).frame.look.x).toBeCloseTo(900);
  });

  it('A/RB hold flap, RT holds dive; X/Y/B tap grab/toss/poop once per press', () => {
    let r = readPad(pad([0, 0, 0, 0], [PAD.A, PAD.RT, PAD.X]), [], 0.18, 900);
    expect([...r.frame.held].sort()).toEqual(['ShiftLeft', 'Space']);
    expect(r.frame.taps).toEqual(['KeyE']);
    r = readPad(pad([0, 0, 0, 0], [PAD.X]), r.pressed, 0.18, 900);
    expect(r.frame.taps).toEqual([]); // still held: no repeat
    r = readPad(pad([0, 0, 0, 0], [PAD.B, PAD.Y]), r.pressed, 0.18, 900);
    expect(r.frame.taps.sort()).toEqual(['KeyF', 'KeyQ']);
  });
});

describe('who people watch', () => {
  const gulls = [
    { id: 0, x: 10, y: 1, z: 0 },
    { id: 1, x: 3, y: 1, z: 0 },
  ];
  it('the nearest visible gull; hidden gulls are skipped', () => {
    expect(nearestGull({ x: 0, z: 0 }, gulls)?.id).toBe(1);
    expect(nearestGull({ x: 0, z: 0 }, [gulls[0], { ...gulls[1], hidden: true }])?.id).toBe(0);
    expect(nearestGull({ x: 0, z: 0 }, [{ ...gulls[1], hidden: true }])).toBeNull();
  });
  it('the Warden prefers the thief within range, else the nearest', () => {
    const thief = [{ ...gulls[0], suspicious: true }, gulls[1]];
    expect(wardenTarget({ x: 0, z: 0 }, thief, 30)?.id).toBe(0);
    expect(wardenTarget({ x: 0, z: 0 }, thief, 5)?.id).toBe(1);
  });
});

describe('snapshots', () => {
  const src: SnapshotSource = {
    time: 12.34567,
    gulls: [{ id: 0, x: 1.23456, y: 2, z: 3, vx: 0.1, vy: 0, vz: 0, heading: 1.2345678, mode: 'air', carry: 7 }],
    props: Array.from({ length: 60 }, (_, i) => ({ id: i, x: i * 1.111, y: 0.123456, z: -i, qx: 0, qy: 0.7071068, qz: 0, qw: 0.7071068, by: i === 7 ? 0 : null, held: null, broken: i === 3 })),
    npcs: Array.from({ length: 14 }, (_, i) => ({ id: i, x: i, z: -i, heading: 0.5, mode: 'walk', holding: null })),
    heat: 42.25,
    quests: [{ id: 'icecream', status: 'active', timeLeft: 41.27, timed: true, objectives: [{ done: true, count: 1 }, { done: false, count: 0 }] }],
  };

  it('rounds, keeps ids and links, and survives the wire', () => {
    const s = makeSnapshot(src);
    expect(s.gulls[0].p[0]).toBe(1.23);
    expect(s.gulls[0].carry).toBe(7);
    expect(s.props[7].by).toBe(0);
    expect(s.props[3].broken).toBe(true);
    expect(s.props[4].broken).toBeUndefined();
    expect(s.quests[0]).toEqual({ id: 'icecream', status: 'active', t: 41.3, o: [[1, 1], [0, 0]] });
    expect(decodeSnapshot(encodeSnapshot(s))).toEqual(s);
  });

  it('a whole market fits in a few kilobytes (fine at 20 per second)', () => {
    expect(encodeSnapshot(makeSnapshot(src)).length).toBeLessThan(8000);
  });
});

describe('gamepad source', () => {
  it('without a pad, or with an idle pad, it never overrides the touch stick or keys', async () => {
    const { GamepadSource } = await import('../../src/core/gamepad');
    const { Input } = await import('../../src/core/input');
    const input = new Input(null, false);
    const g = globalThis as unknown as { navigator?: { getGamepads?: () => (PadState | null)[] } };
    const saved = g.navigator;
    let pads: (PadState | null)[] = [];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
    try {
      const src = new GamepadSource(input, 0);
      input.setStick(0.4, 0.9); // the touch stick is in use
      src.poll(1 / 60, 0.18, 900);
      expect(input.axes()).toEqual({ x: 0.4, y: 0.9 });
      const idle: PadState = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      pads = [idle];
      src.poll(1 / 60, 0.18, 900);
      expect(input.axes()).toEqual({ x: 0.4, y: 0.9 });
      pads = [{ ...idle, axes: [1, 0, 0, 0] }]; // the pad is used: it drives
      src.poll(1 / 60, 0.18, 900);
      expect(input.axes().x).toBeCloseTo(1);
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: saved, configurable: true });
    }
  });
});
