import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import cityJson from '../../data/generated/kauppatori.json';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World, pointInRings } from '../../src/world/collision';
import type { NpcEvent } from '../../src/gameplay/npc';
import { QuestLog } from '../../src/gameplay/quest';
import { RowScout, courseCount, courseDone, courseOf, courseOpen, courseRows, rowLocked } from '../../src/gameplay/collection';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { RowTimes, fmtClock } from '../../src/gameplay/rowTimes';
import { hitOnlyReachable, switchHitAllowed, type MechId } from '../../src/gameplay/mechanics';
import { ritualState } from '../../src/gameplay/ritual';
import { LEVELS } from '../../src/data/levels';
import { GUARD_ROUNDS, LAB_QUEST, MARKET_GUARD, PICNIC_LAB } from '../../src/data/levels/picnicLab';
import { levelSetup } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { tuning } from '../../src/core/tuning';

beforeAll(async () => {
  await RAPIER.init();
});

function rig(seed = 3) {
  const phys = new PhysicsWorld(RAPIER);
  const props = new PropManager(phys, new THREE.Group());
  const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, seed);
  const run = (s: number, gull = { x: 0, y: 30, z: -80, diving: false } as Parameters<NpcManager['update']>[1]) => {
    const ev: NpcEvent[] = [];
    for (let i = 0; i < s * 60; i++) {
      props.beforeStep(1 / 60);
      phys.step();
      props.afterStep();
      ev.push(...npcs.update(1 / 60, gull));
    }
    return ev;
  };
  return { phys, props, npcs, run };
}

describe('courses: rows open in order (M111)', () => {
  it('knows which rows are in which course, and which course is open', () => {
    expect(courseCount(LAB_QUEST)).toBe(2);
    expect(courseRows(LAB_QUEST, 1)).toEqual([0, 1]);
    expect(courseRows(LAB_QUEST, 2)).toEqual([2]);
    expect(courseOf({ id: 'x', text: '', kind: 'event' })).toBe(1);
    const log = new QuestLog([LAB_QUEST]);
    const q = log.quests[0];
    expect(courseOpen(LAB_QUEST, q, 1)).toBe(true);
    expect(courseOpen(LAB_QUEST, q, 2)).toBe(false);
    expect(rowLocked(LAB_QUEST, q, 2)).toBe(true);
    expect(rowLocked(LAB_QUEST, q, 0)).toBe(false);
  });

  it('a row in a locked course does not count, is not wanted, and has no marker; it opens when the course before is done, in any order', () => {
    const log = new QuestLog([LAB_QUEST]);
    expect(log.wanted().has('lab:thermos')).toBe(false);
    expect(log.wanted().has('lab:cloth')).toBe(true);
    log.onEvent('lab:thermos'); // too early
    expect(log.quests[0].objectives[2].done).toBe(false);
    const markersBefore = activeMarkers([LAB_QUEST], log.quests).map((m) => m.label);
    expect(markersBefore).toContain('The Waiter');
    expect(markersBefore).not.toContain('Thermos');
    const n1 = log.onEvent('lab:loaf'); // the second row of the course first
    expect(n1.some((n) => n.type === 'course')).toBe(false);
    const n2 = log.onEvent('lab:cloth');
    expect(n2.filter((n) => n.type === 'course')).toEqual([{ type: 'course', quest: 'lab', course: 1 }]); // exactly once, when the last row is done
    expect(courseDone(LAB_QUEST, log.quests[0], 1)).toBe(true);
    expect(log.wanted().has('lab:thermos')).toBe(true);
    expect(activeMarkers([LAB_QUEST], log.quests).map((m) => m.label)).toContain('Thermos');
    const n3 = log.onEvent('lab:thermos');
    expect(n3.map((n) => n.type)).toContain('course');
    expect(log.quests[0].status).toBe('won');
  });

  it('a row in a locked course cannot be found: it stays ??? even when the gull stands on it', () => {
    const log = new QuestLog([LAB_QUEST]);
    const scout = new RowScout();
    const at = LAB_QUEST.objectives[2].row!.reveal;
    scout.update([LAB_QUEST], log.quests, { x: at.x, z: at.z });
    expect(scout.sight('lab:thermos')).toBe('hidden');
    log.onEvent('lab:cloth');
    log.onEvent('lab:loaf');
    scout.update([LAB_QUEST], log.quests, { x: at.x, z: at.z });
    expect(scout.sight('lab:thermos')).toBe('known');
  });
});

describe('a ritual that waits for customers (M111)', () => {
  const waiter = { x: 0, z: 0, heading: Math.PI, color: 1, role: 'waiter', stationary: true, ritual: { every: 20, hold: 3, icon: '🤵', needs: { count: 2, r: 7 } } };

  it('never starts without customers, and its clock does not run', () => {
    const { npcs, run } = rig();
    const w = npcs.spawn(waiter);
    const ev = run(60);
    expect(ev.filter((e) => e.type === 'ritual')).toHaveLength(0);
    expect(w.ritualLabel).toBeUndefined();
    expect(w.ritualT).toBe(0);
  });

  it('with two customers near it counts down and goes; one customer is not enough; customers of his own role do not count', () => {
    const one = rig();
    one.npcs.spawn(waiter);
    one.npcs.spawn({ x: 3, z: 0, heading: 0, color: 2, role: 'customer', stationary: true });
    expect(one.run(60).filter((e) => e.type === 'ritual')).toHaveLength(0);

    const two = rig();
    two.npcs.spawn(waiter);
    two.npcs.spawn({ x: 3, z: 0, heading: 0, color: 2, role: 'customer', stationary: true });
    two.npcs.spawn({ x: -3, z: 2, heading: 0, color: 3, role: 'customer', stationary: true });
    expect(two.run(30).filter((e) => e.type === 'ritual').length).toBeGreaterThanOrEqual(1);

    const colleagues = rig();
    colleagues.npcs.spawn(waiter);
    colleagues.npcs.spawn({ x: 3, z: 0, heading: 0, color: 2, role: 'waiter', stationary: true });
    colleagues.npcs.spawn({ x: -3, z: 2, heading: 0, color: 3, role: 'waiter', stationary: true });
    expect(colleagues.run(30).filter((e) => e.type === 'ritual' && e.npc.ritual?.needs).length).toBe(0);
  });

  it('the clock stops when the customers go (it waits in the idle part of the cycle) and starts again when they return', () => {
    const { npcs, run } = rig();
    const w = npcs.spawn(waiter);
    const a = npcs.spawn({ x: 3, z: 0, heading: 0, color: 2, role: 'customer', stationary: true });
    const b = npcs.spawn({ x: -3, z: 2, heading: 0, color: 3, role: 'customer', stationary: true });
    run(2);
    expect(w.ritualT).toBeGreaterThan(1);
    a.x = b.x = 60; // they leave
    const stopped = w.ritualT;
    run(5);
    expect(w.ritualT).toBeCloseTo(stopped, 1);
    expect(ritualState(w.ritualT, waiter.ritual).phase).toBe('idle');
    a.x = 3;
    b.x = -3;
    run(3);
    expect(w.ritualT).toBeGreaterThan(stopped + 2);
  });

  it('a ritual without `needs` keeps the shared clock, as before', () => {
    const { npcs, run } = rig();
    npcs.spawn({ x: 0, z: 0, heading: Math.PI, color: 1, role: 'chef', stationary: true, ritual: { every: 20, hold: 4, icon: '😋' } });
    expect(run(41).filter((e) => e.type === 'ritual')).toHaveLength(2);
  });
});

describe('the Market Guard (M111)', () => {
  // he stands at the origin facing +z (heading pi); the gull is in front of him unless said otherwise
  const guard = { x: 0, z: 0, heading: Math.PI, color: 1, role: 'marketguard', stationary: true, confiscates: ['rye', 'thermos'] };
  const gull = (z: number, carrying: string | null, extra = {}) => ({ x: 0, y: 1.6, z, diving: false, carrying, ...extra });
  const whistles = (ev: NpcEvent[]) => ev.filter((e) => e.type === 'whistle');

  it('blows his whistle at a gull he sees carrying something he guards, once per cooldown', () => {
    const { npcs, run } = rig();
    npcs.spawn(guard);
    const ev = run(2, gull(6, 'rye'));
    expect(whistles(ev)).toHaveLength(1);
    const w = ev.find((e) => e.type === 'whistle')!;
    expect(w.type === 'whistle' && w.tag).toBe('rye');
    expect(w.type === 'whistle' && w.gull).toBe(0);
    // still carrying it: nothing more until the cooldown is over, then again
    expect(whistles(run(tuning.guard.cooldown.value - 3, gull(6, 'rye')))).toHaveLength(0);
    expect(whistles(run(6, gull(6, 'rye'))).length).toBe(1);
  });

  it('does not whistle for an item he does not guard, an empty beak, a gull too far, a gull behind him, or a gull behind a wall', () => {
    const cases: [string, ReturnType<typeof gull>][] = [
      ['an item he does not guard', gull(6, 'bun')],
      ['an untagged item', gull(6, null)],
      ['a gull too far away', gull(tuning.guard.whistleRange.value + 6, 'rye')],
      ['a gull behind him', gull(-6, 'rye')],
      ['a disguised gull', gull(6, 'rye', { disguise: true })],
    ];
    for (const [what, g] of cases) {
      const { npcs, run } = rig();
      npcs.spawn(guard);
      expect(whistles(run(2, g)), what).toHaveLength(0);
    }
    const { npcs, run } = rig();
    npcs.spawn(guard);
    (npcs as unknown as { world: World }).world.solidAt = (...a: number[]) => Math.abs(a[2] - 3) < 0.5; // a wall between them
    expect(whistles(run(2, gull(6, 'rye')))).toHaveLength(0);
  });

  it('cannot see you while he is looking at a noise (a honk is the way to get past him)', () => {
    const { npcs, run } = rig();
    npcs.spawn(guard);
    npcs.addNoise(0, 4, 1); // a clatter beside him
    expect(whistles(run(0.3, gull(6, 'rye')))).toHaveLength(0); // he turns towards the noise first
  });

  it('walks over to a noise to look, then goes back to his rounds', () => {
    const { npcs, run } = rig();
    const g = npcs.spawn({ ...guard, stationary: false, investigates: true, patrol: [{ x: 0, z: 0 }, { x: 0, z: 2 }] });
    npcs.addNoise(0, -20, 1); // a honk 20 m away, within hearing range
    const ev: NpcEvent[] = [];
    let farthest = 0;
    for (let i = 0; i < 25; i++) {
      ev.push(...run(1));
      farthest = Math.min(farthest, g.z);
    }
    expect(farthest).toBeLessThan(-8); // he walked towards it
    expect(ev.some((e) => e.type === 'arrived' && e.goal === 'noise')).toBe(true);
    for (let i = 0; i < 40; i++) run(1);
    expect(g.goal).toBeNull(); // and is back to wandering his patrol
    expect(g.z).toBeGreaterThan(-8);
    const { npcs: n2, run: run2 } = rig();
    const calm = n2.spawn({ ...guard, stationary: false, patrol: [{ x: 0, z: 0 }, { x: 0, z: 2 }] }); // one who does not investigate
    n2.addNoise(0, -20, 1);
    run2(12);
    expect(calm.z).toBeGreaterThan(-8);
  });

  it('returns the loot to its owner\'s hand if it was theirs, and to where it started if not', () => {
    const { npcs, props, run } = rig();
    const waiter = npcs.spawn({ x: 0, z: 10, heading: 0, color: 1, role: 'waiter', stationary: true, holds: 'tablecloth', holdTag: 'waiterCloth' });
    const cloth = props.props.find((p) => p.tag === 'waiterCloth')!;
    npcs.onSnatched(cloth.id); // a gull takes it out of his hand
    props.grab(cloth);
    run(0.1);
    expect(waiter.holding).toBeNull();
    props.drop(cloth, { x: 0, y: 0, z: 0 });
    npcs.returnLoot(cloth);
    expect(waiter.holding).toBe(cloth.id);
    expect(cloth.heldBy).toBe(waiter.id);
    // an item nobody held goes back to its spot
    const thermos = props.spawn({ type: 'thermos', x: 5, y: 0.5, z: 5, tag: 'thermos' });
    thermos.body.setTranslation({ x: 20, y: 1, z: 20 }, true);
    npcs.returnLoot(thermos);
    expect(Math.hypot(thermos.cur.p.x - 5, thermos.cur.p.z - 5)).toBeLessThan(0.5);
  });

  it('people who arrive later appear when cast, count as people, and are gone after a reset', () => {
    const { npcs, run } = rig();
    npcs.spawn({ x: 0, z: 0, heading: 0, color: 1, role: 'tourist', stationary: true });
    expect(npcs.npcs).toHaveLength(1);
    const late = npcs.spawnLate([{ ...MARKET_GUARD, name: undefined, x: 20, z: 20 }]); // (no name tag: it needs a canvas)
    expect(late).toHaveLength(1);
    expect(npcs.npcs).toHaveLength(2);
    run(1);
    npcs.reset();
    expect(npcs.npcs).toHaveLength(1);
    expect(npcs.npcs[0].role).toBe('tourist');
  });
});

describe('time per row (M111)', () => {
  it('records when each row was done and how long after the one before; courses get headings', () => {
    const t = new RowTimes();
    t.record('lab', 'cloth', 'A tablecloth (the Waiter)', 1, 72);
    t.record('lab', 'loaf', 'Rye bread (the Baker)', 1, 127);
    t.course(1, 127);
    t.course(1, 999); // only the first time counts
    t.record('lab', 'thermos', 'Coffee (the Market Guard)', 2, 305);
    expect(t.splits.map((s) => s.since)).toEqual([72, 55, 178]);
    expect(t.lines(['Starters', 'Main course'])).toEqual([
      'Time per row (in the order you did them):',
      'Starters (served at 2:07)',
      'A tablecloth (the Waiter): 1:12, +1:12',
      'Rye bread (the Baker): 2:07, +0:55',
      'Main course',
      'Coffee (the Market Guard): 5:05, +2:58',
    ]);
    expect(t.lines()).toHaveLength(4); // without course names: no headings
    t.reset();
    expect(t.lines()).toEqual([]);
    expect(fmtClock(65.9)).toBe('1:05');
    expect(fmtClock(-3)).toBe('0:00');
  });
});

describe('thrown-only switches (M111)', () => {
  it('a splat does not ring a thrown-only bell; something thrown or dropped does; an ordinary hit-only switch takes both', () => {
    expect(switchHitAllowed('thrown', 'splat')).toBe(false);
    expect(switchHitAllowed('thrown', 'thrown')).toBe(true);
    expect(switchHitAllowed(true, 'splat')).toBe(true);
    expect(switchHitAllowed(true, 'thrown')).toBe(true);
    expect(switchHitAllowed(undefined, 'splat')).toBe(true);
  });
  it('a thrown-only bell needs toss, not poop', () => {
    const has = (...ids: MechId[]) => (id: MechId) => ids.includes(id);
    expect(hitOnlyReachable('thrown', has('poop'))).toBe(false);
    expect(hitOnlyReachable('thrown', has('toss'))).toBe(true);
    expect(hitOnlyReachable(true, has('poop'))).toBe(true);
  });
});

describe('the picnic lab level (M111)', () => {
  const land = (x: number, z: number) => (cityJson as unknown as { land: { rings: number[][] }[] }).land.some((l) => pointInRings(l.rings, x, z));
  const setup = levelSetup(PICNIC_LAB, QUESTS, TRIGGERS, TOURIST_SPAWNS);

  it('is in the Playground, not the campaign, and its own series', () => {
    expect(LEVELS).toContain(PICNIC_LAB);
    expect(PICNIC_LAB.arc).toBeUndefined();
    expect(PICNIC_LAB.series).toBe('Picnic lab (engine)');
    expect(setup.main).toEqual(['lab']);
  });

  it('every row is served by a trigger for an item that is in the level; the Guard guards exactly the picnic items', () => {
    const tags = new Set([...(PICNIC_LAB.extraProps ?? []).map((p) => p.tag), ...setup.tourists.map((t) => t.holdTag)]);
    for (const o of LAB_QUEST.objectives) {
      const t = setup.triggers.find((x) => x.kind === 'propInZone' && x.event === o.event);
      expect(t, o.event).toBeTruthy();
      if (t?.kind === 'propInZone') expect(tags.has(t.tag), `${t.tag} is placed`).toBe(true);
    }
    expect(new Set(MARKET_GUARD.confiscates)).toEqual(new Set(['waiterCloth', 'rye', 'thermos']));
    expect(MARKET_GUARD.watch).toBe('thermos');
  });

  it('the Guard is cast when the starters are served, and is not there before', () => {
    expect(setup.tourists.some((t) => t.role === 'marketguard')).toBe(false);
    const r = (PICNIC_LAB.reactions ?? []).find((x) => x.on === 'courseServed:1');
    expect(r?.cast?.[0]).toBe(MARKET_GUARD);
  });

  it('the bell is thrown-only, the Waiter waits for customers who are not his own role, the rounds are on land', () => {
    expect(PICNIC_LAB.switches?.find((s) => s.id === 'doorbell')?.hitOnly).toBe('thrown');
    const waiter = setup.tourists.find((t) => t.role === 'waiter')!;
    expect(waiter.ritual?.needs?.count).toBe(2);
    expect(setup.tourists.filter((t) => t.role === 'customer')).toHaveLength(2);
    for (const p of GUARD_ROUNDS) expect(land(p.x, p.z), `round point ${p.x},${p.z}`).toBe(true);
    for (const t of setup.tourists) expect(land(t.x, t.z), `${t.role} on land`).toBe(true);
  });
});
