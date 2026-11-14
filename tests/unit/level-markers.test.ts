import { describe, expect, it } from 'vitest';
import { LevelStats, formatTime } from '../../src/gameplay/levelStats';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { BUN_CHECKPOINTS, CLOCK, FERRY, STATUE, TOY_SPOT } from '../../src/data/places';

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
  it('before anything starts, quests point at where to begin: the statue, the clock, the toy and the bun counter', () => {
    const q = new QuestLog(QUESTS);
    const m = activeMarkers(QUESTS, q.quests);
    const at = (p: { x: number; z: number }) => m.some((k) => k.x === p.x && k.z === p.z);
    expect([at(STATUE), at(CLOCK), at(TOY_SPOT)]).toEqual([true, true, true]);
    expect(m.map((k) => k.label)).toContain('Cinnamon buns');
    expect(m).toHaveLength(4);
  });
  it('after taking the cap the statue marker is replaced by the ferry', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('grab:statueCap'); // starting the quest also takes the cap
    const m = activeMarkers(QUESTS, q.quests);
    expect(m.some((k) => k.x === STATUE.x && k.z === STATUE.z)).toBe(false);
    expect(m.some((k) => k.x === FERRY.x && k.z === FERRY.z)).toBe(true);
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
  it('the unlocked finale points at the ferry cabin roof until it starts, then shows ALL its open objectives (parallel)', () => {
    const q = new QuestLog(QUESTS);
    const roof = (m: { x: number }) => m.x === FERRY.x - 5;
    expect(activeMarkers(QUESTS, q.quests).some(roof)).toBe(false);
    for (const e of ['alert', 'snatch:icecream', 'snatch:candy', 'tookItem:salmiakki', 'yuck', 'grab:statueCap', 'capDelivered', 'grab:bun', 'bun1', 'bun2', 'bun3', 'snatch:map', 'mapInSea', 'wrongFerry', 'snatch:flowers', 'poopNpc:dater', 'dateOver', 'grab:toy', 'tookItem:toy']) q.onEvent(e);
    for (let i = 0; i < 400; i++) q.tick({ dt: 1 / 60, carryingStolen: true, nearestNpc: 99 });
    expect(activeMarkers(QUESTS, q.quests).some(roof)).toBe(true);
    q.onEvent('finaleStart');
    const m = activeMarkers(QUESTS, q.quests);
    expect(m.some(roof)).toBe(false);
    expect(m.some((k) => k.x === 8 && k.z === -30)).toBe(true); // the pastry is marked even though the chairs come first
  });
});
