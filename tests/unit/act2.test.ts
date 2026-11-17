import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { LEVELS, levelById } from '../../src/data/levels';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { SkillSet } from '../../src/gameplay/skills';
import { mods } from '../../src/core/skillMods';
import { TriggerSystem } from '../../src/gameplay/triggers';
import { newVendor, stepVendor } from '../../src/gameplay/vendor';
import { newFlightState, stepFlight } from '../../src/gull/flight';
import { tuning } from '../../src/core/tuning';
import { Abilities } from '../../src/gameplay/abilities';

beforeAll(async () => {
  await RAPIER.init();
});
const DT = 1 / 60;
const ids = ['caw-of-the-wild', 'invisible-maze', 'heavy-lifting', 'gulls-eleven', 'coo-coo-undercover', 'thermal-express'];

describe('Act 2 levels', () => {
  it('follow level 8 in order, each grants the skill it teaches and rewards it', () => {
    expect(LEVELS.filter((l) => l.arc === undefined).map((l) => l.id).slice(8, 14)).toEqual(ids);
    const skills = ['mimic', 'hawkeye', 'fatbird', 'flock', 'disguise', 'flight'];
    ids.forEach((id, i) => {
      const l = levelById(id);
      expect(l.requires).toBe(i === 0 ? 'harbour-day' : ids[i - 1]);
      expect(l.skills).toEqual([skills[i]]);
      expect(l.reward).toBe(skills[i]);
    });
  });
  it('build from data: 2-4 main to-dos, one hidden, a co-op twist, every quest/trigger resolves', () => {
    for (const id of ids) {
      const l = levelById(id);
      const solo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      const duo = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
      expect(solo.main.length, id).toBeGreaterThanOrEqual(2);
      expect(solo.main.length, id).toBeLessThanOrEqual(4);
      expect(solo.secret.size, id).toBe(1);
      expect(duo.quests.length, id).toBe(solo.quests.length + 1);
    }
  });
  it('special settings: invisible lines, pigeon rules, thermals along the way to the dome, level props', () => {
    expect(levelById('invisible-maze').hiddenLines).toBe(true);
    expect(levelById('coo-coo-undercover').pigeonRules).toBe(true);
    const t = levelById('thermal-express').thermals!;
    expect(t.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < t.length; i++) expect(t[i].x).toBeGreaterThan(t[i - 1].x); // a route to the north-east
    expect(levelById('heavy-lifting').extraProps!.filter((p) => p.type === 'chair').length).toBeGreaterThanOrEqual(3);
    expect(levelById('gulls-eleven').extraProps!.map((p) => p.tag).sort()).toEqual(['heistA', 'heistB', 'heistC']);
  });
});

describe('level-granted skills', () => {
  it('are usable and apply their effect for the level, are never saved, and end with the level', () => {
    const s = new SkillSet();
    s.restore([]);
    s.grantForLevel(['fatbird', 'nonsense']);
    expect(s.has('fatbird')).toBe(true);
    expect(s.has('nonsense')).toBe(false);
    expect(s.ids).toEqual([]);
    expect(mods.carryMax).toBeGreaterThan(1);
    s.grantForLevel([]);
    expect(s.has('fatbird')).toBe(false);
  });
});

describe('crow call and tour groups', () => {
  it('a tour-group member walks over to a sound; other people only look', () => {
    const phys = new PhysicsWorld(RAPIER);
    const group = new THREE.Group();
    const props = new PropManager(phys, group);
    const npcs = new NpcManager(new World(), props, group, () => true, 5);
    npcs.spawn({ x: 0, z: 0, heading: 0, role: 'tour', stationary: true, color: 0 });
    npcs.spawn({ x: 6, z: 0, heading: 0, stationary: true, color: 0 });
    npcs.addNoise(15, 0, 1);
    const far = { x: 500, y: 20, z: 500, diving: false };
    for (let i = 0; i < 60 * 12; i++) {
      props.beforeStep(DT);
      phys.step();
      props.afterStep();
      npcs.update(DT, far);
    }
    expect(npcs.npcs[0].x).toBeGreaterThan(10); // walked toward the sound
    expect(Math.abs(npcs.npcs[1].x - 6)).toBeLessThan(1); // the other one stayed put
  });
});

describe('vendors and noise', () => {
  it('a noise makes a vendor stare at it and ignore the gull for a moment; then it goes back to work', () => {
    const v = newVendor(1, 0, 0, Math.PI);
    const gull = { x: 0, y: 1.5, z: 3, diving: false };
    const world = new World();
    stepVendor(v, gull, true, DT, world);
    expect(v.mode).toBe('alert'); // sees the gull, alert
    const ev = stepVendor(v, gull, true, DT, world, [{ x: 6, z: 0, loud: 1 }]);
    expect(ev.some((e) => e.type === 'distracted')).toBe(true);
    expect(v.mode).toBe('idle');
    expect(v.seesGull).toBe(false);
    for (let i = 0; i < 60 * 4; i++) stepVendor(v, gull, true, DT, world);
    expect(v.mode).not.toBe('idle'); // the stare is over: back on the gull (alert, aiming or spraying)
    expect(v.distractT).toBe(0);
  });
});

describe('triggers for Act 2', () => {
  const base = { props: [], gull: { x: 0, y: 0, z: 0, grounded: true }, carried: null, isLand: () => true };
  it('counts people with a role in a zone', () => {
    const t = new TriggerSystem([{ id: 'g', kind: 'npcsInZone', event: 'groupPhoto', role: 'tour', zone: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, count: 3 }]);
    const w = new Set(['groupPhoto']);
    const npcs = [{ role: 'tour', x: 1, z: 1 }, { role: 'tour', x: 2, z: 2 }, { role: 'other', x: 3, z: 3 }, { role: 'tour', x: 50, z: 50 }];
    expect(t.update({ ...base, npcs }, w)).toEqual([]);
    npcs.push({ role: 'tour', x: 4, z: 4 });
    expect(t.update({ ...base, npcs }, w)).toEqual(['groupPhoto']);
  });
  it('a stack needs the count and a prop up at height', () => {
    const zone = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    const chair = (x: number, y: number) => ({ type: 'chair' as const, x, y, z: 1, free: true });
    const three = new TriggerSystem([{ id: 'c', kind: 'propInZone', event: 'chairs3', propType: 'chair', zone, count: 3 }]);
    const tower = new TriggerSystem([{ id: 't', kind: 'propInZone', event: 'tower', propType: 'chair', zone: { ...zone, minY: 0.8 }, count: 1 }]);
    const flat = [chair(1, 0.4), chair(2, 0.4)];
    expect(three.update({ ...base, props: flat }, new Set(['chairs3']))).toEqual([]);
    expect(three.update({ ...base, props: [...flat, chair(3, 0.4)] }, new Set(['chairs3']))).toEqual(['chairs3']);
    expect(tower.update({ ...base, props: [...flat, chair(3, 0.4)] }, new Set(['tower']))).toEqual([]);
    expect(tower.update({ ...base, props: [...flat, chair(1, 1.0)] }, new Set(['tower']))).toEqual(['tower']);
  });
  it('landing with the prop on a high roof only counts inside the zone', () => {
    const t = new TriggerSystem([{ id: 'd', kind: 'carryLanded', event: 'domeTop', propType: 'bun', minY: 20, zone: { minX: 100, maxX: 120, minZ: 0, maxZ: 20 } }]);
    const carried = { type: 'bun' as const, x: 0, y: 0, z: 0, free: false };
    const w = new Set(['domeTop']);
    expect(t.update({ ...base, carried, gull: { x: 0, y: 25, z: 0, grounded: true } }, w)).toEqual([]); // some other tall roof
    expect(t.update({ ...base, carried, gull: { x: 110, y: 25, z: 10, grounded: true } }, w)).toEqual(['domeTop']);
  });
});

describe('thermals and pigeons', () => {
  it('a gliding gull in a thermal rises while one outside sinks', () => {
    tuning.wind.strength.value = 0;
    const inside = newFlightState(), outside = newFlightState();
    for (const s of [inside, outside]) {
      s.y = 40;
      s.mode = 'air';
      s.vz = -tuning.flight.glideSpeed.value;
    }
    const w = new World();
    for (let i = 0; i < 120; i++) {
      stepFlight(inside, { ax: 0, ay: 1, flap: false, dive: false, aimPitch: 0.3, lift: 28 }, 0, DT, w, i * DT);
      stepFlight(outside, { ax: 0, ay: 1, flap: false, dive: false, aimPitch: 0.3 }, 0, DT, w, i * DT);
    }
    expect(inside.y).toBeGreaterThan(48);
    expect(outside.y).toBeLessThan(40);
  });
  it('breaking the disguise ends it at once', () => {
    const a = new Abilities();
    a.use('disguise');
    expect(a.disguised).toBe(true);
    a.breakDisguise();
    expect(a.disguised).toBe(false);
  });
});
