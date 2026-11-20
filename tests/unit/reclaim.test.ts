import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';

const DT = 1 / 60;
beforeAll(async () => {
  await RAPIER.init();
});

function setup() {
  const phys = new PhysicsWorld(RAPIER);
  const props = new PropManager(phys, new THREE.Group());
  const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, 2);
  const mayor = npcs.spawn({ x: 0, z: 0, heading: 0, color: 1, role: 'mayor', stationary: true, post: true, holds: 'scissors', holdTag: 'scissors' });
  const scissors = props.props.find((p) => p.tag === 'scissors')!;
  const run = (s: number) => { for (let i = 0; i < s * 60; i++) { props.beforeStep(DT); phys.step(); props.afterStep(); npcs.update(DT, { x: 900, y: 20, z: 900, diving: false }); } };
  return { props, npcs, mayor, scissors, run };
}

describe('somebody who keeps their place takes their own item back', () => {
  it('scissors a gull carried off and put down 5 m away stay there (no jumping back into his hand)', () => {
    const { props, mayor, scissors, run } = setup();
    mayor.holding = null;
    props.grab(scissors); // the gull has them
    props.release(scissors, { x: 0, y: 0, z: 0 });
    scissors.body.setTranslation({ x: 5, y: 0.3, z: 0 }, true);
    run(4);
    expect(scissors.heldBy).toBeNull();
    expect(Math.hypot(scissors.cur.p.x - 5, scissors.cur.p.z)).toBeLessThan(1);
  });
  it('but put down at his feet, they are his again', () => {
    const { props, mayor, scissors, run } = setup();
    mayor.holding = null;
    props.grab(scissors);
    props.release(scissors, { x: 0, y: 0, z: 0 });
    scissors.body.setTranslation({ x: 1, y: 0.3, z: 0 }, true);
    run(4);
    expect(scissors.heldBy).toBe(mayor.id);
  });
});

describe('somebody who keeps their place can still go and buy a treat', () => {
  it('an angry Mayor with a craving walks to the kiosk and buys (his post no longer pulls him back)', () => {
    const phys = new PhysicsWorld(RAPIER);
    const props = new PropManager(phys, new THREE.Group());
    const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, 2);
    npcs.stations = [{ id: 'kiosk', x: 0, z: -6, r: 9, sells: 'icecream', goods: { dz: 0 } }];
    props.spawn({ type: 'icecream', x: 0, y: 0.2, z: -6.5 });
    const m = npcs.spawn({ x: 0, z: 0, heading: 0, color: 1, role: 'mayor', stationary: true, post: true, craves: 'icecream' });
    m.mood = 'angry';
    const ev: string[] = [];
    for (let i = 0; i < 60 * 20; i++) { props.beforeStep(DT); phys.step(); props.afterStep(); for (const e of npcs.update(DT, { x: 900, y: 20, z: 900, diving: false })) ev.push(e.type); }
    expect(ev).toContain('bought');
    expect(m.holdType).toBe('icecream');
  });
});
