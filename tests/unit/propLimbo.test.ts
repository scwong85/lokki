import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';

beforeAll(async () => {
  await RAPIER.init();
});

describe('a prop pinned in the air with nobody holding it', () => {
  it('falls: a hold that was never released does not leave it floating', () => {
    const phys = new PhysicsWorld(RAPIER);
    const props = new PropManager(phys, new THREE.Group());
    const p = props.spawn({ type: 'scissors', x: 0, y: 1.2, z: 0 });
    props.attach(p, 7); // held by somebody...
    p.heldBy = null; // ...who is gone (no release)
    expect(p.body.isDynamic()).toBe(false);
    for (let i = 0; i < 120; i++) {
      props.beforeStep(1 / 60);
      phys.step();
      props.afterStep();
    }
    expect(p.body.isDynamic()).toBe(true);
    expect(p.cur.p.y).toBeLessThan(0.2);
  });
  it('a prop that somebody really holds stays where the hand is', () => {
    const phys = new PhysicsWorld(RAPIER);
    const props = new PropManager(phys, new THREE.Group());
    const p = props.spawn({ type: 'scissors', x: 0, y: 1.2, z: 0 });
    props.attach(p, 7);
    for (let i = 0; i < 60; i++) {
      props.setHoldTarget(p, { x: 0, y: 1.2, z: 0 });
      props.beforeStep(1 / 60);
      phys.step();
      props.afterStep();
    }
    expect(p.cur.p.y).toBeCloseTo(1.2, 1);
  });
});
