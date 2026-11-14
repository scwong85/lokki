import { describe, expect, it } from 'vitest';
import { OptionsStore, defaultOptions, sanitizeOptions, applyOptions } from '../../src/core/options';
import type { StorageLike } from '../../src/core/save';
import { Tutorial } from '../../src/gameplay/tutorial';
import { TUTORIAL } from '../../src/data/tutorial';
import { tuning } from '../../src/core/tuning';

const fake = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('options', () => {
  it('sanitises junk and clamps ranges', () => {
    const d = defaultOptions();
    expect(sanitizeOptions(null)).toEqual(d);
    const o = sanitizeOptions({ master: 5, music: -2, sfx: 'x', sensitivity: 99, shake: 0.4, tutorialDone: true });
    expect(o.master).toBe(1);
    expect(o.music).toBe(0);
    expect(o.sfx).toBe(d.sfx);
    expect(o.sensitivity).toBe(0.01);
    expect(o.shake).toBe(0.4);
    expect(o.tutorialDone).toBe(true);
  });

  it('round-trips through storage and survives broken storage', () => {
    const st = fake();
    const store = new OptionsStore(st);
    const o = { ...defaultOptions(), music: 0.2, tutorialDone: true };
    store.save(o);
    expect(store.load()).toEqual(o);
    st.setItem('lokki-options-v1', '{oops');
    expect(store.load()).toEqual(defaultOptions());
    const boom: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => undefined };
    expect(() => new OptionsStore(boom).save(o)).not.toThrow();
    expect(new OptionsStore(boom).load()).toEqual(defaultOptions());
    expect(new OptionsStore(null).load()).toEqual(defaultOptions());
  });

  it('applies to the tuning object', () => {
    const before = { ...defaultOptions() };
    applyOptions({ ...before, music: 0.1, shake: 0 });
    expect(tuning.audio.music.value).toBe(0.1);
    expect(tuning.juice.shake.value).toBe(0);
    applyOptions(before);
  });
});

describe('tutorial', () => {
  it('goes through the steps in order and ignores out-of-order events', () => {
    const t = new Tutorial(true);
    expect(t.current?.on).toBe(TUTORIAL[0].on);
    expect(t.event('poop')).toBe(false);
    expect(t.step).toBe(0);
    let done = false;
    for (const s of TUTORIAL) done = t.event(s.on);
    expect(done).toBe(true);
    expect(t.current).toBeNull();
    expect(t.outroShowing).toBe(true);
    expect(t.tick(1)).toBe(false);
    expect(t.tick(3)).toBe(true);
    expect(t.running).toBe(false);
    expect(t.outroShowing).toBe(false);
  });

  it('inactive or skipped tutorials do nothing', () => {
    const off = new Tutorial(false);
    expect(off.current).toBeNull();
    expect(off.event('move')).toBe(false);
    const t = new Tutorial(true);
    t.skip();
    expect(t.current).toBeNull();
    t.restart();
    expect(t.current?.on).toBe(TUTORIAL[0].on);
  });
});
