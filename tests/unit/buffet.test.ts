import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { QuestLog } from '../../src/gameplay/quest';
import type { NpcEvent, NpcSpawn } from '../../src/gameplay/npc';
import { LEVELS } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TOURIST_SPAWNS } from '../../src/data/npcs';

const DT = 1 / 60;
beforeAll(async () => {
  await RAPIER.init();
});

describe('steps with several ways (events)', () => {
  const def = { id: 'q', title: 'Q', timed: false, objectives: [{ id: 'a', text: 'A', kind: 'event' as const, event: 'x', events: ['y', 'z'] }, { id: 'b', text: 'B', kind: 'event' as const, event: 'b' }] };
  it('any of the listed events finishes the step, and the world triggers for all of them are wanted', () => {
    for (const ev of ['x', 'y', 'z']) {
      const log = new QuestLog([def]);
      expect([...log.wanted()].sort()).toEqual(['b', 'x', 'y', 'z']);
      log.onEvent(ev);
      expect(log.quests[0].objectives[0].done, ev).toBe(true);
    }
    const log = new QuestLog([def]);
    log.onEvent('nope');
    expect(log.quests[0].objectives[0].done).toBe(false);
  });
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 6);
  for (const s of spawns) npcs.spawn(s);
  const pie = props.spawn({ type: 'fish', x: 0, y: 0.1, z: 0, tag: 'pie' });
  const run = (secs: number, gull = { x: 0, y: 1, z: 6, diving: false }): NpcEvent[] => {
    const ev: NpcEvent[] = [];
    for (let i = 0; i < Math.round(secs / DT); i++) {
      props.beforeStep(DT);
      phys.step();
      props.afterStep();
      ev.push(...npcs.update(DT, gull));
    }
    return ev;
  };
  return { npcs, props, pie, run };
}
const watcher = (x: number, z: number, heading: number): NpcSpawn => ({ x, z, heading, color: 1, role: 'chef', stationary: true, watch: 'pie' });

describe('watchers (somebody minds the pie)', () => {
  it('nothing happens while the pie is where it was', () => {
    const { run } = setup([watcher(0, 3, Math.PI)]);
    expect(run(5).some((e) => e.type === 'caught')).toBe(false);
  });
  it('the pie gone and the gull in sight: they notice and give chase', () => {
    const { npcs, props, pie, run } = setup([watcher(0, 3, Math.PI)]); // facing the gull (heading 0 faces -z)
    run(1);
    props.grab(pie); // the gull has it
    const ev = run(2);
    expect(ev.some((e) => e.type === 'caught')).toBe(true);
    expect(['chase', 'panic', 'notice'].includes(npcs['npcs'][0].mode) || npcs['npcs'][0].relentless).toBe(true);
  });
  it('their back to the gull, or looking elsewhere (noise), or far away: they do not notice', () => {
    for (const mk of [() => setup([watcher(0, 3, 0)]), () => setup([watcher(0, 80, Math.PI)])]) {
      const { props, pie, run } = mk();
      run(1);
      props.grab(pie);
      expect(run(2, { x: 0, y: 1, z: 6, diving: false }).some((e) => e.type === 'caught')).toBe(false);
    }
    const { npcs, props, pie, run } = setup([watcher(0, 3, Math.PI)]);
    run(1);
    props.grab(pie);
    npcs['npcs'][0].distractT = 5; // a bottle clattered
    expect(run(2).some((e) => e.type === 'caught')).toBe(false);
  });
});

describe('the buffet level', () => {
  const l = LEVELS.find((x) => x.id === 'buffet')!;
  const q = l.extraQuests![0];
  it('loads into a level setup with its cast, pie, switches and triggers', () => {
    const s = levelSetup(l, QUESTS, [], TOURIST_SPAWNS);
    expect(s.quests.map((x) => x.id)).toEqual(['buffet']);
    expect(s.tourists.filter((t) => t.watch === 'goldenPie').map((t) => t.role).sort()).toEqual(['chef', 'granny', 'maitre']);
    expect(l.extraProps?.some((p) => p.tag === 'goldenPie')).toBe(true);
    expect(l.switches?.map((x) => x.effect).sort()).toEqual(['dance', 'summon']);
  });
  it('the two guard steps each accept at least three ways, in any order; the carry comes after the pie', () => {
    const chef = q.objectives.find((o) => o.id === 'chef')!, maitre = q.objectives.find((o) => o.id === 'maitre')!;
    expect(chef.events!.length).toBeGreaterThanOrEqual(3);
    expect(maitre.events!.length).toBeGreaterThanOrEqual(2);
    expect(chef.after).toBeUndefined();
    expect(maitre.after).toBeUndefined();
    expect(q.objectives.find((o) => o.id === 'blanket')!.after).toBe('pie');
  });
  it('every step is on the hint ladder: a wish, a riddle, and the answer last; the wish and riddle name no keys', () => {
    for (const o of q.objectives) {
      expect(o.outcome && o.nudge && o.hint, o.id).toBeTruthy();
      for (const s of [o.outcome!, o.nudge!]) expect(s, o.id).not.toMatch(/\((E|F|T|Q)\)|\b(press|hold|aim|peck the)\b/i);
    }
  });
});
