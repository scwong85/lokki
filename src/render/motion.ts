import * as THREE from 'three';
import { tuning } from '../core/tuning';
import { windAt } from '../gull/wind';
import { windowGlow } from './facadeTextures';

/**
 * Things that move without costing draw calls: trees sway and moored boats bob, both in the vertex shader of their instanced
 * material (each instance gets its own phase from its position), and the street lamps glow at dusk.
 * One shared set of uniforms, ticked once a frame.
 */
export const motionUniforms = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(1, 0) },
  uSway: { value: 1 },
  uBob: { value: 1 },
};

const PHASE = 'float ph = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.21;';

/** Treetops lean with the wind and sway; the trunk stays put (displacement grows with height above 2.2 m). */
export function swayTrees(mat: THREE.Material): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: motionUniforms.uTime, uWind: motionUniforms.uWind, uSway: motionUniforms.uSway });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind; uniform float uSway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${PHASE}
        float hh = max(transformed.y - 2.2, 0.0);
        float amp = hh * 0.05 * uSway;
        transformed.x += (sin(uTime + ph) * 0.6 + uWind.x * 0.5) * amp;
        transformed.z += (cos(uTime * 0.8 + ph * 1.3) * 0.6 + uWind.y * 0.5) * amp;`,
      );
  };
  mat.customProgramCacheKey = () => 'sway';
}

/** Moored boats rise and fall and roll a little on the water. */
export function bobBoats(mat: THREE.Material): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: motionUniforms.uTime, uBob: motionUniforms.uBob });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uBob;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${PHASE}
        float roll = sin(uTime * 1.1 + ph) * 0.05 * uBob;
        float pitch = sin(uTime * 0.9 + ph * 1.7) * 0.035 * uBob;
        float c1 = cos(roll), s1 = sin(roll);
        transformed.xy = vec2(c1 * transformed.x - s1 * transformed.y, s1 * transformed.x + c1 * transformed.y);
        float c2 = cos(pitch), s2 = sin(pitch);
        transformed.yz = vec2(c2 * transformed.y - s2 * transformed.z, s2 * transformed.y + c2 * transformed.z);
        transformed.y += sin(uTime * 1.3 + ph) * 0.07 * uBob;`,
      );
  };
  mat.customProgramCacheKey = () => 'bob';
}

const lamps: THREE.InstancedMesh[] = [];

/** Warm glow orbs at the bulbs of the street lamps: invisible by day, bright at dusk and night (the sky's `windowGlow`). One call, only while lit. */
export function lampGlowMesh(bulbs: readonly { x: number; y: number; z: number }[]): THREE.InstancedMesh | null {
  if (!bulbs.length) return null;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, bulbs.length);
  const m = new THREE.Matrix4();
  bulbs.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion(), new THREE.Vector3(0.55, 0.55, 0.55));
    mesh.setMatrixAt(i, m);
  });
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;
  mesh.name = 'lamp-glow';
  lamps.push(mesh);
  return mesh;
}

/** Per frame (time in seconds). */
export function tickMotion(time: number): void {
  const m = tuning.motion;
  motionUniforms.uTime.value = time * m.swaySpeed.value;
  motionUniforms.uSway.value = m.treeSway.value;
  motionUniforms.uBob.value = m.boatBob.value;
  const w = windAt(time);
  const l = Math.hypot(w.x, w.z) || 1;
  motionUniforms.uWind.value.set((w.x / l) * Math.min(1, w.speed / 5), (w.z / l) * Math.min(1, w.speed / 5));
  const glow = windowGlow.value * m.lampGlow.value;
  for (const mesh of lamps) {
    mesh.visible = glow > 0.04;
    (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, glow * 0.85);
  }
}
