import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { levelSetup } from '../../src/gameplay/level';
import { QuestLog } from '../../src/gameplay/quest';
import { RowCompass, RowScout } from '../../src/gameplay/collection';
import { DiveReview } from '../../src/gameplay/diveReview';
import { waitLine, clock } from '../../src/gameplay/waits';
import { nextWindow } from '../../src/gameplay/defense';
import { Timetable } from '../../src/gameplay/timetable';
import { sanitizeOptions, applyOptions, defaultOptions } from '../../src/core/options';
import { assist } from '../../src/core/assist';
import { newNpc, snatchState, handPos } from '../../src/gameplay/npc';

describe('the row compass (M120)', () => {
  const def = LEVELS.find((l) => l.id === 'a1s1')!;
  const setup = levelSetup(def, QUESTS, TRIGGERS, TOURIST_SPAWNS, false);
  it('points at the nearest open row not found yet, only after a stretch with no progress, and starts over on progress', () => {
    const log = new QuestLog(setup.quests);
    const scout = new RowScout();
    const c = new RowCompass();
    const home = { x: -14, z: -17 };
    expect(c.update(30, 60, setup.quests, log.quests, scout, home)).toBeNull();
    const p = c.update(31, 60, setup.quests, log.quests, scout, home)!;
    expect(p).not.toBeNull();
    // the nearest open (course 1) row from the roof: the Selfie Tourist (east) or the Dockhand (west), never a course 2 row
    const rows = setup.quests.find((q) => q.id === 'picnic')!.objectives.filter((o) => o.row && (o.row.course ?? 1) === 1).map((o) => o.row!.reveal);
    expect(rows.some((r) => r.x === p.x && r.z === p.z)).toBe(true);
    // finding a row is progress: the compass waits again
    scout.update(setup.quests, log.quests, { x: p.x, z: p.z });
    expect(c.update(1, 60, setup.quests, log.quests, scout, home)).toBeNull();
  });
});

describe('near-miss feedback (M120)', () => {
  it('a dive that came close and missed says by how much; a blocked one says the body was in the way; a catch says nothing', () => {
    const r = new DiveReview();
    r.step(true, false, { d: 3, blocked: false }, 2, 4);
    r.step(true, false, { d: 2.6, blocked: false }, 2, 4);
    expect(r.step(false, false, null, 2, 4)).toMatch(/Missed by 0\.6 m/);
    r.step(true, false, { d: 1.5, blocked: true }, 2, 4);
    expect(r.step(false, false, null, 2, 4)).toMatch(/body was in the way/);
    r.step(true, false, { d: 1, blocked: false }, 2, 4);
    expect(r.step(false, true, null, 2, 4)).toBeNull(); // got it
    r.step(true, false, { d: 9, blocked: false }, 2, 4);
    expect(r.step(false, false, null, 2, 4)).toBeNull(); // nowhere near: no lecture
    expect(r.step(false, false, null, 2, 4)).toBeNull(); // only once per dive
  });
});

describe('the waits line (M120)', () => {
  it('counts down to the ferry and the Warden\'s lunch', () => {
    expect(clock(70)).toBe('1:10');
    expect(waitLine({ ferry: 40, lunch: 70 })).toBe('⛴ Next ferry in 0:40 · 🥪 Warden\'s lunch in 1:10');
    expect(waitLine({ ferry: 0 })).toBe('⛴ The ferry is in');
    expect(waitLine({})).toBe('');
  });
  it('a repeating window: before, during, between, and one that is over', () => {
    expect(nextWindow(5, 18, 40, 100)).toBe(13);
    expect(nextWindow(30, 18, 40, 100)).toBe(0);
    expect(nextWindow(70, 18, 40, 100)).toBe(48);
    expect(nextWindow(70, 18, 40)).toBeNull();
  });
  it('the timetable says when the next ferry comes', () => {
    const t = new Timetable(['ferry'], 17);
    const first = t.nextIn('ferry')!;
    expect(first).toBeGreaterThan(0);
    t.update(5);
    expect(t.nextIn('ferry')).toBeCloseTo(first - 5, 5);
    expect(t.nextIn('rain')).toBeNull();
  });
});

describe('the course "next" line (M120)', () => {
  it('every later course of the act 1 stages says where to look', () => {
    for (const id of ['a1s1', 'a1s2', 'a1s3', 'a1s4', 'a1s5']) {
      const q = LEVELS.find((l) => l.id === id)!.extraQuests!.find((x) => x.id === 'picnic')!;
      for (const c of q.collect!.courses!.slice(1)) expect(c.where, `${id} ${c.name}`).toBeTruthy();
    }
  });
});

describe('relaxed play (M120)', () => {
  it('is an option, off by default, and when on a snatch reaches further', () => {
    expect(defaultOptions().easy).toBe(false);
    expect(sanitizeOptions({ easy: true }).easy).toBe(true);
    const n = newNpc(1, { x: 0, z: 0, heading: 0, ice: true, color: 0 });
    n.holding = 5;
    const h = handPos(n);
    const beak = { x: h.x, y: h.y + 1.5, z: h.z };
    applyOptions({ ...defaultOptions(), easy: false });
    expect(snatchState(n, beak)).not.toBe('ok');
    applyOptions({ ...defaultOptions(), easy: true });
    expect(assist.easy).toBe(true);
    expect(snatchState(n, beak)).toBe('ok');
    applyOptions(defaultOptions());
    expect(assist.easy).toBe(false);
  });
});
