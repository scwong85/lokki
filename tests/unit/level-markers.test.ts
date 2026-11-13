import { describe, expect, it } from 'vitest';
import { LevelStats, formatTime } from '../../src/gameplay/levelStats';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { BUN_CHECKPOINTS, FERRY_FUNNEL, STATUE } from '../../src/data/places';

describe('level stats', () => {
  it('counts what happened, tracks the peak heat and the time', () => {
    const s = new LevelStats();
    s.add('snatch');
    s.add('snatch');
    s.add('poopWarden');
    s.add('dodge');
    s.tick(10, 30);
    s.tick(5, 80);
    s.tick(5, 20);
    expect(s.summary()).toMatchObject({ snatches: 2, poopsOnWarden: 1, dodges: 1, seconds: 20, peakHeat: 80 });
    s.reset();
    expect(s.summary().snatches).toBe(0);
  });
  it('formats time as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75)).toBe('1:15');
    expect(formatTime(600.4)).toBe('10:00');
  });
});

describe('quest markers', () => {
  it('points at the statue before the cap heist starts, then at the ferry roof', () => {
    const q = new QuestLog(QUESTS);
    const idle = activeMarkers(QUESTS, q.quests);
    expect(idle).toHaveLength(1); // the cap quest starts by taking the cap; the other idle quests have no start spot
    expect(idle[0]).toMatchObject({ x: STATUE.x, z: STATUE.z });
    q.onEvent('grab:statueCap'); // starting the quest also takes the cap
    const m = activeMarkers(QUESTS, q.quests);
    expect(m).toHaveLength(1);
    expect(m[0].y).toBeGreaterThan(5); // the ferry roof
  });
  it('bun ring shows one checkpoint at a time, in order', () => {
    const q = new QuestLog(QUESTS);
    const has = (i: number) => activeMarkers(QUESTS, q.quests).some((m) => m.x === BUN_CHECKPOINTS[i].x && m.z === BUN_CHECKPOINTS[i].z);
    expect([has(0), has(1), has(2)]).toEqual([false, false, false]); // not started: no checkpoint shown
    q.onEvent('grab:bun');
    expect([has(0), has(1), has(2)]).toEqual([true, false, false]);
    q.onEvent('bun1');
    expect([has(0), has(1), has(2)]).toEqual([false, true, false]);
  });
  it('the unlocked finale points at the ferry funnel until it starts', () => {
    const q = new QuestLog(QUESTS);
    const locked = activeMarkers(QUESTS, q.quests);
    expect(locked.some((m) => m.x === FERRY_FUNNEL.x)).toBe(false);
    for (const e of ['alert', 'snatch:icecream', 'snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:bun', 'bun1', 'bun2', 'bun3', 'snatch:map', 'mapInSea', 'wrongFerry']) q.onEvent(e);
    for (let i = 0; i < 400; i++) q.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 });
    expect(activeMarkers(QUESTS, q.quests).some((m) => m.x === FERRY_FUNNEL.x)).toBe(true);
    q.onEvent('finaleStart');
    expect(activeMarkers(QUESTS, q.quests).some((m) => m.x === FERRY_FUNNEL.x)).toBe(false);
  });
});
