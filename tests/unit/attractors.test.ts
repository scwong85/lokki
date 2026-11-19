import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { canBeLured, gatherSlot, newNpc, type NpcEvent, type NpcSpawn } from '../../src/gameplay/npc';
import { PROPS } from '../../src/data/props';
import { tuning } from '../../src/core/tuning';
import { LEVELS } from '../../src/data/levels';

const DT = 1 / 60;
const far = { x: 900, y: 20, z: 900, diving: false };
beforeAll(async () => {
  await RAPIER.init();
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 9);
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
  return { npcs, run };
}
const at = (x: number, z: number, extra: Partial<NpcSpawn> = {}): NpcSpawn => ({ x, z, heading: 0, color: 1, role: 'stroller', ...extra });

describe('attractors', () => {
  it('only free people can be lured: not the stationary cast, but a roamer yes', () => {
    expect(canBeLured(newNpc(1, at(0, 0)))).toBe(true);
    expect(canBeLured(newNpc(2, at(0, 0, { stationary: true })))).toBe(false);
    expect(canBeLured(newNpc(3, at(0, 0, { stationary: true, roam: 3 })))).toBe(true);
  });
  it('gather slots ring the source without piling up', () => {
    const a = gatherSlot(1, 10, 10), b = gatherSlot(2, 10, 10);
    expect(Math.hypot(a.x - 10, a.z - 10)).toBeGreaterThan(1.5);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.5);
  });
  it('music draws free people from afar and they dance; stationary puzzle people stay', () => {
    const { npcs, run } = setup([at(20, 0), at(-18, 6), at(0, 22), at(2, 2, { stationary: true }), at(80, 0)]);
    npcs.playMusic(0, 0, 40, 30, 4.5);
    const ev = run(30);
    const free = npcs['npcs'].slice(0, 3);
    for (const n of free) expect(Math.hypot(n.x, n.z)).toBeLessThan(5);
    expect(free.filter((n) => n.mode === 'dance').length).toBeGreaterThanOrEqual(2);
    const still = npcs['npcs'][3];
    expect(still.mode === 'dance' || Math.hypot(still.x - 2, still.z - 2) < 3).toBe(true);
    expect(Math.hypot(npcs['npcs'][4].x - 80, npcs['npcs'][4].z)).toBeLessThan(40); // out of range: not drawn in
    expect(Math.max(0, ...ev.filter((e): e is Extract<NpcEvent, { type: 'dancing' }> => e.type === 'dancing').map((e) => e.count))).toBeGreaterThanOrEqual(3);
  });
  it('somebody shielding an ice cream (watching the gull) is drawn in too, and dances', () => {
    const { npcs, run } = setup([at(12, 0, { ice: true })]);
    const n = npcs['npcs'][0];
    n.mode = 'shield';
    n.shieldFrom = 0;
    npcs.playMusic(0, 0, 60, 30, 4.5);
    run(30);
    expect(Math.hypot(n.x, n.z)).toBeLessThan(6);
    expect(n.mode).toBe('dance');
  });
  it('the crowd follows a moving source and drifts off when the music ends', () => {
    const { npcs, run } = setup([at(5, 0), at(-5, 3)]);
    npcs.playMusic(0, 0, 10, 60, 4.5);
    run(12);
    npcs.playMusic(20, 0, 40, 60, 4.5);
    run(25);
    for (const n of npcs['npcs']) expect(Math.hypot(n.x - 20, n.z)).toBeLessThan(6);
    run(30);
    expect(npcs.musicPlaying).toBe(false);
  });
  it('the boom box needs Fat bird to lift (peck otherwise) and the party level uses it', () => {
    expect(PROPS.boombox.mass).toBeGreaterThan(tuning.interaction.carryMax.value);
    expect(PROPS.boombox.mass).toBeLessThanOrEqual(5);
    const lvl = LEVELS.find((l) => l.id === 'block-party')!;
    expect(lvl.extraProps?.some((p) => p.type === 'boombox')).toBe(true);
  });
});
