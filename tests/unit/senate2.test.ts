import { describe, expect, it } from 'vitest';
import { Tram } from '../../src/gameplay/tram';
import { PigeonGang } from '../../src/gameplay/pigeons';
import { World } from '../../src/world/collision';
import { LEVELS, TRAM_SURFING, TURF_WAR, NEW_LOOK } from '../../src/data/levels';
import { TRAM } from '../../src/data/levels/senate2';

const run = (t: Tram, secs: number, blocker: (t: Tram) => boolean = () => false) => {
  const ev: string[] = [];
  for (let i = 0; i < secs * 60; i++) for (const e of t.update(1 / 60, blocker(t))) ev.push(e.type);
  return ev;
};

describe('tram', () => {
  it('waits, sets off with a bell, stops at the stop and turns at the end', () => {
    const t = new Tram(TRAM);
    expect(t.mode).toBe('dwell');
    const ev = run(t, 12);
    expect(ev).toContain('bell');
    expect(t.x).toBeGreaterThan(TRAM.x0);
    run(t, 60);
    expect(t.x).toBeGreaterThan(TRAM.x0 - 1);
    // never leaves the track
    for (let i = 0; i < 3000; i++) {
      t.update(1 / 60, false);
      expect(t.x).toBeGreaterThanOrEqual(TRAM.x0 - 0.01);
      expect(t.x).toBeLessThanOrEqual(TRAM.x1 + 0.01);
    }
  });
  it('halts for a blocker, then clears after the driver is done', () => {
    const t = new Tram(TRAM);
    run(t, 6);
    const ev = run(t, 2, () => true);
    expect(ev).toContain('blocked');
    expect(t.mode).toBe('blocked');
    const x = t.x;
    run(t, 5, () => true);
    expect(t.x).toBe(x);
    const ev2 = run(t, 20, () => false);
    expect(ev2).toContain('cleared');
    expect(t.mode).not.toBe('blocked');
  });
  it('knows the roof and the track ahead', () => {
    const t = new Tram(TRAM);
    expect(t.onRoof(t.x, TRAM.z)).toBe(true);
    expect(t.onRoof(t.x + 20, TRAM.z)).toBe(false);
    expect(t.trackAhead(t.frontX + 5, TRAM.z, 9)).toBe(true);
    expect(t.trackAhead(t.frontX + 5, TRAM.z + 20, 9)).toBe(false);
    expect(t.trackAhead(t.frontX - 5, TRAM.z, 9)).toBe(false);
  });
});

describe('moving platforms in the world', () => {
  it('a mover box is a surface and pushes a sphere out', () => {
    const w = new World();
    const box = { min: [0, 2, 0] as [number, number, number], max: [4, 3, 2] as [number, number, number], kind: 'perch' as const, color: 0 };
    w.movers.push(box);
    expect(w.surfaceBelow(2, 1, 10).y).toBe(3);
    box.min = [10, 2, 0];
    box.max = [14, 3, 2];
    expect(w.surfaceBelow(2, 1, 10).y).toBe(0);
    expect(w.surfaceBelow(12, 1, 10).y).toBe(3);
  });
});

describe('pigeon gang', () => {
  const at = { x: 0, z: 0 };
  it('chases a gull near the statue and ignores a disguised one', () => {
    const g = new PigeonGang(at);
    const r = g.update(0.1, { x: 3, z: 0 }, []);
    expect(r.shove).not.toBeNull();
    expect(r.shove!.x).toBeGreaterThan(0);
    expect(g.update(0.1, null, []).shove).toBeNull();
  });
  it('a bun makes friends, salmiakki scatters, and they come back as friends', () => {
    const g = new PigeonGang(at);
    expect(g.update(0.1, null, [{ type: 'bun', x: 2, z: 0 }]).events.map((e) => e.type)).toContain('befriended');
    expect(g.mode).toBe('friends');
    expect(g.update(0.1, { x: 1, z: 0 }, []).shove).toBeNull();
    expect(g.update(0.1, null, [{ type: 'salmiakki', x: 2, z: 0 }]).events.map((e) => e.type)).toContain('scattered');
    expect(g.mode).toBe('scattered');
    let back = false;
    for (let i = 0; i < 60 * 40; i++) if (g.update(1 / 60, null, []).events.some((e) => e.type === 'back')) back = true;
    expect(back).toBe(true);
    expect(g.mode).toBe('friends');
  });
  it('far-away food does nothing', () => {
    const g = new PigeonGang(at);
    expect(g.update(0.1, null, [{ type: 'bun', x: 80, z: 0 }]).events).toEqual([]);
  });
});

describe('levels S4-S6', () => {
  it('are registered in order with their mechanics', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.indexOf('tram-surfing')).toBe(ids.indexOf('ding-dong') + 1);
    expect(TRAM_SURFING.tram).toBeDefined();
    expect(TURF_WAR.pigeons).toBeDefined();
    // no precision landing or drops: no statue perch, no zones to drop things in
    for (const l of [TRAM_SURFING, TURF_WAR, NEW_LOOK]) expect((l.extraTriggers ?? []).filter((t) => t.kind === 'gullInZone' || t.kind === 'propInZone')).toEqual([]);
    expect(NEW_LOOK.extraQuests!.some((q) => q.id === 'wardrobe')).toBe(true);
    expect(TURF_WAR.requires).toBe('tram-surfing');
    expect(NEW_LOOK.requires).toBe('turf-war');
  });
});
