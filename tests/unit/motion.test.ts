import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { lampGlowMesh, motionUniforms, tickMotion } from '../../src/render/motion';
import { windowGlow } from '../../src/render/facadeTextures';
import { tuning } from '../../src/core/tuning';

describe('motion', () => {
  it('no lamps, no glow mesh', () => {
    expect(lampGlowMesh([])).toBeNull();
  });
  it('lamp glow is hidden by day and appears at dusk', () => {
    const mesh = lampGlowMesh([{ x: 0, y: 4, z: 0 }, { x: 5, y: 4, z: 2 }])!;
    expect(mesh.count).toBe(2);
    windowGlow.value = 0;
    tickMotion(1);
    expect(mesh.visible).toBe(false);
    windowGlow.value = 0.8;
    tickMotion(2);
    expect(mesh.visible).toBe(true);
    expect((mesh.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.4);
    windowGlow.value = 1;
    tickMotion(3);
    expect((mesh.material as THREE.MeshBasicMaterial).opacity).toBeLessThanOrEqual(0.85);
    windowGlow.value = 0;
  });
  it('the shared uniforms follow the clock and the tuning', () => {
    tickMotion(10);
    expect(motionUniforms.uTime.value).toBeCloseTo(10 * tuning.motion.swaySpeed.value, 5);
    expect(motionUniforms.uSway.value).toBe(tuning.motion.treeSway.value);
    expect(Math.hypot(motionUniforms.uWind.value.x, motionUniforms.uWind.value.y)).toBeLessThanOrEqual(1.0001);
  });
});
