import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cloudNoise, cloudUniforms, flagMesh, lampGlowMesh, motionUniforms, tickMotion } from '../../src/render/motion';
import { PUFFS } from '../../src/render/puffs';
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

  it('flags: none for no spots, one instance per spot otherwise', () => {
    expect(flagMesh([])).toBeNull();
    const f = flagMesh([{ x: 0, z: 0, rot: 0 }, { x: 5, z: 1, rot: 1 }])!;
    expect(f.count).toBe(2);
  });
  it('cloud noise is tileable-sized, seeded, varied and in range', () => {
    const a = cloudNoise(32, 32, 3);
    expect(a.length).toBe(32 * 32);
    expect(cloudNoise(32, 32, 3)).toEqual(a);
    expect(cloudNoise(32, 32, 4)).not.toEqual(a);
    expect(Math.max(...a)).toBeGreaterThan(Math.min(...a) + 40);
  });
  it('the cloud shadows drift with time and follow the tuning', () => {
    tickMotion(0);
    const x0 = cloudUniforms.uCloudOff.value.x + cloudUniforms.uCloudOff.value.y;
    tickMotion(100);
    expect(cloudUniforms.uCloudOff.value.x + cloudUniforms.uCloudOff.value.y).not.toBe(x0);
    expect(cloudUniforms.uCloudAmt.value).toBe(tuning.motion.cloudShadow.value);
  });
  it('steam rises and petals fall (puff styles)', () => {
    expect(PUFFS.steam.gravity).toBeLessThan(0);
    expect(PUFFS.petals.gravity).toBeGreaterThan(0);
  });
});
