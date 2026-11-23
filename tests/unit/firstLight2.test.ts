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
import { introducedAt } from '../../src/gameplay/mechanics';
import { BREAKFAST_QUEST, FIRST_LIGHT_V2, MESS_ZONE, DOCKHAND, BENCH, SELFIE, SLEEPER, LOST_A, LOST_B, LOST } from '../../src/data/levels/firstLight2';
import { HALL_AT } from '../../src/data/levels/picnic';

const land = (x: number, z: number) => (cityJson as unknown as { land: { rings: number[][] }[] }).land.some((l) => pointInRings(l.rings, x, z));
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const setup = levelSetup(FIRST_LIGHT_V2, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
const inHall = (x: number, z: number) => Math.abs(x - HALL_AT.x) < HALL.hx + 1 && Math.abs(z - HALL_AT.z) < HALL.hz + 1;

describe('stage 1.1 First Light: Breakfast on the Roof (M114)', () => {
  it('is the first campaign stage, with only the first verbs; the old one is in the Playground', () => {
    expect(LEVELS[0].id).toBe('a1s1');
    expect(introducedAt({ arc: 1, stage: 1 })).toEqual([]);
    const old = LEVELS.find((l) => l.id === 'first-light-v1')!;
    expect(old.arc).toBeUndefined();
    expect(old.gate).toEqual({ arc: 1, stage: 1 });
  });

  it('five rows in two courses (2 and 3), then the gong; the map is a side order; two gulls also pass the cone and pair up', () => {
    expect(BREAKFAST_QUEST.objectives.map((o) => o.id)).toEqual(['cone', 'lunch', 'thermos', 'hat', 'souvenir']);
    expect(courseCount(BREAKFAST_QUEST)).toBe(2);
    expect(courseRows(BREAKFAST_QUEST, 1).map((i) => BREAKFAST_QUEST.objectives[i].id)).toEqual(['cone', 'lunch']);
    expect(courseRows(BREAKFAST_QUEST, 2).map((i) => BREAKFAST_QUEST.objectives[i].id)).toEqual(['thermos', 'hat', 'souvenir']);
    expect(setup.main).toEqual(['picnic', 'picnicGong']);
    expect([...setup.side]).toEqual(['map']);
    const duo = levelSetup(FIRST_LIGHT_V2, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
    expect(duo.main).toEqual(['picnic', 'picnicGong', 'handoverCoop', 'twoBirds']);
  });

  it('every owner is 55 m or more from the roof (the Captain, at the berth, aside), and the rows are 35 m or more apart', () => {
    const rows = BREAKFAST_QUEST.objectives.filter((o) => o.row);
    for (const o of rows) {
      if (o.id === 'thermos') continue; // the ferry berth, 17 m away: its distance is the timetable
      expect(dist(o.row!.reveal, HALL_AT), o.id).toBeGreaterThan(55);
    }
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) expect(dist(rows[i].row!.reveal, rows[j].row!.reveal), `${rows[i].id} and ${rows[j].id}`).toBeGreaterThan(35);
  });

  it('everything stands on land and clear of the hall; the bun is dropped in front of the Dockhand, on the quay', () => {
    for (const t of setup.tourists) {
      expect(land(t.x, t.z), `${t.role ?? 'tourist'} at ${t.x},${t.z}`).toBe(true);
      expect(inHall(t.x, t.z), `${t.role} inside the hall`).toBe(false);
    }
    for (const p of FIRST_LIGHT_V2.extraProps ?? []) {
      expect(land(p.x, p.z), `${p.type} at ${p.x},${p.z}`).toBe(true);
      expect(inHall(p.x, p.z), `${p.type} inside the hall`).toBe(false);
    }
    for (const p of [DOCKHAND, BENCH, SELFIE, SLEEPER, LOST_A, LOST_B, LOST]) expect(land(p.x, p.z)).toBe(true);
    expect(land((MESS_ZONE.minX + MESS_ZONE.maxX) / 2, (MESS_ZONE.minZ + MESS_ZONE.maxZ) / 2)).toBe(true);
    expect(MESS_ZONE.maxX).toBeLessThan(DOCKHAND.x); // west of him: he faces it
  });

  it('a row is done when its item reaches the blanket, in any order within a course; the second course waits for the first', () => {
    const log = new QuestLog(setup.quests);
    log.onEvent('picnic:hat');
    log.onEvent('picnic:thermos');
    log.onEvent('picnic:souvenir');
    expect(log.quests.find((q) => q.id === 'picnic')!.objectives.filter((o) => o.done)).toHaveLength(0); // course 2 is closed
    log.onEvent('picnic:lunch');
    log.onEvent('picnic:cone');
    log.onEvent('picnic:hat');
    log.onEvent('picnic:thermos');
    log.onEvent('picnic:souvenir');
    expect(log.quests.find((q) => q.id === 'picnic')!.status).toBe('won');
    expect(log.quests.find((q) => q.id === 'picnicGong')!.status).toBe('active');
  });

  it('every item has a delivery trigger onto the blanket', () => {
    const have = new Set((FIRST_LIGHT_V2.extraTriggers ?? []).map((t) => ('event' in t ? t.event : '')));
    for (const o of BREAKFAST_QUEST.objectives) expect(have.has(o.event!), o.id).toBe(true);
  });
});
