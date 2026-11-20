import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { World } from '../../src/world/collision';

describe('a "get away with it" step can be done', () => {
  it('never comes straight after a step that puts the loot down somewhere (you would have nothing left to carry away)', () => {
    const bad: string[] = [];
    for (const l of LEVELS) {
      const drops = new Set((l.extraTriggers ?? []).filter((t) => t.kind === 'propInZone').map((t) => ('event' in t ? t.event : '')));
      for (const q of l.extraQuests ?? []) {
        for (const o of q.objectives) {
          if (o.kind !== 'escape' || !o.after) continue;
          const prev = q.objectives.find((x) => x.id === o.after);
          if (prev?.event && drops.has(prev.event)) bad.push(`${l.id}/${q.id}/${o.id} after ${prev.event}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('level furniture is solid', () => {
  it('a sphere is pushed out of a furniture box and can stand on its top', () => {
    const w = new World();
    w.furniture.push({ min: [-1, 0, -1], max: [1, 0.9, 1], kind: 'perch', color: 0 });
    const p = { x: 0.9, y: 0.5, z: 0 };
    w.collide(p, 0.3);
    expect(Math.abs(p.x) >= 1.29 || p.y >= 1.19).toBe(true);
    expect(w.surfaceBelow(0, 0, 3).y).toBeCloseTo(0.9);
    w.furniture.length = 0;
    expect(w.surfaceBelow(0, 0, 3).y).toBe(0);
  });
});
