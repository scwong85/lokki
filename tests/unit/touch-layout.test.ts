import { describe, expect, it } from 'vitest';
import { BUTTON_IDS, clampSpot, defaultLayout, layoutFor, loadLayouts, mirror, sanitizeLayouts, saveLayouts } from '../../src/core/touchLayout';

describe('touch layout', () => {
  it('every button has a spot on screen, and the buttons do not sit on top of each other', () => {
    const l = defaultLayout('right');
    for (const id of BUTTON_IDS) {
      expect(l[id].x).toBeGreaterThan(0);
      expect(l[id].x).toBeLessThan(1);
    }
    for (const a of BUTTON_IDS) for (const b of BUTTON_IDS) if (a < b) expect(Math.hypot((l[a].x - l[b].x) * 16, (l[a].y - l[b].y) * 9)).toBeGreaterThan(1.1); // in "screen units" (16:9)
  });
  it('left-handed is the mirror image', () => {
    const r = defaultLayout('right'), l = defaultLayout('left');
    for (const id of BUTTON_IDS) {
      expect(l[id].x).toBeCloseTo(1 - r[id].x);
      expect(l[id].y).toBe(r[id].y);
    }
    expect(mirror(mirror(r))).toEqual(r);
  });
  it('saved spots win, junk is ignored, and spots stay on screen', () => {
    const saved = sanitizeLayouts({ right: { Space: { x: 0.5, y: 0.5 }, KeyE: { x: 'no', y: 1 }, KeyF: { x: 5, y: -3 } }, left: 7 });
    const l = layoutFor('right', saved);
    expect(l.Space).toEqual({ x: 0.5, y: 0.5 });
    expect(l.KeyE).toEqual(defaultLayout('right').KeyE);
    expect(l.KeyF).toEqual(clampSpot({ x: 5, y: -3 }));
    expect(layoutFor('left', saved)).toEqual(defaultLayout('left'));
  });
  it('saves and loads', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    saveLayouts({ left: { KeyQ: { x: 0.3, y: 0.3 } } }, st);
    expect(loadLayouts(st).left?.KeyQ).toEqual({ x: 0.3, y: 0.3 });
    expect(loadLayouts({ getItem: () => '{oops' })).toEqual({});
  });
});
