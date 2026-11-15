import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import type { NpcEvent, NpcSpawn } from '../../src/gameplay/npc';
import { restY } from '../../src/data/props';

const DT = 1 / 60;
const far = { x: 500, y: 20, z: 500, diving: false };

beforeAll(async () => {
  await RAPIER.init();
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 5);
  for (const s of spawns) npcs.spawn(s);
  const run = (secs: number): NpcEvent[] => {
    const ev: NpcEvent[] = [];
    for (let i = 0; i < Math.round(secs / DT); i++) {
      props.beforeStep(DT);
      phys.step();
      props.afterStep();
      ev.push(...npcs.update(DT, far));
    }
    return ev;
  };
  return { props, npcs, run };
}

describe('NpcManager: items, roles and goals', () => {
  it('a stationary child picks up a toy lying nearby, cheers and keeps holding it', () => {
    const { props, npcs, run } = setup([{ x: 0, z: 0, heading: 0, role: 'child', stationary: true, wants: ['toy'], color: 0 }]);
    props.spawn({ type: 'toy', x: 0.8, y: restY('toy'), z: 0 });
    const ev = run(6);
    expect(ev.some((e) => e.type === 'tookItem' && e.propType === 'toy')).toBe(true);
    expect(ev.some((e) => e.type === 'cheer')).toBe(true);
    const child = npcs.npcs[0];
    expect(child.holdType).toBe('toy');
    expect(Math.hypot(child.x, child.z)).toBeLessThan(0.5); // stationary: it did not wander off
  });
  it('a stationary child ignores things it does not want', () => {
    const { props, npcs, run } = setup([{ x: 0, z: 0, heading: 0, role: 'child', stationary: true, wants: ['toy'], color: 0 }]);
    props.spawn({ type: 'bun', x: 0.8, y: restY('bun'), z: 0 });
    run(4);
    expect(npcs.npcs[0].holding).toBeNull();
  });
  it('a sweets lover eats a salmiakki bag lying near her, then says yuck; the bag is gone', () => {
    const { props, npcs, run } = setup([{ x: 0, z: 0, heading: 0, wants: ['candy', 'salmiakki'], color: 0 }]);
    const bag = props.spawn({ type: 'salmiakki', x: 0.7, y: restY('salmiakki'), z: 0 });
    const ev = run(4);
    expect(ev.some((e) => e.type === 'tookItem' && e.propType === 'salmiakki')).toBe(true);
    expect(ev.some((e) => e.type === 'yuck')).toBe(true);
    expect(bag.broken).toBe(true);
    expect(npcs.npcs[0].holding).toBeNull();
  });
  it('sendRole sends a couple in different directions and each reports arrival', () => {
    const { npcs, run } = setup([
      { x: -2, z: 0, heading: 0, role: 'dater', stationary: true, color: 0 },
      { x: 2, z: 0, heading: 0, role: 'dater', stationary: true, color: 0 },
      { x: 10, z: 10, heading: 0, role: 'child', stationary: true, color: 0 },
    ]);
    npcs.sendRole('dater', [{ x: 12, z: 0, name: 'stormoff' }, { x: -12, z: 0, name: 'stormoff' }]);
    const ev = run(30);
    const arrived = ev.filter((e) => e.type === 'arrived');
    expect(arrived).toHaveLength(2);
    expect(Math.hypot(npcs.npcs[2].x - 10, npcs.npcs[2].z - 10)).toBeLessThan(0.1); // the child stayed
  });
  it('held items are dive-assist targets, one per tourist holding something', () => {
    const { npcs } = setup([
      { x: 0, z: 0, heading: 0, holds: 'icecream', color: 0 },
      { x: 5, z: 0, heading: 0, color: 0 },
      { x: 9, z: 0, heading: 0, holds: 'map', color: 0 },
    ]);
    const t = npcs.handTargets();
    expect(t).toHaveLength(2);
    expect(t.every((x) => x.cooldown === 0 && x.y > 0.5 && x.y < 2)).toBe(true);
  });
  it('pooping on someone reports their role', () => {
    const { npcs } = setup([{ x: 0, z: 0, heading: 0, role: 'dater', color: 0 }]);
    npcs.poopSpheres();
    expect(npcs.onPooped(0)).toBe('dater');
  });

  it('a tourist takes their own stolen item back when it is dropped in front of them', () => {
    const { props, npcs, run } = setup([{ x: 0, z: 0, heading: 0, holds: 'map', color: 0 }]);
    const map = props.byId(npcs.npcs[0].holding!)!;
    // the gull snatches it (as Interaction does) ...
    npcs.onSnatched(map.id);
    props.grab(map);
    expect(npcs.npcs[0].holding).toBeNull();
    // ... and later drops it 1.2 m in front of the owner, once the owner has calmed down
    props.release(map, { x: 0, y: 0, z: 0 });
    map.body.setTranslation({ x: 0.5, y: 0.3, z: -1.0 }, true);
    const ev = run(10);
    expect(ev.some((e) => e.type === 'reclaimed' && e.propType === 'map')).toBe(true);
    expect(npcs.npcs[0].holding).toBe(map.id);
  });
  it('they do not take back something that is far away (the map in the sea)', () => {
    const { props, npcs, run } = setup([{ x: 0, z: 0, heading: 0, holds: 'map', color: 0 }]);
    const map = props.byId(npcs.npcs[0].holding!)!;
    npcs.onSnatched(map.id);
    props.grab(map);
    props.release(map, { x: 0, y: 0, z: 0 });
    map.body.setTranslation({ x: 30, y: 0.3, z: 30 }, true);
    expect(run(8).some((e) => e.type === 'reclaimed')).toBe(false);
  });
});

describe('NpcManager: the Clean Freak and the selfie tourist', () => {
  const freak: NpcSpawn = { x: 0, z: 0, heading: 0, holds: 'fish', role: 'cleaner', stationary: true, signAt: { x: 3, z: 0 }, color: 0 };

  it('a splatted sign sends him scrubbing (distracted, so his fish is open); more splats add time; robbing him is reported', () => {
    const { npcs, props, run } = setup([freak]);
    const n = npcs.npcs[0];
    expect(npcs.signSplatted()).toBe(true);
    const ev = run(DT);
    expect(ev.some((e) => e.type === 'signSplat' && e.splats === 1)).toBe(true);
    const first = n.cleanT;
    expect(first).toBeGreaterThan(4);
    expect(n.distractT).toBeGreaterThan(0);
    npcs.signSplatted();
    expect(n.cleanT).toBeGreaterThan(first); // frantic: longer
    npcs.signSplatted();
    expect(run(DT).some((e) => e.type === 'signSplat' && e.splats === 3)).toBe(true);
    // robbing him while he scrubs
    const fish = props.byId(n.holding!)!;
    npcs.onSnatched(fish.id);
    expect(run(DT).some((e) => e.type === 'cleanerRobbed')).toBe(true);
  });

  it('he calms down after the scrubbing and the splat count resets', () => {
    const { npcs, run } = setup([freak]);
    const n = npcs.npcs[0];
    npcs.signSplatted();
    run(20);
    expect(n.cleanT).toBe(0);
    expect(n.cleanSplats).toBe(0);
    npcs.signSplatted();
    expect(run(DT).some((e) => e.type === 'signSplat' && e.splats === 1)).toBe(true);
  });

  it('a selfie tourist reports the shot, and whether a gull was in the frame', () => {
    const spawn: NpcSpawn = { x: 0, z: 0, heading: Math.PI, ice: true, role: 'selfie', stationary: true, color: 0 };
    const near = { x: 0, y: 1, z: 3, diving: false };
    const inFrameClicks = (gull: typeof near): boolean[] => {
      const { npcs } = setup([spawn]);
      const out: boolean[] = [];
      for (let i = 0; i < 60 * 25; i++) for (const e of npcs.update(DT, gull)) if (e.type === 'selfieClick') out.push(e.inFrame);
      return out;
    };
    expect(inFrameClicks(near).length).toBeGreaterThanOrEqual(2);
    expect(inFrameClicks(near).every(Boolean)).toBe(true);
    expect(inFrameClicks(far).some(Boolean)).toBe(false);
  });
});
