import { describe, expect, it } from 'vitest';
import cityJson from '../../data/generated/kauppatori.json';
import { LEVELS } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { PROPS } from '../../src/data/props';
import { levelProgress, levelSetup } from '../../src/gameplay/level';
import { QuestLog } from '../../src/gameplay/quest';
import { RowScout, rowCount } from '../../src/gameplay/collection';
import { ladderSteps } from '../../src/gameplay/hintLadder';
import { Timetable } from '../../src/gameplay/timetable';
import { pointInRings } from '../../src/world/collision';
import { guestSeat } from '../../src/world/picnicGuests';
import { HALL } from '../../src/render/decor';
import { BLANKET, FLOAT, GULL_PICNIC, HALL_AT, PICNIC, PICNIC_QUEST, SHOUT } from '../../src/data/levels/picnic';

const land = (x: number, z: number) => (cityJson as unknown as { land: { rings: number[][] }[] }).land.some((l) => pointInRings(l.rings, x, z));
const inHall = (x: number, z: number) => Math.abs(x - HALL_AT.x) <= HALL.hx + 0.3 && Math.abs(z - HALL_AT.z) <= HALL.hz + 0.3;
const setup = levelSetup(GULL_PICNIC, QUESTS, TRIGGERS, TOURIST_SPAWNS);
const rows = PICNIC_QUEST.objectives.filter((o) => o.row);

describe('1.2 The Gull Picnic: the data', () => {
  it('is the first version of stage 1.2: kept in the Playground since M112 (the campaign\'s stage 1.2 is the second version)', () => {
    expect(GULL_PICNIC.id).toBe('a1s2'); // (the object is a stage; the Playground copy gets its own id)
    const v1 = LEVELS.find((l) => l.id === 'gull-picnic-v1')!;
    expect(v1.arc).toBeUndefined();
    expect(v1.gate).toEqual({ arc: 1, stage: 2 });
    expect(LEVELS.filter((l) => l.id === 'a1s2')).toHaveLength(1);
    expect(LEVELS.find((l) => l.id === 'a1s2')).not.toBe(GULL_PICNIC);
  });

  it('has six rows, each with an owner who is in the cast, a place, a wish and a ladder', () => {
    expect(rows).toHaveLength(6);
    const roles = new Set(setup.tourists.map((t) => t.role));
    for (const o of rows) {
      expect(roles.has(o.victim!), `${o.id}: victim ${o.victim} in the cast`).toBe(true);
      expect(o.row!.reveal.text.length).toBeGreaterThan(5);
      expect(o.nudge && o.hint && o.outcome, o.id).toBeTruthy();
      expect(o.markers?.length, o.id).toBeGreaterThan(0);
      expect(o.after, 'rows are done in any order').toBeUndefined();
    }
    // the half titles and the places are all different
    expect(new Set(rows.map((o) => o.row!.reveal.text)).size).toBe(6);
    expect(new Set(rows.map((o) => `${o.row!.reveal.x},${o.row!.reveal.z}`)).size).toBe(6);
  });

  it('every row is served by a trigger on the roof, for an item that is in the level (on the ground or in a hand)', () => {
    const tags = new Set([...(GULL_PICNIC.extraProps ?? []).map((p) => p.tag), ...setup.tourists.map((t) => t.holdTag)]);
    for (const o of [...rows, ...setup.quests.filter((q) => setup.secret.has(q.id)).flatMap((q) => q.objectives)]) {
      const t = setup.triggers.find((x) => x.kind === 'propInZone' && x.event === o.event);
      expect(t, `trigger for ${o.event}`).toBeTruthy();
      if (t?.kind !== 'propInZone') continue;
      expect(t.zone).toEqual(BLANKET);
      // the boot turns up later (the second false bite), everything else is there from the start
      if (t.tag !== 'oldBoot') expect(tags.has(t.tag), `${t.tag} is placed`).toBe(true);
    }
    const reactions = GULL_PICNIC.reactions ?? [];
    expect(reactions.some((r) => r.spawn?.tag === 'oldBoot')).toBe(true);
  });

  it('every watcher watches something that is there; the items fit in the beak', () => {
    const tags = new Set((GULL_PICNIC.extraProps ?? []).map((p) => p.tag));
    for (const t of setup.tourists.filter((x) => x.watch)) expect(tags.has(t.watch), `${t.role} watches ${t.watch}`).toBe(true);
    for (const type of ['tablecloth', 'loaf', 'herring', 'thermos', 'berries', 'vendace', 'scarf'] as const) expect(PROPS[type].mass).toBeLessThanOrEqual(1);
  });

  it('the places are on land and clear of the hall; the float is in the water', () => {
    for (const t of setup.tourists) {
      expect(land(t.x, t.z), `${t.role ?? 'tourist'} at ${t.x},${t.z} on land`).toBe(true);
      expect(inHall(t.x, t.z), `${t.role} not inside the hall`).toBe(false);
    }
    for (const p of GULL_PICNIC.extraProps ?? []) expect(inHall(p.x, p.z), `${p.type} not inside the hall`).toBe(false);
    expect(land(FLOAT.x, FLOAT.z)).toBe(false);
    const sz = GULL_PICNIC.splatZones![0].zone;
    expect(land((sz.minX + sz.maxX) / 2, (sz.minZ + sz.maxZ) / 2)).toBe(false);
  });

  it('at the finale every victim can walk in a straight line to the roof without going through the hall', () => {
    for (const [role, to] of Object.entries(SHOUT)) {
      const from = setup.tourists.find((t) => t.role === role)!;
      expect(from, role).toBeTruthy();
      for (let i = 0; i <= 40; i++) expect(inHall(from.x + ((to.x - from.x) * i) / 40, from.z + ((to.z - from.z) * i) / 40), `${role} walks into the hall`).toBe(false);
      expect(land(to.x, to.z)).toBe(true);
      const sent = (GULL_PICNIC.reactions ?? []).some((r) => r.on === 'picnicFeast' && r.send?.role === role);
      expect(sent, `${role} is sent at the finale`).toBe(true);
    }
  });

  it('every row uses a different trick (a different kind of first move)', () => {
    // the trait each row is solved with, from the level's own rules
    const trick: Record<string, boolean> = {
      cloth: setup.tourists.some((t) => t.role === 'waiter' && t.ritual?.toss),
      loaf: (GULL_PICNIC.switches ?? []).some((s) => s.hitOnly && s.role === 'baker'),
      herring: (GULL_PICNIC.reactions ?? []).some((r) => r.on === 'splash:float' && r.oblivious?.role === 'fisher'),
      thermos: (GULL_PICNIC.reactions ?? []).some((r) => r.on === 'ferryIn' && r.send?.role === 'captain'),
      berries: setup.tourists.filter((t) => t.watch === 'punnet').length === 2,
      vendace: PROPS.vendace.grab === 'ground' && setup.tourists.some((t) => t.holdTag === 'dinerCone'),
    };
    for (const o of rows) expect(trick[o.id], o.id).toBe(true);
  });

  it('the Berry Sellers stand back to back, far enough apart that the middle is behind both of them', () => {
    const [w, e] = ['berryW', 'berryE'].map((r) => setup.tourists.find((t) => t.role === r)!);
    expect(Math.abs(w.x - e.x)).toBeGreaterThan(5); // each more than 2.5 m from the punnet (closer than that you are always seen)
    // they face away from each other
    expect(Math.sign(-Math.sin(w.heading!))).toBe(-Math.sign(-Math.sin(e.heading!)));
    expect(-Math.sin(w.heading!) * (e.x - w.x)).toBeLessThan(0);
  });

  it('the raid only opens halfway, and the gong needs the picnic and the raid', () => {
    const raid = setup.quests.find((q) => q.id === 'raid')!;
    const gong = setup.quests.find((q) => q.id === 'picnicGong')!;
    expect(raid.requiresFlag).toBe('raid');
    expect(raid.hidden).toBe(true);
    expect(gong.requires).toEqual(['picnic', 'raid']);
    expect(GULL_PICNIC.picnic!.raidAt).toBe(3);
    const sw = GULL_PICNIC.switches!.find((s) => s.id === 'gong')!;
    expect(sw.y).toBe(PICNIC.y);
    expect(sw.free).toBe(true);
  });
});

describe('the picnic plays through', () => {
  it('rows tick in any order; the raid unlocks; the gong clears the stage; side orders and secrets are for the second star', () => {
    const log = new QuestLog(setup.quests);
    const st = () => log.quests;
    for (const id of ['vendace', 'cloth', 'thermos']) log.onEvent(`picnic:${id}`);
    const picnic = st().find((q) => q.id === 'picnic')!;
    expect(rowCount(PICNIC_QUEST, picnic)).toEqual({ done: 3, total: 6 });
    expect(st().find((q) => q.id === 'raid')!.status).toBe('locked');
    log.setFlag('raid', true);
    expect(st().find((q) => q.id === 'raid')!.status).toBe('active');
    log.onEvent('raidShooed');
    for (const id of ['berries', 'loaf', 'herring']) log.onEvent(`picnic:${id}`);
    expect(st().find((q) => q.id === 'picnicGong')!.status).toBe('active');
    log.onEvent('pecked:gong');
    const p = levelProgress(GULL_PICNIC, setup, st());
    expect(p.cleared).toBe(true);
    expect(p.allDone).toBe(false); // the side orders and the secrets are still open
  });
  it('a bun for the pigeons settles the raid too', () => {
    const log = new QuestLog(setup.quests);
    log.setFlag('raid', true);
    log.onEvent('pigeonsFriends');
    expect(log.quests.find((q) => q.id === 'raid')!.status).toBe('won');
  });
});

describe('row scouting', () => {
  const quests = () => new QuestLog(setup.quests).quests;
  const cloth = rows.find((o) => o.id === 'cloth')!.row!.reveal;
  it('a row is ??? far away, a half title nearer, the full wish right there; it sticks', () => {
    const sc = new RowScout();
    const q = quests();
    sc.update(setup.quests, q, { x: 200, z: 200 });
    expect(sc.sight('picnic:cloth')).toBe('hidden');
    sc.update(setup.quests, q, { x: cloth.x + cloth.r * 1.5, z: cloth.z });
    expect(sc.sight('picnic:cloth')).toBe('seen');
    sc.update(setup.quests, q, { x: cloth.x, z: cloth.z });
    expect(sc.sight('picnic:cloth')).toBe('known');
    expect(sc.focus).toBe('picnic:cloth');
    sc.update(setup.quests, q, { x: 200, z: 200 });
    expect(sc.sight('picnic:cloth')).toBe('known');
    expect(sc.focus, 'the focus stays until the row is done').toBe('picnic:cloth');
  });
  it('the hint ladder works on the focused row only', () => {
    const q = quests();
    expect(ladderSteps(setup.quests, q, null).filter((k) => k.startsWith('picnic:'))).toEqual([]);
    expect(ladderSteps(setup.quests, q, 'picnic:herring').filter((k) => k.startsWith('picnic:'))).toEqual(['picnic:herring']);
  });
  it('a done row loses the focus', () => {
    const sc = new RowScout();
    const log = new QuestLog(setup.quests);
    sc.update(setup.quests, log.quests, { x: cloth.x, z: cloth.z });
    log.onEvent('picnic:cloth');
    sc.update(setup.quests, log.quests, { x: 200, z: 200 });
    expect(sc.focus).toBeNull();
  });
});

describe('picnic helpers', () => {
  it('guests sit round the blanket on the roof, facing the middle', () => {
    for (let i = 0; i < 6; i++) {
      const s = guestSeat(i, 6, PICNIC);
      expect(Math.hypot(s.x - PICNIC.x, s.z - PICNIC.z)).toBeCloseTo(1.9);
      expect(s.y).toBeGreaterThan(PICNIC.y);
      // forward (-sin h, -cos h) points at the middle
      expect(-Math.sin(s.heading) * (PICNIC.x - s.x) + -Math.cos(s.heading) * (PICNIC.z - s.z)).toBeGreaterThan(1.8);
      expect(Math.abs(s.x - HALL_AT.x)).toBeLessThan(HALL.hx);
      expect(Math.abs(s.z - HALL_AT.z)).toBeLessThan(HALL.hz);
    }
  });
  it('a level can run its ferries more often', () => {
    const count = (gap?: number) => {
      const t = new Timetable(['ferry'], 17, gap);
      let n = 0;
      for (let i = 0; i < 600 * 10; i++) n += t.update(0.1).filter((e) => e.kind === 'ferry').length;
      return n;
    };
    expect(count(85)).toBeGreaterThan(count());
    expect(count(85)).toBeGreaterThanOrEqual(6); // ten minutes, a ferry about every 85 s
  });
});
