import { describe, expect, it } from 'vitest';
import cityJson from '../../data/generated/kauppatori.json';
import { LEVELS } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { PROPS } from '../../src/data/props';
import { levelSetup } from '../../src/gameplay/level';
import { QuestLog } from '../../src/gameplay/quest';
import { TriggerSystem } from '../../src/gameplay/triggers';
import { courseCount, courseRows } from '../../src/gameplay/collection';
import { PigeonRace, Raid, type RaceConfig, type RaceCtx } from '../../src/gameplay/pigeonRace';
import { pointInRings } from '../../src/world/collision';
import { HALL } from '../../src/render/decor';
import { tuning } from '../../src/core/tuning';
import { BLANKET, HALL_AT, PICNIC } from '../../src/data/levels/picnic';
import * as V1 from '../../src/data/levels/picnic';
import { BAKER, BERRY_STALL, CLOCK_BUNS, CUSTOMERS, DINER, DOORBELL, FISHER, FLOAT, FLOCK_HOME, GRANNY, GUARD, GUARD_ROUNDS, GUARD_TABLE, GULL_PICNIC_V2, KIOSK, PICNIC_V2_QUEST, STATUE, TAKE_TO, WAITER } from '../../src/data/levels/picnic2';

const land = (x: number, z: number) => (cityJson as unknown as { land: { rings: number[][] }[] }).land.some((l) => pointInRings(l.rings, x, z));
const inHall = (x: number, z: number) => Math.abs(x - HALL_AT.x) <= HALL.hx + 0.5 && Math.abs(z - HALL_AT.z) <= HALL.hz + 0.5;
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const setup = levelSetup(GULL_PICNIC_V2, QUESTS, TRIGGERS, TOURIST_SPAWNS);
const rows = PICNIC_V2_QUEST.objectives.filter((o) => o.row);

// ---- the pigeon race ----
const CFG: RaceConfig = { home: { x: 0, z: 0 }, arrive: { x: 100, z: 0, r: 4, minY: 3 }, raceSeconds: 4, chaseSeconds: 30, eatenSeconds: 2, chaseFollow: 3 };
const free = (x = 10, z = 0): RaceCtx['cone'] => ({ state: 'free', x, y: 0.3, z });
const carried = (x: number, y = 1, z = 0): RaceCtx['cone'] => ({ state: 'carried', x, y, z });
const run = (r: PigeonRace, s: number, ctx: RaceCtx): string[] => {
  const ev: string[] = [];
  for (let i = 0; i < s * 20; i++) ev.push(...r.update(0.05, ctx));
  return ev;
};

describe('the pigeon race (M112)', () => {
  it('a dropped cone sets the flock off for it; if nobody takes it they eat it, and settle back home', () => {
    const r = new PigeonRace(CFG);
    expect(r.start({ x: 10, z: 0 })).toEqual(['raceStart']);
    expect(r.start({ x: 10, z: 0 })).toEqual([]); // already racing
    const ev = run(r, 4.2, { cone: free(), gull: { x: 50, y: 5, z: 0 } });
    expect(ev).toEqual(['coneEaten']);
    expect(r.x).toBeCloseTo(10, 0);
    expect(r.mode).toBe('eaten');
    run(r, 2.2, { cone: free(), gull: null });
    expect(r.mode).toBe('idle');
  });

  it('the flock flies in: halfway there after half the time', () => {
    const r = new PigeonRace(CFG);
    r.start({ x: 10, z: 0 });
    run(r, 2, { cone: free(), gull: null });
    expect(r.x).toBeGreaterThan(4);
    expect(r.x).toBeLessThan(6);
    expect(r.y).toBeGreaterThan(1.5); // up in the air on the way
  });

  it('a gull that takes the cone in time is chased, and where it lands on the roof the raid begins', () => {
    const r = new PigeonRace(CFG);
    r.start({ x: 10, z: 0 });
    run(r, 2, { cone: free(), gull: { x: 12, y: 1, z: 0 } });
    expect(run(r, 0.1, { cone: carried(12), gull: { x: 12, y: 1, z: 0 } })).toEqual(['chaseStart']);
    // the flock follows the gull across the square
    run(r, 3, { cone: carried(40), gull: { x: 40, y: 6, z: 0 } });
    expect(r.x).toBeGreaterThan(25);
    // not on the roof yet: nothing; on the roof (close enough, high enough): arrived
    expect(run(r, 0.5, { cone: carried(80), gull: { x: 80, y: 6, z: 0 } })).toEqual([]);
    expect(run(r, 0.5, { cone: carried(99), gull: { x: 99, y: 6, z: 1 } })).toEqual(['arrived']);
    expect(r.mode).toBe('idle');
    // flying low past the roof does not count
    const r2 = new PigeonRace(CFG);
    r2.start({ x: 10, z: 0 });
    run(r2, 0.1, { cone: carried(100, 1), gull: { x: 100, y: 1, z: 0 } });
    expect(run(r2, 1, { cone: carried(100, 1), gull: { x: 100, y: 1, z: 0 } })).toEqual(['chaseStart'].slice(1));
    expect(r2.mode).toBe('chasing');
  });

  it('they give up on a gull who stays away too long, and the race starts again if the cone is dropped on the way', () => {
    const r = new PigeonRace(CFG);
    r.start({ x: 10, z: 0 });
    run(r, 0.1, { cone: carried(10), gull: { x: 10, y: 1, z: 0 } });
    expect(run(r, 31, { cone: carried(10), gull: { x: 10, y: 1, z: 0 } })).toEqual(['gaveUp']);
    const r2 = new PigeonRace(CFG);
    r2.start({ x: 10, z: 0 });
    run(r2, 0.1, { cone: carried(10), gull: { x: 10, y: 1, z: 0 } });
    run(r2, 0.2, { cone: free(30), gull: { x: 30, y: 1, z: 0 } }); // dropped
    expect(r2.mode).toBe('racing');
    expect(run(r2, 4.2, { cone: free(30), gull: null })).toEqual(['coneEaten']);
  });

  it('they leave it alone if the Diner has taken it back in his hand', () => {
    const r = new PigeonRace(CFG);
    r.start({ x: 10, z: 0 });
    expect(run(r, 1, { cone: { state: 'held', x: 10, y: 1, z: 0 }, gull: null })).toEqual(['aborted']);
    expect(r.mode).toBe('idle');
  });

  it('with no cone it never starts; reset puts the flock home', () => {
    const r = new PigeonRace(CFG);
    expect(run(r, 5, { cone: null, gull: null })).toEqual([]);
    r.start({ x: 10, z: 0 });
    run(r, 2, { cone: free(), gull: null });
    r.reset();
    expect(r.mode).toBe('idle');
    expect(r.x).toBe(0);
  });
});

describe('the raid (M112)', () => {
  it('carries off the last item only once, after the pigeons have been ignored long enough', () => {
    const raid = new Raid(60);
    raid.start();
    let took = 0;
    for (let i = 0; i < 59 * 10; i++) if (raid.update(0.1)) took++;
    expect(took).toBe(0);
    for (let i = 0; i < 3 * 10; i++) if (raid.update(0.1)) took++;
    expect(took).toBe(1);
    for (let i = 0; i < 100 * 10; i++) if (raid.update(0.1)) took++;
    expect(took).toBe(1);
  });
  it('a honk or a bun settles them: nothing is taken', () => {
    const raid = new Raid(60);
    raid.start();
    raid.update(30);
    raid.settle();
    let took = 0;
    for (let i = 0; i < 100 * 10; i++) if (raid.update(0.1)) took++;
    expect(took).toBe(0);
  });
  it('is not on until it starts, and the take-back time is in tuning', () => {
    expect(new Raid(1).update(10)).toBe(false);
    expect(tuning.picnic.raidTakeAfter.value).toBe(60);
  });
});

describe('taking a delivered row back (M112)', () => {
  it('QuestLog.undo un-ticks a done step and opens a won quest again; the trigger can fire again', () => {
    const log = new QuestLog(setup.quests);
    for (const id of ['cloth', 'loaf', 'herring', 'thermos', 'berries', 'vendace']) log.onEvent(`picnic:${id}`);
    expect(log.quests.find((q) => q.id === 'picnic')!.status).toBe('won');
    expect(log.undo('picnic', 'vendace')).toBe(true);
    const q = log.quests.find((x) => x.id === 'picnic')!;
    expect(q.status).toBe('active');
    expect(q.objectives.find((o) => o.id === 'vendace')!.done).toBe(false);
    expect(q.objectives.filter((o) => o.done)).toHaveLength(5);
    expect(log.undo('picnic', 'vendace')).toBe(false); // nothing to undo now
    expect(log.undo('nope', 'x')).toBe(false);
    log.onEvent('picnic:vendace'); // delivered again
    expect(log.quests.find((x) => x.id === 'picnic')!.status).toBe('won');
  });
  it('a trigger that has fired can be let go and fires again', () => {
    const ts = new TriggerSystem([{ id: 't', kind: 'propInZone', event: 'e', propType: 'bun', zone: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 } }]);
    const ctx = { props: [{ type: 'bun' as const, x: 0.5, y: 0, z: 0.5, free: true }], gull: { x: 9, y: 9, z: 9, grounded: false }, carried: null, isLand: () => true };
    const want = new Set(['e']);
    expect(ts.update(ctx, want)).toEqual(['e']);
    expect(ts.update(ctx, want)).toEqual([]);
    ts.unfire('t');
    expect(ts.update(ctx, want)).toEqual(['e']);
  });
});

describe('stage 1.2, version two: the data (M112)', () => {
  it('is the campaign\'s stage 1.2; the first version is in the Playground', () => {
    expect(LEVELS.find((l) => l.id === 'a1s2')).toBe(GULL_PICNIC_V2);
    expect(GULL_PICNIC_V2.requires).toBe('a1s1');
    expect(LEVELS.find((l) => l.id === 'gull-picnic-v1')?.arc).toBeUndefined();
  });

  it('six rows in three courses of two, each with an owner, a tag, a wish and a ladder', () => {
    expect(rows).toHaveLength(6);
    expect(courseCount(PICNIC_V2_QUEST)).toBe(3);
    for (const c of [1, 2, 3]) expect(courseRows(PICNIC_V2_QUEST, c)).toHaveLength(2);
    expect(rows.map((o) => o.row!.course)).toEqual([1, 1, 2, 2, 3, 3]);
    for (const o of rows) {
      expect(o.row!.tag, o.id).toBeTruthy();
      expect(o.nudge && o.hint && o.outcome, o.id).toBeTruthy();
      expect(o.markers?.length, o.id).toBeGreaterThan(0);
    }
    expect(new Set(rows.map((o) => o.row!.tag)).size).toBe(6);
    expect(PICNIC_V2_QUEST.collect!.courses!.map((c) => c.name)).toEqual(['Starters', 'Main course', 'Dessert']);
  });

  it('every row is served by a trigger on the roof for an item that is in the level (in a hand or on the ground), with its own tag', () => {
    const tags = new Set([...(GULL_PICNIC_V2.extraProps ?? []).map((p) => p.tag), ...setup.tourists.map((t) => t.holdTag)]);
    for (const o of rows) {
      const t = setup.triggers.find((x) => x.kind === 'propInZone' && x.event === o.event);
      expect(t, o.event).toBeTruthy();
      if (t?.kind !== 'propInZone') continue;
      expect(t.zone).toEqual(BLANKET);
      expect(t.tag, o.id).toBe(o.row!.tag);
      expect(tags.has(t.tag), `${t.tag} is placed`).toBe(true);
    }
  });

  it('the owners are in the cast (the Market Guard is cast when the starters are served)', () => {
    const roles = new Set(setup.tourists.map((t) => t.role));
    for (const o of rows.filter((x) => x.victim !== 'marketguard')) expect(roles.has(o.victim!), `${o.victim} in the cast`).toBe(true);
    expect(roles.has('marketguard')).toBe(false);
    const r = (GULL_PICNIC_V2.reactions ?? []).find((x) => x.on === 'courseServed:1');
    expect(r?.cast).toContain(GUARD);
    expect((GULL_PICNIC_V2.reactions ?? []).some((x) => x.on === 'courseServed:2' && x.cast?.length)).toBe(true);
    // he guards every item on the menu
    expect(new Set(GUARD.confiscates)).toEqual(new Set(rows.map((o) => o.row!.tag)));
    expect(GUARD.watch).toBe('thermos');
    expect(GUARD.investigates).toBe(true);
  });

  it('is spread out: five owners 50 to 125 m from the roof, the Guard close by, and at least three times as far to fly as in the first version', () => {
    const roof = { x: PICNIC.x, z: PICNIC.z };
    const far = rows.filter((o) => o.victim !== 'marketguard').map((o) => dist(roof, o.row!.reveal));
    for (const d of far) {
      expect(d).toBeGreaterThan(50);
      expect(d).toBeLessThan(125);
    }
    expect(dist(roof, GUARD_TABLE)).toBeGreaterThan(15);
    expect(dist(roof, GUARD_TABLE)).toBeLessThan(40);
    // the round trips: roof to row and back, summed (what the pure flying costs)
    const trips = (rs: { x: number; z: number }[]) => rs.reduce((n, p) => n + 2 * dist(roof, p), 0);
    const v1 = trips([V1.WAITER, V1.BAKER, V1.FLOAT, V1.CAPTAIN, V1.BERRY_STALL, V1.DINER]);
    const v2 = trips(rows.map((o) => o.row!.reveal));
    expect(v2).toBeGreaterThan(v1 * 3);
    // and the places are not on top of each other
    const places = rows.map((o) => o.row!.reveal);
    for (let i = 0; i < places.length; i++) for (let j = i + 1; j < places.length; j++) expect(dist(places[i], places[j]), `${rows[i].id} and ${rows[j].id}`).toBeGreaterThan(35);
  });

  it('everything stands on land and clear of the hall; the float is in the water', () => {
    for (const t of setup.tourists) {
      expect(land(t.x, t.z), `${t.role ?? 'tourist'} at ${t.x},${t.z}`).toBe(true);
      expect(inHall(t.x, t.z), `${t.role} inside the hall`).toBe(false);
    }
    for (const p of GULL_PICNIC_V2.extraProps ?? []) {
      expect(land(p.x, p.z), `${p.type} at ${p.x},${p.z}`).toBe(true);
      expect(inHall(p.x, p.z), `${p.type} inside the hall`).toBe(false);
    }
    for (const p of [...GUARD_ROUNDS, GUARD, FLOCK_HOME, TAKE_TO, STATUE, GRANNY, KIOSK, BERRY_STALL, DOORBELL]) expect(land(p.x, p.z), `${p.x},${p.z}`).toBe(true);
    for (const d of GULL_PICNIC_V2.decor ?? []) if (d.kind !== 'float') expect(land(d.x, d.z), `${d.kind} at ${d.x},${d.z}`).toBe(true);
    expect(land(FLOAT.x, FLOAT.z)).toBe(false);
    const sz = GULL_PICNIC_V2.splatZones![0].zone;
    expect(land((sz.minX + sz.maxX) / 2, (sz.minZ + sz.maxZ) / 2)).toBe(false);
    // the Guard's rounds do not go through the hall
    for (let k = 0; k < GUARD_ROUNDS.length; k++) {
      const a = GUARD_ROUNDS[k], b = GUARD_ROUNDS[(k + 1) % GUARD_ROUNDS.length];
      for (let i = 0; i <= 40; i++) expect(inHall(a.x + ((b.x - a.x) * i) / 40, a.z + ((b.z - a.z) * i) / 40)).toBe(false);
    }
  });

  it('the Waiter\'s customers: two of them, near enough to be drawn to a bun dropped at his table, too far to be drawn to the buns by the clock', () => {
    const waiter = setup.tourists.find((t) => t.role === 'waiter')!;
    expect(waiter.ritual?.needs).toEqual({ count: 2, r: 7 });
    expect(setup.tourists.filter((t) => t.role === 'customer')).toHaveLength(2);
    const range = tuning.crowd.crumbRange.value;
    for (const c of CUSTOMERS) {
      expect(dist(c, WAITER)).toBeLessThan(range + 6); // a bun dropped within a few metres of him draws them
      for (const b of CLOCK_BUNS) expect(dist(c, b), 'not drawn to the buns before they are carried over').toBeGreaterThan(range);
    }
    expect(GULL_PICNIC_V2.crumbs).toContain('bun');
    expect(CLOCK_BUNS.length).toBeGreaterThanOrEqual(2);
  });

  it('the Baker\'s bell is thrown-only, under an awning, and there is something to throw by the statue', () => {
    const bell = GULL_PICNIC_V2.switches!.find((s) => s.id === 'doorbell')!;
    expect(bell.hitOnly).toBe('thrown');
    expect(GULL_PICNIC_V2.decor!.some((d) => d.kind === 'awning' && dist(d, DOORBELL) < 3)).toBe(true);
    const bottles = (GULL_PICNIC_V2.extraProps ?? []).filter((p) => p.type === 'bottle' && dist(p, STATUE) < 10);
    expect(bottles.length).toBeGreaterThanOrEqual(2);
    expect(dist(STATUE, DOORBELL)).toBeGreaterThan(80); // the bottle has to be carried a long way
    expect(dist(BAKER, DOORBELL)).toBeLessThan(10);
  });

  it('the Fisherman: the first splash brings up a boot that is a tool, the second a boot for the secret, and the boot dropped by the float is a monster', () => {
    const rs = GULL_PICNIC_V2.reactions!.filter((r) => r.on === 'splash:float' && r.spawn);
    expect(rs.map((r) => [r.nth, r.spawn!.tag])).toEqual([[1, 'bootTool'], [2, 'oldBoot']]);
    expect(GULL_PICNIC_V2.reactions!.some((r) => r.on === 'bootSplash' && r.oblivious?.role === 'fisher' && r.oblivious.seconds >= 10)).toBe(true);
    const t = GULL_PICNIC_V2.extraTriggers!.find((x) => x.id === 'bootSplash');
    expect(t && t.kind === 'propInZone' && t.tag).toBe('bootTool');
    expect(PROPS.boot.mass).toBeLessThanOrEqual(1); // a gull can lift it
    expect(dist(FISHER, FLOAT)).toBeLessThan(15);
  });

  it('the Diner, the pigeons and the raid: the honk starts the race, the flock waits by the kiosk, the raid takes the last item to a spot on land away from the roof', () => {
    const pr = GULL_PICNIC_V2.pigeonRace!;
    expect(pr.on).toBe('honkDrop:diner');
    expect(pr.tag).toBe('dinerCone');
    expect(setup.tourists.find((t) => t.role === 'diner')?.holdTag).toBe('dinerCone');
    expect(pr.owner).toBe('diner');
    expect(dist(pr.home, KIOSK)).toBeLessThan(8);
    expect(dist(DINER, KIOSK)).toBeLessThan(10);
    expect(GULL_PICNIC_V2.picnic!.raidAt).toBeUndefined(); // the raid comes with the race, not with a row count
    const take = GULL_PICNIC_V2.picnic!.takeTo!;
    expect(dist(take, PICNIC)).toBeGreaterThan(30);
    expect(Math.abs(take.x - PICNIC.x) > 4 || Math.abs(take.z - PICNIC.z) > 4).toBe(true);
  });

  it('the side orders and the secrets are still there, and the second star needs them', () => {
    expect([...setup.side]).toEqual(['freak', 'honkchain', 'bottleService']);
    expect([...setup.secret]).toEqual(['grannyScarf', 'oldBoot']);
    expect(setup.main).toEqual(['picnic', 'raid', 'picnicGong']);
    expect(GULL_PICNIC_V2.parTime).toBeGreaterThanOrEqual(480);
  });
});
