import { describe, expect, it } from 'vitest';
import cityJson from '../../data/generated/kauppatori.json';
import { LEVELS } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { levelSetup } from '../../src/gameplay/level';
import { QuestLog } from '../../src/gameplay/quest';
import { courseCount, courseRows } from '../../src/gameplay/collection';
import { pointInRings } from '../../src/world/collision';
import { HALL } from '../../src/render/decor';
import { HALL_AT } from '../../src/data/levels/picnic';
import { sh, shHides, shSpawns, shSwitches, shSplat } from '../../src/data/levels/relocate';
import { MARKET_DAY_HEIST } from '../../src/data/levels/heist';
import { ONE_BAD_AFTERNOON } from '../../src/data/levels/badAfternoon';
import { THE_WARDEN_DAY } from '../../src/data/levels/wardenDay';

const land = (x: number, z: number) => (cityJson as unknown as { land: { rings: number[][] }[] }).land.some((l) => pointInRings(l.rings, x, z));
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const inHall = (x: number, z: number) => Math.abs(x - HALL_AT.x) < HALL.hx + 1 && Math.abs(z - HALL_AT.z) < HALL.hz + 1;

/** Rows in a vendor's corner (fixed in the city) or by the roof (the boss) are not spread out: they are the stake. */
const fixed: Record<string, string[]> = { a1s3: ['bun', 'lunch'], a1s4: [], a1s5: [] };
const stages = [
  { id: 'a1s3', def: MARKET_DAY_HEIST, rows: 6, courses: [2, 2, 2] },
  { id: 'a1s4', def: ONE_BAD_AFTERNOON, rows: 4, courses: [2, 2] },
  { id: 'a1s5', def: THE_WARDEN_DAY, rows: 3, courses: [2, 1] },
];

describe('relocating an older level\'s cluster', () => {
  it('moves people, patrols, bushes, switches and splat zones by the same amount', () => {
    const s = { dx: 10, dz: -20 };
    expect(shSpawns([{ x: 1, z: 2, color: 0, patrol: [{ x: 3, z: 4 }], signAt: { x: 5, z: 6 } }], s)[0]).toMatchObject({ x: 11, z: -18, patrol: [{ x: 13, z: -16 }], signAt: { x: 15, z: -14 } });
    expect(shHides([{ x: 0, z: 0, r: 2 }], s)).toEqual([{ x: 10, z: -20, r: 2 }]);
    expect(shSwitches([{ id: 'a', x: 1, z: 1, label: 'a', effect: 'soak', target: { x: 2, z: 2 } }], s)[0]).toMatchObject({ x: 11, z: -19, target: { x: 12, z: -18 } });
    expect(shSplat([{ event: 'e', zone: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 } }], s)[0].zone).toEqual({ minX: 10, maxX: 11, minZ: -20, maxZ: -19 });
    expect(sh({ x: 1, z: 1, r: 3 }, s)).toEqual({ x: 11, z: -19, r: 3 });
  });
});

for (const { id, def, rows, courses } of stages) {
  describe(`stage ${id} (${def.name})`, () => {
    const setup = levelSetup(def, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
    const quest = setup.quests.find((q) => q.id === 'picnic')!;
    const rowObjs = quest.objectives.filter((o) => o.row);

    it(`has ${rows} rows in courses ${courses.join(' + ')}, and every row has a delivery trigger and a victim`, () => {
      expect(rowObjs.length).toBe(rows);
      expect(courseCount(quest)).toBe(courses.length);
      courses.forEach((n, i) => expect(courseRows(quest, i + 1).length).toBe(n));
      const have = new Set((def.extraTriggers ?? []).map((t) => ('event' in t ? t.event : '')));
      for (const o of rowObjs) {
        expect(have.has(o.event!), o.id).toBe(true);
        expect(o.victim, o.id).toBeTruthy();
        expect(o.nudge && o.hint && o.outcome, o.id).toBeTruthy();
      }
    });

    it('the rows are spread out: owners 55 m or more from the roof and 35 m or more from each other, except the vendor\'s corner', () => {
      const free = rowObjs.filter((o) => !fixed[id].includes(o.id));
      for (const o of free) expect(dist(o.row!.reveal, HALL_AT), `${o.id} from the roof`).toBeGreaterThan(55);
      for (let i = 0; i < rowObjs.length; i++)
        for (let j = i + 1; j < rowObjs.length; j++) {
          if (fixed[id].includes(rowObjs[i].id) && fixed[id].includes(rowObjs[j].id)) continue;
          expect(dist(rowObjs[i].row!.reveal, rowObjs[j].row!.reveal), `${rowObjs[i].id} and ${rowObjs[j].id}`).toBeGreaterThan(35);
        }
    });

    it('everything stands on land and clear of the hall', () => {
      for (const t of setup.tourists) {
        expect(land(t.x, t.z), `${t.role ?? 'tourist'} at ${t.x},${t.z}`).toBe(true);
        expect(inHall(t.x, t.z), `${t.role} inside the hall`).toBe(false);
      }
      for (const p of def.extraProps ?? []) {
        expect(land(p.x, p.z), `${p.type} at ${p.x},${p.z}`).toBe(true);
        expect(inHall(p.x, p.z), `${p.type} inside the hall`).toBe(false);
      }
      for (const h of def.hides ?? []) expect(land(h.x, h.z), 'bush').toBe(true);
      for (const w of def.switches ?? []) expect(land(w.x, w.z) || w.y !== undefined, `${w.id} switch`).toBe(true);
      for (const st of def.stations ?? []) expect(land(st.x, st.z), 'station').toBe(true);
      for (const t of setup.tourists) for (const p of t.patrol ?? []) expect(land(p.x, p.z), 'patrol').toBe(true);
    });

    it('a row is done when its item reaches the blanket; a later course waits for the one before', () => {
      const log = new QuestLog(setup.quests);
      const last = courseRows(quest, courses.length).map((i) => quest.objectives[i].event!);
      for (const e of last) log.onEvent(e);
      if (courses.length > 1) expect(log.quests.find((q) => q.id === 'picnic')!.objectives.filter((o) => o.done)).toHaveLength(0);
      for (let c = 1; c <= courses.length; c++) for (const i of courseRows(quest, c)) log.onEvent(quest.objectives[i].event!);
      expect(log.quests.find((q) => q.id === 'picnic')!.status).toBe('won');
    });
  });
}

describe('the held things carry the tags the rows ask for', () => {
  it('every row\'s tag is held by somebody (or lies in the stage, or is bought at a station)', () => {
    for (const { def } of stages) {
      const q = def.extraQuests!.find((x) => x.id === 'picnic')!;
      const tags = new Set<string>([...(def.extraTourists ?? []).map((t) => t.holdTag ?? ''), ...(def.extraProps ?? []).map((p) => p.tag ?? ''), ...(def.stations ?? []).map((s) => s.tagBought ?? ''), ...(def.switches ?? []).map((w) => w.goods?.tag ?? '')]);
      for (const o of q.objectives) if (o.row) expect(tags.has(o.row.tag ?? ''), `${def.id}/${o.id} wants "${o.row.tag}"`).toBe(true);
    }
  });
  it('the clothBun comes from the tablecloth switch and the boss starts after the rows', () => {
    expect(THE_WARDEN_DAY.switches!.some((w) => w.goods?.tag === 'clothBun')).toBe(true);
    expect(LEVELS.find((l) => l.id === 'a1s5')!.extraQuests!.find((q) => q.id === 'nemesis')!.requires).toEqual(['picnic']);
  });
});

describe('one row opens the next course (M118)', () => {
  it('in the heist, one row of a course opens the following one, and the course is "served" at that moment', () => {
    const setup = levelSetup(MARKET_DAY_HEIST, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
    const log = new QuestLog(setup.quests);
    const q = () => log.quests.find((x) => x.id === 'picnic')!;
    log.onEvent('picnic:bun'); // course 2: closed
    expect(q().objectives.filter((o) => o.done)).toHaveLength(0);
    const notes = log.onEvent('picnic:boo');
    expect(notes).toContainEqual({ type: 'course', quest: 'picnic', course: 1 });
    expect(log.onEvent('picnic:bun')).toContainEqual({ type: 'objective', quest: 'picnic', objective: 'bun' });
    expect(log.onEvent('picnic:lunch')).toContainEqual({ type: 'objective', quest: 'picnic', objective: 'lunch' });
    // the stage is still won only when every row is done
    expect(q().status).toBe('active');
    for (const e of ['picnic:balloon', 'picnic:soup', 'picnic:queue']) log.onEvent(e);
    expect(q().status).toBe('won');
  });
  it('a course without "need" still wants every row (1.1 to 1.2, 1.4, 1.5)', () => {
    const setup = levelSetup(ONE_BAD_AFTERNOON, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
    const log = new QuestLog(setup.quests);
    log.onEvent('picnic:mapper');
    log.onEvent('picnic:dancer'); // course 2: still closed, only half of course 1 is done
    expect(log.quests.find((x) => x.id === 'picnic')!.objectives.find((o) => o.id === 'dancer')!.done).toBe(false);
  });
});
