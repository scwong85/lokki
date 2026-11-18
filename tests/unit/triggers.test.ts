import { describe, expect, it } from 'vitest';

describe('carry checkpoints', () => {
  it('a route is followed when only its last event is wanted (the quest waits for "conducted")', async () => {
    const { TriggerSystem } = await import('../../src/gameplay/triggers');
    const t = new TriggerSystem([{ id: 'route', kind: 'carryCheckpoints', propType: 'baton', points: [{ x: 0, z: 0, r: 2 }, { x: 10, z: 0, r: 2 }], events: ['a', 'done'] }]);
    const ctx = (x: number) => ({ props: [], gull: { x, y: 1, z: 0, grounded: false }, carried: { type: 'baton' as const, x, y: 1, z: 0, free: false }, isLand: () => true });
    expect(t.update(ctx(0) as never, new Set(['done']))).toEqual(['a']);
    expect(t.update(ctx(10) as never, new Set(['done']))).toEqual(['done']);
  });
});
