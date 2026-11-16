import { describe, expect, it } from 'vitest';
import { BASE, HavocRun, applyEvent, breakChain, chainAlive, chainLeft, newChain, rankFor } from '../../src/gameplay/havoc/scoring';
import { RunLog } from '../../src/gameplay/runLog';
import { HAVOC_HOUR, LEVELS, levelById } from '../../src/data/levels';
import { blankSave, sanitize } from '../../src/core/save';

describe('chain scoring', () => {
  it('the first event scores its base; a different kind in the window raises the multiplier', () => {
    const s = newChain();
    expect(applyEvent(s, 'snatch', 0)!.gained).toBe(BASE.snatch);
    const r = applyEvent(s, 'poopNpc', 2)!;
    expect(r.mult).toBe(2);
    expect(r.gained).toBe(BASE.poopNpc * 2);
    expect(r.chained).toBe(true);
    expect(s.total).toBe(BASE.snatch + BASE.poopNpc * 2);
  });
  it('doing the same thing again does not raise the multiplier and scores less', () => {
    const s = newChain();
    applyEvent(s, 'snatch', 0);
    applyEvent(s, 'poopNpc', 1);
    const rep = applyEvent(s, 'snatch', 2)!;
    expect(rep.repeat).toBe(true);
    expect(rep.mult).toBe(2);
    expect(rep.gained).toBe(BASE.snatch * 2 * 0.5);
  });
  it('a chain dies after the window and starts again at x1', () => {
    const s = newChain();
    applyEvent(s, 'snatch', 0);
    applyEvent(s, 'poopNpc', 1);
    expect(chainAlive(s, 3)).toBe(true);
    expect(chainAlive(s, 30)).toBe(false);
    const r = applyEvent(s, 'photobomb', 30)!;
    expect(r.mult).toBe(1);
    expect(r.chained).toBe(false);
    expect(r.gained).toBe(BASE.photobomb);
  });
  it('the multiplier is capped and getting caught breaks the chain but keeps the points', () => {
    const s = newChain();
    const kinds = Object.keys(BASE);
    kinds.forEach((k, i) => applyEvent(s, k, i * 0.5));
    expect(s.mult).toBeLessThanOrEqual(8);
    const before = s.total;
    expect(breakChain(s)).toBeGreaterThan(0);
    expect(s.mult).toBe(0);
    expect(s.total).toBe(before);
    expect(s.bestMult).toBeGreaterThan(1);
  });
  it('things that are not mischief score nothing', () => {
    const s = newChain();
    expect(applyEvent(s, 'caw', 0)).toBeNull();
    expect(applyEvent(s, 'grab:bun', 0)).toBeNull();
    expect(s.total).toBe(0);
  });
  it('the meter shows how much of the window is left', () => {
    const s = newChain();
    expect(chainLeft(s, 0)).toBe(0);
    applyEvent(s, 'snatch', 0);
    expect(chainLeft(s, 0)).toBe(1);
    expect(chainLeft(s, 3)).toBeCloseTo(0.5, 5);
    expect(chainLeft(s, 7)).toBe(0);
  });
});

describe('a Havoc Hour run', () => {
  it('only scores after it starts and before it ends, and ends on the clock', () => {
    const r = new HavocRun(10);
    expect(r.feed('snatch')).toBeNull(); // not started
    r.start();
    expect(r.feed('snatch')).not.toBeNull();
    r.update(4);
    expect(r.left).toBe(6);
    r.hit();
    expect(r.chain.mult).toBe(0);
    r.update(7);
    expect(r.done).toBe(true);
    expect(r.left).toBe(0);
    const total = r.score;
    expect(r.feed('poopNpc')).toBeNull(); // over
    expect(r.score).toBe(total);
    expect(r.kinds.get('snatch')).toBe(1);
  });
});

describe('ranks, log, level and save', () => {
  it('ranks climb with the score', () => {
    expect(rankFor(0).index).toBe(0);
    expect(rankFor(1300).name).toBe('Troublemaker');
    expect(rankFor(999999).next).toBeNull();
  });
  it('the run log counts and tallies', () => {
    const l = new RunLog(3);
    l.add(0, 'a');
    l.add(1, 'b');
    l.add(2, 'a');
    l.add(3, 'c'); // pushes the first out
    expect(l.events.length).toBe(3);
    expect(l.count('a')).toBe(1);
    expect(l.tally()).toEqual({ b: 1, a: 1, c: 1 });
    l.clear();
    expect(l.events.length).toBe(0);
  });
  it('Havoc Hour is a level with no to-dos and a clock', () => {
    expect(LEVELS).toContain(HAVOC_HOUR);
    expect(levelById('havoc-hour')).toBe(HAVOC_HOUR);
    expect(HAVOC_HOUR.havoc!.seconds).toBeGreaterThan(30);
    expect(HAVOC_HOUR.quests).toEqual([]);
  });
  it('the best score survives a save round trip and junk becomes zero', () => {
    expect(blankSave().havocBest).toBe(0);
    expect(sanitize({ havocBest: 1234.7 }).havocBest).toBe(1234);
    expect(sanitize({ havocBest: 'lots' }).havocBest).toBe(0);
    expect(sanitize({ havocBest: -5 }).havocBest).toBe(0);
  });
});
