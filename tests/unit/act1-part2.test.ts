import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import type { NpcEvent, NpcSpawn } from '../../src/gameplay/npc';
import { LEVELS, levelById } from '../../src/data/levels';
import { levelSetup, levelUnlocked } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { skillById } from '../../src/data/skills';
import { stepWarden, newWarden, umbrellaUp } from '../../src/gameplay/warden';
import { TriggerSystem } from '../../src/gameplay/triggers';
import { createRng } from '../../src/core/rng';

const DT = 1 / 60;
beforeAll(async () => {
  await RAPIER.init();
});

function setup(spawns: NpcSpawn[]) {
  const phys = new PhysicsWorld(RAPIER);
  const group = new THREE.Group();
  const props = new PropManager(phys, group);
  const npcs = new NpcManager(new World(), props, group, () => true, 5);
  for (const s of spawns) npcs.spawn(s);
  return { props, npcs };
}

describe('spray and owl', () => {
  it('a vendor spray soaks everyone in its cone: they drop what they hold and run; others are left alone', () => {
    const { props, npcs } = setup([
      { x: 0, z: 2, heading: 0, holds: 'fish', holdTag: 'richLunch', role: 'rich', color: 0 },
      { x: 9, z: 2, heading: 0, ice: true, color: 0 }, // far to the side
    ]);
    const lunch = props.props.find((p) => p.tag === 'richLunch')!;
    expect(lunch.heldBy).not.toBeNull();
    const soaked = npcs.soakCone(0, 0, 0, 4); // the vendor at the origin aims along +z
    expect(soaked.map((n) => n.role)).toEqual(['rich']);
    expect(npcs.npcs[0].mode).toBe('panic');
    expect(npcs.npcs[0].holding).toBeNull();
    expect(lunch.heldBy).toBeNull(); // it fell to the ground: free to grab
    expect(npcs.npcs[1].mode).not.toBe('panic');
    const ev: NpcEvent[] = [];
    ev.push(...npcs.update(DT, { x: 500, y: 20, z: 500, diving: false }));
    expect(ev.some((e) => e.type === 'soaked' && e.npc.role === 'rich')).toBe(true);
  });
  it('the plastic owl frightens calm people near it (and says whether it is in the beak), not far ones', () => {
    const { props, npcs } = setup([
      { x: 2, z: 0, heading: 0, holds: 'bun', holdTag: 'grannyBread', role: 'granny', stationary: true, color: 0 },
      { x: 30, z: 0, heading: 0, ice: true, color: 0 },
    ]);
    const scared = npcs.scareNear(0, 0, 6, true);
    expect(scared.length).toBe(1);
    expect(scared[0].role).toBe('granny');
    expect(scared[0].holding).toBeNull();
    expect(props.props.find((p) => p.tag === 'grannyBread')!.heldBy).toBeNull();
    const ev = npcs.update(DT, { x: 500, y: 20, z: 500, diving: false });
    expect(ev.some((e) => e.type === 'scared' && e.carried)).toBe(true);
    expect(npcs.scareNear(0, 0, 6, false).length).toBe(0); // already running: not scared again
  });
});

describe('the Warden at lunch', () => {
  const ctxBase = { world: new World(), walkable: () => true, patrol: [[0, 0], [10, 0]] as [number, number][], rng: createRng(1) };
  const far = { x: 500, y: 5, z: 500, diving: false };
  it('goes to his bench, sits with the umbrella down, and goes back to his rounds when lunch is over', () => {
    const w = newWarden(-30, -10);
    const lunch = { x: -20, z: -10 };
    for (let i = 0; i < 60 * 20; i++) stepWarden(w, far, [], DT, { ...ctxBase, lunch });
    expect(w.mode).toBe('lunch');
    expect(Math.hypot(w.x - lunch.x, w.z - lunch.z)).toBeLessThan(1);
    expect(umbrellaUp(w)).toBe(false); // exposed: the window to poop him
    for (let i = 0; i < 60; i++) stepWarden(w, far, [], DT, { ...ctxBase, lunch: null });
    expect(w.mode).toBe('patrol');
  });
  it('only looks up for a gull that comes close', () => {
    const w = newWarden(-20, -10);
    const lunch = { x: -20, z: -10 };
    for (let i = 0; i < 60; i++) stepWarden(w, far, [], DT, { ...ctxBase, lunch });
    const nearby = { x: -16, y: 1.5, z: -10, diving: false }; // 4 m away, in front
    w.heading = Math.atan2(-(nearby.x - w.x), -(nearby.z - w.z));
    let noticed = false;
    for (let i = 0; i < 60; i++) if (stepWarden(w, nearby, [], DT, { ...ctxBase, lunch }).some((e) => e.type === 'noticed')) noticed = true;
    expect(noticed).toBe(true);
    expect(w.mode).not.toBe('lunch');
  });
});

describe('swim trigger', () => {
  it('counts the seconds the gull paddles on the sea, and fires once', () => {
    const t = new TriggerSystem([{ id: 'p', kind: 'swim', event: 'paddled', seconds: 2 }]);
    const sea = { props: [], gull: { x: 0, y: 0.5, z: 10, grounded: true }, carried: null, isLand: (_x: number, z: number) => z < 0, dt: 0.5 };
    const wanted = new Set(['paddled']);
    expect(t.update(sea, wanted)).toEqual([]);
    for (let i = 0; i < 2; i++) t.update(sea, wanted);
    expect(t.update(sea, wanted)).toEqual(['paddled']);
    expect(t.update(sea, wanted)).toEqual([]);
    // on land, or flying, nothing counts
    const t2 = new TriggerSystem([{ id: 'p', kind: 'swim', event: 'paddled', seconds: 1 }]);
    for (let i = 0; i < 10; i++) expect(t2.update({ ...sea, gull: { x: 0, y: 0.5, z: -5, grounded: true } }, wanted)).toEqual([]);
    for (let i = 0; i < 10; i++) expect(t2.update({ ...sea, gull: { x: 0, y: 9, z: 10, grounded: false } }, wanted)).toEqual([]);
  });
});

describe('levels 5-8', () => {
  const ids = ['city-strikes', 'owl-be-back', 'the-warden', 'harbour-day'];
  it('are in order after level 4, each unlocked by the one before, with a real skill reward', () => {
    expect(LEVELS.filter((l) => l.arc === undefined).map((l) => l.id).slice(0, 8)).toEqual(['snack-attack', 'bombs-away', 'nosy-parkers', 'butterfingers', ...ids]);
    ids.forEach((id, i) => {
      const l = levelById(id);
      expect(l.requires).toBe(i === 0 ? 'butterfingers' : ids[i - 1]);
      expect(skillById(l.reward!)).toBeTruthy();
      expect(levelUnlocked(l, {})).toBe(false);
    });
    expect(ids.map((id) => levelById(id).reward)).toEqual(['hawkeye', 'fatbird', 'disguise', 'flock']);
  });
  it('build from data: 2-4 main to-dos, one hidden, every quest and trigger resolves, with and without a second gull', () => {
    for (const id of ids) {
      const l = levelById(id);
      const solo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      const duo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
      expect(solo.main.length, id).toBeGreaterThanOrEqual(2);
      expect(solo.main.length, id).toBeLessThanOrEqual(4);
      expect(solo.secret.size, id).toBe(1);
      expect(duo.quests.length, id).toBe(solo.quests.length + 1);
      expect(duo.main, id).toEqual(solo.main);
    }
  });
  it('the headline levels set up their special situation', () => {
    expect(levelById('city-strikes').deploy).toEqual(['vendors', 'lines']);
    expect(levelById('owl-be-back').deploy).toContain('nets');
    expect(levelById('owl-be-back').extraProps?.some((p) => p.type === 'owl')).toBe(true);
    expect(levelById('the-warden').wardenLunch?.duration).toBeGreaterThan(20);
    expect(levelById('the-warden').deploy).toEqual(['warden']);
    expect(levelById('harbour-day').drift).toBeTruthy();
    expect(levelById('harbour-day').extraProps?.some((p) => p.tag === 'note')).toBe(true);
    // the rich tourist stands just in front of the vendor, who is within spray range of the gull's spot behind him
    const rich = levelById('city-strikes').extraTourists!.find((t) => t.role === 'rich')!;
    expect(rich.hat).toBe('top');
    expect(rich.holdTag).toBe('richLunch');
  });
});
