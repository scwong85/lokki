import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import type { NpcEvent } from '../../src/gameplay/npc';
import { LEVELS } from '../../src/data/levels';

beforeAll(async () => {
  await RAPIER.init();
});

function setup(chefHeading: number) {
  const phys = new PhysicsWorld(RAPIER);
  const props = new PropManager(phys, new THREE.Group());
  const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, 5);
  const chef = npcs.spawn({ x: 0, z: 0, heading: chefHeading, color: 1, role: 'chef', stationary: true, post: true, watch: 'pie' });
  const granny = npcs.spawn({ x: 0, z: 12, heading: 0, color: 1, role: 'granny', stationary: true, wants: ['pie'] });
  const pie = props.spawn({ type: 'pie', x: 0, y: 0.1, z: -1, tag: 'pie' });
  const run = (s: number) => { const ev: NpcEvent[] = []; for (let i = 0; i < s * 60; i++) { props.beforeStep(1 / 60); phys.step(); props.afterStep(); ev.push(...npcs.update(1 / 60, { x: 0, y: 30, z: -60, diving: false })); } return ev; };
  return { npcs, props, chef, granny, pie, run };
}

describe('neighbours: a watcher sees their item in somebody else\'s hands', () => {
  it('the Chef, facing Granny, sees her with his pie and marches over (once per culprit)', () => {
    const { npcs, props, chef, granny, pie, run } = setup(Math.PI); // heading pi faces +z, towards Granny
    run(0.5);
    props.release(pie, { x: 0, y: 0, z: 0 });
    pie.body.setTranslation({ x: 0, y: 0.3, z: 11 }, true); // the pie lands by Granny, she picks it up
    const ev = run(1.5);
    const saw = ev.filter((e) => e.type === 'sawWith');
    expect(saw).toHaveLength(1);
    expect(saw[0].type === 'sawWith' && saw[0].other.id).toBe(granny.id);
    npcs.sendTo(chef, granny.x, granny.z, 'confront');
    expect(chef.goal?.name).toBe('confront');
    expect(Math.hypot((chef.goal?.x ?? 0) - granny.x, (chef.goal?.z ?? 0) - granny.z)).toBeGreaterThan(1); // stops in front of her
  });
  it('with his back to her he does not see it', () => {
    const { props, pie, run } = setup(0);
    run(0.5);
    props.release(pie, { x: 0, y: 0, z: 0 });
    pie.body.setTranslation({ x: 0, y: 0.3, z: 11 }, true);
    expect(run(1.5).some((e) => e.type === 'sawWith')).toBe(false);
  });
});

describe('hidden to-dos half-reveal near their spot', () => {
  it('every trial puzzle\'s hidden to-do has a reveal spot and a half title', () => {
    for (const l of LEVELS.filter((x) => x.series === 'Puzzles (new)')) {
      const hidden = (l.extraQuests ?? []).filter((q) => (l.secret ?? []).includes(q.id));
      expect(hidden.length, l.id).toBeGreaterThan(0);
      for (const q of hidden) {
        expect(q.reveal?.text, `${l.id}/${q.id}`).toBeTruthy();
        expect(q.reveal!.r).toBeGreaterThan(2);
      }
    }
  });
});
