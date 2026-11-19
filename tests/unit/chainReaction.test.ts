import { describe, it, expect } from 'vitest';
import { ChainDetector, IdleNudge, badgesEarned, kindOf } from '../../src/gameplay/chainReaction';
import { sanitize, blankSave } from '../../src/core/save';

describe('chain reactions', () => {
  it('three different reactions within the window make a chain reaction, once per burst', () => {
    const c = new ChainDetector();
    expect(c.feed(0, 'tipChair')).toBeNull();
    expect(c.feed(2, 'knockdown:2')).toBeNull();
    const hit = c.feed(4, 'soaked');
    expect(hit?.kinds).toBe(3);
    expect(hit?.chain).toEqual(['tipChair', 'knockdown', 'soaked']);
    expect(c.feed(5, 'yuck')).toBeNull(); // cooling down
    expect(c.best).toBe(3);
  });
  it('the same thing again is not a chain, and old reactions drop out of the window', () => {
    const c = new ChainDetector();
    for (let i = 0; i < 6; i++) expect(c.feed(i, 'snatch')).toBeNull();
    expect(c.feed(30, 'tipChair')).toBeNull();
    expect(c.feed(32, 'yuck')).toBeNull();
    expect(c.feed(45, 'soaked')).toBeNull(); // the first two are too old
  });
  it('things that are not reactions (to-do bookkeeping, grabs) are ignored', () => {
    const c = new ChainDetector();
    expect(c.feed(0, 'grab:cap')).toBeNull();
    expect(c.feed(1, 'pecked:juke')).toBeNull();
    expect(kindOf('dancers:5')).toBe('dancers');
    expect(c.best).toBe(0);
  });
  it('after the cooldown a new chain can fire; reset forgets everything', () => {
    const c = new ChainDetector();
    c.feed(0, 'tipChair'); c.feed(1, 'yuck');
    expect(c.feed(2, 'soaked')).not.toBeNull();
    c.feed(40, 'tipChair'); c.feed(41, 'yuck');
    expect(c.feed(42, 'soaked')).not.toBeNull();
    c.reset();
    expect(c.best).toBe(0);
  });
  it('badges come from the tally and the best chain', () => {
    expect(badgesEarned({}, 0)).toEqual([]);
    expect(badgesEarned({}, 3).map((b) => b.id)).toEqual(['chain3']);
    expect(badgesEarned({ 'dancers:5': 1, 'knockdown:4': 2 }, 5).map((b) => b.id)).toEqual(['chain3', 'chain5', 'party', 'skittles']);
  });
  it('saves keep badges and survive garbage', () => {
    expect(blankSave().badges).toEqual([]);
    expect(sanitize({ badges: ['party', 3, 'chain3'] }).badges).toEqual(['party', 'chain3']);
    expect(sanitize({ badges: 'x' }).badges).toEqual([]);
  });
});

describe('idle nudge', () => {
  it('speaks after a quiet while, then now and then, and starts over after anything happens', () => {
    const n = new IdleNudge();
    let said = 0;
    for (let i = 0; i < 74; i++) if (n.update(1, 75, 60)) said++;
    expect(said).toBe(0);
    expect(n.update(1, 75, 60)).toBe(true);
    for (let i = 0; i < 59; i++) expect(n.update(1, 75, 60)).toBe(false);
    expect(n.update(1, 75, 60)).toBe(true);
    expect(n.count).toBe(2);
    n.poke();
    expect(n.update(1, 75, 60)).toBe(false);
    expect(n.count).toBe(0);
  });
});
