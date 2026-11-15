import { describe, expect, it } from 'vitest';
import { nextFocus } from '../../src/ui/menuNav';
import { PAD, padHelp, readMenu, type PadState } from '../../src/core/gamepad';

const col = [{ x: 100, y: 10 }, { x: 100, y: 50 }, { x: 100, y: 90 }];
describe('nextFocus', () => {
  it('moves down and up a column, and stays at the ends', () => {
    expect(nextFocus(col, 0, 'down')).toBe(1);
    expect(nextFocus(col, 1, 'down')).toBe(2);
    expect(nextFocus(col, 2, 'down')).toBe(2);
    expect(nextFocus(col, 1, 'up')).toBe(0);
    expect(nextFocus(col, 0, 'up')).toBe(0);
  });
  it('moves sideways in a row and picks the nearest in a grid', () => {
    const grid = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }];
    expect(nextFocus(grid, 0, 'right')).toBe(1);
    expect(nextFocus(grid, 1, 'down')).toBe(3);
    expect(nextFocus(grid, 3, 'left')).toBe(2);
    expect(nextFocus(grid, 2, 'right')).toBe(3);
  });
  it('starts at the first item and copes with nothing', () => {
    expect(nextFocus(col, -1, 'down')).toBe(0);
    expect(nextFocus([], 0, 'down')).toBe(-1);
  });
});

const pad = (pressed: number[] = [], axes: number[] = [0, 0, 0, 0]): PadState => ({ axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
describe('readMenu', () => {
  it('A and B are presses, only on the edge', () => {
    const held = { dir: null, t: 0 };
    expect(readMenu(pad([PAD.A]), [], held, 0.016)).toEqual(['a']);
    expect(readMenu(pad([PAD.A]), [true], held, 0.016)).toEqual([]);
    expect(readMenu(pad([PAD.B]), [], held, 0.016)).toEqual(['b']);
  });
  it('a direction fires once, then repeats while held', () => {
    const held: { dir: 'down' | null; t: number } = { dir: null, t: 0 };
    const p = pad([PAD.DOWN]);
    expect(readMenu(p, [], held as never, 0.016)).toEqual(['down']);
    let n = 0;
    for (let i = 0; i < 60; i++) n += readMenu(p, [], held as never, 0.016).length; // ~1 s held
    expect(n).toBeGreaterThanOrEqual(3);
    expect(readMenu(pad(), [], held as never, 0.016)).toEqual([]);
    expect(readMenu(pad([], [0, 0.9, 0, 0]), [], held as never, 0.016)).toEqual(['down']); // the stick works too
  });
});

describe('controller help', () => {
  it('lists every mapped button with a name', () => {
    const rows = padHelp();
    expect(rows.find((r) => r.button === 'X')?.action).toMatch(/Grab/);
    expect(rows.find((r) => r.button === 'B')?.action).toMatch(/Poop/);
    expect(rows.find((r) => r.button === 'D-pad left')?.action).toMatch(/Crow/);
    expect(rows.find((r) => r.button === 'RT')?.action).toMatch(/Dive/);
    expect(rows.every((r) => r.button && r.action)).toBe(true);
  });
});
