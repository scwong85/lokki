import * as THREE from 'three';
import { tuning } from '../core/tuning';
import { windAt } from '../gull/wind';
import { windowGlow } from './facadeTextures';
import { mergeColored } from './mergeMesh';

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
  uFlutter: { value: 1 },
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
  motionUniforms.uFlutter.value = m.flagFlutter.value;
  cloudUniforms.uCloudAmt.value = m.cloudShadow.value;
  cloudUniforms.uCloudScale.value = m.cloudScale.value;
  const w = windAt(time);
  const l = Math.hypot(w.x, w.z) || 1;
  motionUniforms.uWind.value.set((w.x / l) * Math.min(1, w.speed / 5), (w.z / l) * Math.min(1, w.speed / 5));
  const glow = windowGlow.value * m.lampGlow.value;
  {
    const ww = windAt(time);
    const wl = Math.hypot(ww.x, ww.z) || 1;
    cloudUniforms.uCloudOff.value.set(((ww.x / wl) * time * m.cloudSpeed.value) * cloudUniforms.uCloudScale.value, ((ww.z / wl) * time * m.cloudSpeed.value) * cloudUniforms.uCloudScale.value);
  }
  for (const mesh of lamps) {
    mesh.visible = glow > 0.04;
    (mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, glow * 0.85);
  }
}


// ---------- flags ----------

/** A pole with a Finnish flag (white, blue cross) that streams out along +x and flutters in the vertex shader. */
export function flagMesh(spots: readonly { x: number; z: number; rot: number }[]): THREE.InstancedMesh | null {
  if (!spots.length) return null;
  const g = new THREE.Group();
  const part = (geo: THREE.BufferGeometry, c: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    m.position.set(x, y, z);
    g.add(m);
  };
  part(new THREE.CylinderGeometry(0.06, 0.09, 7.2, 6), 0xaab0be, 0, 3.6, 0);
  part(new THREE.SphereGeometry(0.12, 6, 5), 0xf3d37a, 0, 7.25, 0);
  const cloth = new THREE.BoxGeometry(1.9, 1.15, 0.03, 8, 4, 1);
  part(cloth, 0xffffff, 1.0, 6.45, 0);
  part(new THREE.BoxGeometry(1.9, 0.26, 0.04, 8, 1, 1), 0x2b5fb3, 1.0, 6.4, 0);
  part(new THREE.BoxGeometry(0.26, 1.15, 0.04, 1, 4, 1), 0x2b5fb3, 0.65, 6.45, 0);
  const base = mergeColored(g);
  const mat = base.material as THREE.MeshLambertMaterial;
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: motionUniforms.uTime, uFlutter: motionUniforms.uFlutter });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uFlutter;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${PHASE}
        float fx = max(transformed.x, 0.0);
        if (transformed.y > 4.8 && fx > 0.05) {
          transformed.z += sin(uTime * 3.0 + fx * 3.2 + ph) * 0.17 * fx * uFlutter;
          transformed.y += sin(uTime * 2.3 + fx * 2.1 + ph) * 0.05 * fx * uFlutter;
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'flag';
  const mesh = new THREE.InstancedMesh(base.geometry, mat, spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach((s, i) => {
    m4.compose(new THREE.Vector3(s.x, 0, s.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot), new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m4);
  });
  mesh.castShadow = false;
  mesh.name = 'flags';
  mesh.frustumCulled = false;
  return mesh;
}

// ---------- cloud shadows ----------

/** Soft value noise in 0..1, tileable, as w*h bytes. Seeded and pure (tested). */
export function cloudNoise(w = 64, h = 64, seed = 3): Uint8Array {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const grids = [4, 8, 16].map((n) => Array.from({ length: n * n }, () => rnd()));
  const out = new Uint8Array(w * h);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0, amp = 0.55, tot = 0;
      [4, 8, 16].forEach((n, k) => {
        const fx = (x / w) * n, fy = (y / h) * n;
        const x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        const tx = smooth(fx - Math.floor(fx)), ty = smooth(fy - Math.floor(fy));
        const g = grids[k];
        const a = g[y0 * n + x0] * (1 - tx) + g[y0 * n + x1] * tx;
        const b = g[y1 * n + x0] * (1 - tx) + g[y1 * n + x1] * tx;
        v += (a * (1 - ty) + b * ty) * amp;
        tot += amp;
        amp *= 0.5;
      });
      out[y * w + x] = Math.round((v / tot) * 255);
    }
  }
  return out;
}

export const cloudUniforms = {
  uCloudTex: { value: null as THREE.Texture | null },
  uCloudOff: { value: new THREE.Vector2() },
  uCloudAmt: { value: 0.13 },
  uCloudScale: { value: 0.0034 },
};

function cloudTexture(): THREE.Texture {
  if (!cloudUniforms.uCloudTex.value) {
    const data = cloudNoise();
    const rgba = new Uint8Array(64 * 64 * 4);
    for (let i = 0; i < data.length; i++) rgba.set([data[i], data[i], data[i], 255], i * 4);
    const t = new THREE.DataTexture(rgba, 64, 64, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    cloudUniforms.uCloudTex.value = t;
  }
  return cloudUniforms.uCloudTex.value;
}

/** Add drifting cloud shadows to a Lambert material: a scrolling noise, sampled at the world position, darkens the lit colour. */
export function cloudShadowPatch(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }): void {
  cloudTexture();
  Object.assign(shader.uniforms, cloudUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCsPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCsPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vCsPos;\nuniform sampler2D uCloudTex; uniform vec2 uCloudOff; uniform float uCloudAmt; uniform float uCloudScale;')
    .replace(
      '#include <opaque_fragment>',
      `float cs = texture2D(uCloudTex, vCsPos.xz * uCloudScale + uCloudOff).r;
      outgoingLight *= 1.0 - uCloudAmt * smoothstep(0.5, 0.78, cs);
      #include <opaque_fragment>`,
    );
}
