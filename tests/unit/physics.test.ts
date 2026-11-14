import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { Interaction, type GagEvent, type InteractionInput } from '../../src/gameplay/interaction';
import { World, type Box } from '../../src/world/collision';
import { newFlightState } from '../../src/gull/flight';
import { restY } from '../../src/data/props';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const none: InteractionInput = { grab: false, toss: false, poop: false };

beforeAll(async () => {
  await RAPIER.init();
});
beforeEach(() => {
  tuning.wind.strength.value = 0;
});

function setup(boxes: Box[] = []) {
  const phys = new PhysicsWorld(RAPIER);
  const world = new World(boxes);
  const it = new Interaction(phys, world, new THREE.Group());
  const gull = newFlightState(0, 0);
  phys.createGullBody(0.5, 0, 0.5, 0);
  const run = (secs: number, inp: InteractionInput = none): GagEvent[] => {
    const evs: GagEvent[] = [];
    for (let i = 0; i < Math.round(secs / DT); i++) evs.push(...it.update(gull, inp, DT, i * DT));
    return evs;
  };
  return { phys, world, it, gull, run };
}

describe('props and physics', () => {
  it('a dropped prop falls and comes to rest on the ground', () => {
    const { it, run } = setup();
    const p = it.props.spawn({ type: 'crate', x: 5, y: 3, z: 5 });
    run(3);
    expect(p.body.translation().y).toBeCloseTo(0.35, 1);
  });
  it('static colliders stop props (triangle mesh platform at y=5)', () => {
    const { phys, it, run } = setup();
    // a 10x10 platform at y=5 as two triangles
    const v = new Float32Array([-5, 5, -5, 5, 5, -5, 5, 5, 5, -5, 5, 5]);
    phys.addStaticMesh(v, new Uint32Array([0, 2, 1, 0, 3, 2]));
    const p = it.props.spawn({ type: 'crate', x: 20, y: 8, z: 0 });
    const q = it.props.spawn({ type: 'crate', x: 0, y: 8, z: 0 });
    run(3);
    expect(p.body.translation().y).toBeLessThan(1); // fell to the ground
    expect(q.body.translation().y).toBeGreaterThan(5); // landed on the platform
  });
  it('grab, carry with the gull, toss', () => {
    const { it, gull, run } = setup();
    const cap = it.props.spawn({ type: 'cap', x: 0, y: restY('cap'), z: -1 }); // 1 m ahead (heading 0 = -Z)
    run(0.5);
    const grabEvs = run(DT, { ...none, grab: true });
    expect(grabEvs.some((e) => e.type === 'grab')).toBe(true);
    expect(it.carried).toBe(cap);
    gull.z = -10;
    gull.y = 3;
    run(0.5);
    const t = cap.body.translation();
    expect(t.z).toBeCloseTo(-10.85, 0); // in the beak, ahead of the gull
    expect(t.y).toBeCloseTo(3.05, 0);
    // toss: flies forward (-Z) and no longer carried
    run(0.4); // grab cooldown
    const tossEvs = run(DT, { ...none, toss: true });
    expect(tossEvs.some((e) => e.type === 'toss')).toBe(true);
    expect(it.carried).toBeNull();
    run(0.4);
    expect(cap.body.translation().z).toBeLessThan(-12);
  });
  it('heavy props are reported, not lifted', () => {
    const { it, run } = setup();
    it.props.spawn({ type: 'bin', x: 0, y: restY('bin'), z: -1 });
    run(0.3);
    const evs = run(DT, { ...none, grab: true });
    expect(evs.some((e) => e.type === 'heavy')).toBe(true);
    expect(it.carried).toBeNull();
  });
  it('a carried prop makes flapping weaker (flight hook)', () => {
    const { it, run } = setup();
    const fish = it.props.spawn({ type: 'fish', x: 0, y: restY('fish'), z: -1 });
    run(0.3);
    run(DT, { ...none, grab: true });
    expect(it.carriedMass).toBe(fish.def.mass);
  });
  it('a fragile bottle dropped from height shatters; reset revives it', () => {
    const { it, run } = setup();
    const b = it.props.spawn({ type: 'bottle', x: 8, y: 7, z: 8 });
    const evs = run(3);
    expect(evs.some((e) => e.type === 'break')).toBe(true);
    expect(b.broken).toBe(true);
    it.reset();
    expect(b.broken).toBe(false);
    run(1);
    expect(b.body.translation().y).toBeLessThan(2);
  });
  it('a bin shoved by a fast gull moves and clatters', () => {
    const { it, gull, run } = setup();
    const bin = it.props.spawn({ type: 'bin', x: 0, y: restY('bin'), z: -3 });
    run(0.5);
    gull.y = 0.5;
    const evs: GagEvent[] = [];
    for (let i = 0; i < 40; i++) {
      gull.z = -i * 0.5; // 30 m/s straight through the bin
      evs.push(...it.update(gull, none, DT, i * DT));
    }
    expect(Math.abs(bin.body.translation().z + 3)).toBeGreaterThan(0.3);
    expect(evs.some((e) => e.type === 'clatter' || e.type === 'tipped')).toBe(true);
  });
  it('poop splats on the ground (decal) and on a prop (dirty counter)', () => {
    const { it, gull, run } = setup();
    const cap = it.props.spawn({ type: 'cap', x: 0, y: restY('cap'), z: 0 });
    gull.x = 0;
    gull.y = 6;
    gull.z = 0.0;
    expect(run(DT, { ...none, poop: true }).some((e) => e.type === 'poopDrop')).toBe(true);
    expect(run(2).some((e) => e.type === 'poopProp')).toBe(true);
    expect(cap.dirty).toBe(1);
    // second poop from beside the prop lands on the ground
    gull.x = 6;
    run(tuning.poop.cooldown.value);
    run(DT, { ...none, poop: true });
    expect(run(2).some((e) => e.type === 'splat')).toBe(true);
  });
  it('poop has a cooldown', () => {
    const { it, gull, run } = setup();
    gull.y = 10;
    const a = run(DT, { ...none, poop: true });
    const b = run(DT, { ...none, poop: true });
    expect(a.filter((e) => e.type === 'poopDrop')).toHaveLength(1);
    expect(b.filter((e) => e.type === 'poopDrop')).toHaveLength(0);
    expect(it.poopCd).toBeGreaterThan(0);
  });
  it('an item knocked out of the beak is marked lost until it is picked up again', () => {
    const { it, gull, run } = setup();
    const p = it.props.spawn({ type: 'bun', x: 0, y: restY('bun'), z: -1 });
    run(0.3);
    run(DT, { ...none, grab: true });
    expect(it.carried).toBe(p);
    expect(p.lost).toBe(false);
    expect(it.dropCarried(gull)).toBe(p); // sprayed, swatted or netted
    expect(p.lost).toBe(true);
    expect(it.carried).toBeNull();
    // put it back in front of the gull and take it again: no longer lost
    p.ignoreGrab = 0;
    p.body.setTranslation({ x: 0, y: restY('bun'), z: -1 }, true);
    run(0.8);
    run(DT, { ...none, grab: true });
    expect(it.carried).toBe(p);
    expect(p.lost).toBe(false);
  });
});
