import { describe, expect, it } from 'vitest';
import { placeWaypoint } from '../../src/gameplay/waypoints';
import { activeMarkers } from '../../src/gameplay/questMarkers';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { CLOCK } from '../../src/data/places';
import { PROPS } from '../../src/data/props';

describe('waypoint placement', () => {
  const W = 1000, H = 600;
  it('puts the label on the marker when it is in view', () => {
    const p = placeWaypoint(0, 0, false, W, H);
    expect(p).toMatchObject({ x: 500, y: 300, onScreen: true });
    const q = placeWaypoint(1, 1, false, W, H); // top-right corner of the view
    expect(q.onScreen).toBe(true);
    expect(q.x).toBeCloseTo(1000);
    expect(q.y).toBeCloseTo(0);
  });
  it('clamps off-screen goals to the edge and points the arrow at them', () => {
    const right = placeWaypoint(3, 0, false, W, H);
    expect(right.onScreen).toBe(false);
    expect(right.x).toBe(W - 48);
    expect(right.angle).toBeCloseTo(0); // pointing right
    const left = placeWaypoint(-3, 0, false, W, H);
    expect(left.x).toBe(48);
    expect(Math.abs(left.angle)).toBeCloseTo(Math.PI);
    const up = placeWaypoint(0, 3, false, W, H);
    expect(up.y).toBe(48);
    expect(up.angle).toBeCloseTo(-Math.PI / 2); // screen y is down, so "up" is negative
  });
  it('a goal behind the camera is shown at the edge, not in the middle of the screen', () => {
    const p = placeWaypoint(0.1, 0.1, true, W, H);
    expect(p.onScreen).toBe(false);
    const exact = placeWaypoint(0, 0, true, W, H);
    expect(exact.onScreen).toBe(false);
    expect(exact.y).toBe(H - 48); // straight behind: bottom edge
  });
});

describe('finding things', () => {
  it('every marker the player is pointed at has a label for its waypoint', () => {
    for (const q of QUESTS) {
      for (const m of q.startMarkers ?? []) expect(m.label, `${q.id} start marker`).toBeTruthy();
      for (const o of q.objectives) for (const m of o.markers ?? []) expect(m.label, `${q.id}/${o.id}`).toBeTruthy();
    }
  });
  it('the statue, the clock and the teddy are all pointed at before their quests start', () => {
    const labels = activeMarkers(QUESTS, new QuestLog(QUESTS).quests).map((m) => m.label);
    expect(labels).toEqual(expect.arrayContaining(['Student cap', 'Blind date', 'Teddy bear']));
  });
  it('the blind date stands well clear of the clock so a dive onto them is never blocked by it', () => {
    const couple = TOURIST_SPAWNS.filter((s) => s.role === 'dater');
    expect(couple).toHaveLength(2);
    for (const c of couple) expect(Math.hypot(c.x - CLOCK.x, c.z - CLOCK.z)).toBeGreaterThan(2.5);
  });
  it('the teddy is big enough to spot', () => {
    expect(PROPS.toy.radius).toBeGreaterThanOrEqual(0.5);
  });
});
