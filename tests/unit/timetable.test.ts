import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { Timetable } from '../../src/gameplay/timetable';
import { LEVELS } from '../../src/data/levels';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
beforeAll(async () => {
  await RAPIER.init();
});

describe('timetable', () => {
  const run = (t: Timetable, secs: number) => {
    const out: string[] = [];
    for (let i = 0; i < secs * 60; i++) for (const e of t.update(DT)) out.push(`${Math.round(i / 60)}:${e.kind}:${e.phase}`);
    return out;
  };
  it('is the same day every time for a seed, and different for another', () => {
    expect(run(new Timetable(['ferry', 'rain', 'gust'], 3), 600)).toEqual(run(new Timetable(['ferry', 'rain', 'gust'], 3), 600));
    expect(run(new Timetable(['ferry', 'rain', 'gust'], 3), 600)).not.toEqual(run(new Timetable(['ferry', 'rain', 'gust'], 4), 600));
  });
  it('only runs what the level asks for; ferries come in, showers start and end', () => {
    const ev = run(new Timetable(['ferry', 'rain'], 1), 900);
    expect(ev.some((e) => e.includes('gust'))).toBe(false);
    expect(ev.filter((e) => e.endsWith('ferry:start')).length).toBeGreaterThanOrEqual(3);
    const starts = ev.filter((e) => e.endsWith('rain:start')).length;
    const ends = ev.filter((e) => e.endsWith('rain:end')).length;
    expect(starts).toBeGreaterThanOrEqual(2);
    expect(Math.abs(starts - ends)).toBeLessThanOrEqual(1);
  });
  it('rain is active between its start and its end', () => {
    const t = new Timetable(['rain'], 1);
    let sawActive = false, sawIdle = false;
    for (let i = 0; i < 900 * 60; i++) {
      t.update(DT);
      if (t.active('rain')) sawActive = true;
      else if (sawActive) sawIdle = true;
    }
    expect(sawActive && sawIdle).toBe(true);
    expect(tuning.timetable.rainSeconds.value).toBeGreaterThan(0);
  });
  it('levels opt in; puzzle stages that depend on tight placement do not get gusts', () => {
    expect(LEVELS.find((l) => l.id === 'sandbox')!.timetable).toEqual(['ferry', 'rain', 'gust']);
    expect(LEVELS.find((l) => l.id === 'a1s1')!.timetable).toEqual(['ferry']);
    expect(LEVELS.filter((l) => l.arc !== undefined && l.timetable?.includes('gust'))).toEqual([]);
  });
});

function setup() {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 3);
  const run = (secs: number) => { for (let i = 0; i < secs * 60; i++) { props.beforeStep(DT); phys.step(); props.afterStep(); npcs.update(DT, { x: 500, y: 20, z: 500, diving: false }); } };
  return { npcs, run };
}

describe('ferry crowd and gossip', () => {
  it('a ferry sends passengers walking into the square; the next ferry reuses the same people up to the cap', () => {
    const { npcs, run } = setup();
    npcs.ferryCrowd({ x: 0, z: 0 }, { x: 0, z: 30 }, 6, 8, () => 1);
    run(40);
    const pass = () => npcs['npcs'].filter((n) => n.role === 'passenger');
    expect(pass()).toHaveLength(6);
    expect(pass().every((n) => n.z > 12)).toBe(true);
    npcs.ferryCrowd({ x: 0, z: 0 }, { x: 0, z: 30 }, 6, 8, () => 1);
    expect(pass().length).toBeLessThanOrEqual(8);
    expect(pass().some((n) => n.z < 5)).toBe(true);
  });
  it('people near a panic become wary (and the panicker does not)', () => {
    const { npcs, run } = setup();
    const a = npcs.spawn({ x: 0, z: 0, color: 1, role: 'a', stationary: true });
    const b = npcs.spawn({ x: 5, z: 0, color: 1, role: 'b', stationary: true });
    const far = npcs.spawn({ x: 60, z: 0, color: 1, role: 'c', stationary: true });
    run(1);
    a.mode = 'panic';
    run(0.1);
    expect(b.wary).toBeGreaterThan(0);
    expect(far.wary).toBe(0);
    expect(a.wary).toBe(0);
  });
});
