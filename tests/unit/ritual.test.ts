import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../../src/physics/physics';
import { PropManager } from '../../src/gameplay/props';
import { NpcManager } from '../../src/gameplay/npcs';
import { World } from '../../src/world/collision';
import { ritualLabel, ritualState, type Ritual } from '../../src/gameplay/ritual';
import { LEVELS } from '../../src/data/levels';
import type { NpcEvent } from '../../src/gameplay/npc';

beforeAll(async () => {
  await RAPIER.init();
});
const R: Ritual = { every: 20, hold: 4, icon: '😋' };

describe('ritual timing', () => {
  it('idle, then "3, 2, 1" over the head, then the ritual itself with its icon', () => {
    const labels = Array.from({ length: 20 }, (_, i) => ritualLabel(ritualState(i + 0.5, R), R) ?? '-');
    expect(labels.slice(0, 13).every((l) => l === '-')).toBe(true);
    expect(labels.slice(13, 16)).toEqual(['3', '2', '1']);
    expect(labels.slice(16)).toEqual(['😋', '😋', '😋', '😋']);
  });
  it('the phase offset puts two people out of step', () => {
    expect(ritualState(17, R).phase).toBe('hold');
    expect(ritualState(17, { ...R, phase: 10 }).phase).not.toBe('hold');
  });
});

describe('a person during their ritual', () => {
  it('sees nothing while it lasts, fires one event per ritual, and a frightened person skips it', () => {
    const phys = new PhysicsWorld(RAPIER);
    const props = new PropManager(phys, new THREE.Group());
    const npcs = new NpcManager(new World(), props, new THREE.Group(), () => true, 3);
    const n = npcs.spawn({ x: 0, z: 0, heading: Math.PI, color: 1, role: 'chef', stationary: true, ritual: R });
    const ev: NpcEvent[] = [];
    let sawLabel = false, blind = false;
    for (let i = 0; i < 60 * 41; i++) {
      ev.push(...npcs.update(1 / 60, { x: 0, y: 1, z: 3, diving: false })); // the gull right in front of him
      if (n.ritualLabel === '😋') { sawLabel = true; if (!n.seesGull) blind = true; }
    }
    expect(ev.filter((e) => e.type === 'ritual')).toHaveLength(2); // two rituals in 41 s
    expect(sawLabel && blind).toBe(true);
  });
  it('the trial puzzles give their key people a ritual', () => {
    const roles = LEVELS.filter((l) => l.series === 'Puzzles (new)').flatMap((l) => (l.extraTourists ?? []).filter((t) => t.ritual).map((t) => t.role));
    expect(roles.sort()).toEqual(['chef', 'cleaner', 'guard', 'mayor']);
  });
});
