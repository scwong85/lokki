import { describe, expect, it } from 'vitest';
import { newKalle, stepKalle, type KalleEvent, type Snack } from '../../src/gameplay/kalle';

const DT = 1 / 60;
const perch = { x: 0, z: 0 };
const run = (k: ReturnType<typeof newKalle>, snacks: Snack[], secs: number, gulls: { x: number; y: number; z: number; diving: boolean }[] = []) => {
  const ev: KalleEvent[] = [];
  for (let i = 0; i < secs * 60; i++) ev.push(...stepKalle(k, snacks, gulls, perch, DT));
  return ev;
};

describe('Kalle', () => {
  it('flies to the nearest free snack, carries it home and scores', () => {
    const k = newKalle(perch);
    const snacks: Snack[] = [{ id: 1, x: 30, y: 0.4, z: 0 }, { id: 2, x: -10, y: 0.4, z: 0 }];
    const ev = run(k, snacks.slice(), 12);
    expect(ev.find((e) => e.type === 'grab')).toEqual({ type: 'grab', id: 2 }); // the nearer one
    expect(ev.some((e) => e.type === 'deliver' && e.id === 2)).toBe(true);
    expect(k.score).toBeGreaterThanOrEqual(1); // and he goes back for the other one
  });
  it('gives up a snack that somebody else took', () => {
    const k = newKalle(perch);
    const snacks: Snack[] = [{ id: 1, x: 40, y: 0.4, z: 0 }];
    run(k, snacks.slice(), 2.5);
    expect(k.mode).toBe('seek');
    const ev = run(k, [], 1);
    expect(k.mode).toBe('perch');
    expect(ev.some((e) => e.type === 'grab')).toBe(false);
  });
  it('a diving gull close to him while he carries makes him drop it', () => {
    const k = newKalle(perch);
    const snacks: Snack[] = [{ id: 1, x: 12, y: 0.4, z: 0 }];
    let ev: KalleEvent[] = [];
    for (let i = 0; i < 60 * 12 && k.mode !== 'carry'; i++) ev = stepKalle(k, snacks, [], perch, DT);
    expect(k.mode).toBe('carry');
    const dropped = stepKalle(k, snacks, [{ x: k.x + 1, y: k.y + 1, z: k.z, diving: true }], perch, DT);
    expect(dropped).toEqual([{ type: 'dropped', id: 1 }]);
    expect(k.mode).toBe('flee');
    expect(ev).toBeTruthy();
  });
  it('does nothing without snacks', () => {
    const k = newKalle(perch);
    expect(run(k, [], 10)).toEqual([]);
    expect(k.score).toBe(0);
  });
});
