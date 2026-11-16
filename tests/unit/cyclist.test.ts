import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Cyclist } from '../../src/world/streetLife';
import type { Walker } from '../../src/gameplay/streetLife';

describe('cyclist', () => {
  it('rides forwards: the bike\'s front (its -z side) points where the walker heads', () => {
    const c = new Cyclist(0xff9ec4, 0x6ab7ff);
    for (const heading of [0, 0.7, -2.1, 3]) {
      c.apply({ id: 1, kind: 'bike', x: 5, z: -3, heading, tx: 0, tz: 0, wait: 0, speed: 4, phase: 0, moving: true } as Walker);
      const front = new THREE.Vector3(0, 0, -1).applyQuaternion(c.root.quaternion);
      // a heading of 0 faces -z, and the step is (-sin h, -cos h): the bike must travel the way its front points
      expect(front.x).toBeCloseTo(-Math.sin(heading), 5);
      expect(front.z).toBeCloseTo(-Math.cos(heading), 5);
    }
  });
});
