import { describe, expect, it } from 'vitest';
import { LevelStats, formatTime } from '../../src/gameplay/levelStats';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { FERRY_FUNNEL, STATUE } from '../../src/data/places';

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
  it('shows nothing for idle quests that have no start marker, and points at the next objective of an active quest', () => {
    const q = new QuestLog(QUESTS);
    expect(activeMarkers(QUESTS, q.quests)).toEqual([]);
    q.onEvent('grab:statueCap'); // cap heist starts: take the cap first
    let m = activeMarkers(QUESTS, q.quests);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ x: STATUE.x, z: STATUE.z });
    q.onEvent('grab:statueCap');
    m = activeMarkers(QUESTS, q.quests);
    expect(m[0].y).toBeGreaterThan(5); // now the ferry roof
  });
  it('bun ring shows one checkpoint at a time, in order', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('grab:bun');
    const first = activeMarkers(QUESTS, q.quests)[0];
    q.onEvent('bun1');
    const second = activeMarkers(QUESTS, q.quests)[0];
    expect(second.x).not.toBe(first.x);
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
