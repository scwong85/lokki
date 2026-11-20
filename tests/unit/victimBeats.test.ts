import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { reactionPlays, type Reaction } from '../../src/data/reactions';
import { LEVELS } from '../../src/data/levels';
import type { NpcEvent } from '../../src/gameplay/npc';

const DT = 1 / 60;
beforeAll(async () => {
  await RAPIER.init();
});

describe('reactions that escalate', () => {
  it('an `nth` reaction plays on that occurrence only; a plain one the first time; a `repeat` one every time', () => {
    const done = new Set<string>();
    const nth2: Reaction = { on: 'x', nth: 2 }, once: Reaction = { on: 'x' }, rep: Reaction = { on: 'x', repeat: true };
    const plays = (r: Reaction, key: string) => [1, 2, 3].map((c) => reactionPlays(r, key, c, done));
    expect(plays(nth2, 'a')).toEqual([false, true, false]);
    expect(plays(once, 'b')).toEqual([true, false, false]);
    expect(plays(rep, 'c')).toEqual([true, true, true]);
  });
  it('the Chef\'s bell has a first, second and third beat, each with its own line', () => {
    const l = LEVELS.find((x) => x.id === 'buffet')!;
    const says = (n: number) => (l.reactions ?? []).filter((r) => r.on === 'arrived:bell:chef' && r.nth === n && r.say);
    expect([1, 2, 3].map((n) => says(n).length)).toEqual([1, 1, 1]);
  });
});

describe('the discovery beat', () => {
  function setup() {
    const phys = new PhysicsWorld(RAPIER);
    const props = new PropManager(phys, new THREE.Group());
    const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, 4);
    // facing away (heading 0 faces -z; the gull is far behind at +z): he never sees who takes it
    const chef = npcs.spawn({ x: 0, z: -1, heading: 0, color: 1, role: 'chef', stationary: true, post: true, watch: 'pie' });
    const pie = props.spawn({ type: 'pie', x: 0, y: 0.1, z: 0, tag: 'pie' });
    const run = (s: number) => { const ev: NpcEvent[] = []; for (let i = 0; i < s * 60; i++) { props.beforeStep(DT); phys.step(); props.afterStep(); ev.push(...npcs.update(DT, { x: 0, y: 1, z: 40, diving: false })); } return ev; };
    return { props, chef, pie, run };
  }
  it('somebody who never saw the theft still finds out, once, after a moment at the empty spot; no chase', () => {
    const { props, chef, pie, run } = setup();
    run(1);
    props.grab(pie); // taken behind his back
    const ev = run(4);
    expect(ev.filter((e) => e.type === 'discovered')).toHaveLength(1);
    expect(ev.some((e) => e.type === 'caught')).toBe(false);
    expect(chef.discovered).toBe(true);
  });
  it('when the item comes back he can lose it (and find out) again', () => {
    const { props, chef, pie, run } = setup();
    run(1);
    props.grab(pie);
    run(4);
    props.reset(pie);
    run(1);
    expect(chef.discovered).toBe(false);
    props.grab(pie);
    expect(run(4).filter((e) => e.type === 'discovered')).toHaveLength(1);
  });
  it('a distracted watcher does not notice yet', () => {
    const { props, chef, pie, run } = setup();
    run(1);
    props.grab(pie);
    chef.distractT = 10;
    expect(run(3).some((e) => e.type === 'discovered')).toBe(false);
  });
});
