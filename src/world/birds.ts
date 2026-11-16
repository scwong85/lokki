import * as THREE from 'three';
import { mergeColored } from '../render/mergeMesh';
import { motionUniforms } from '../render/motion';

/** A lazy circle a flock keeps flying over one part of the city. */
export interface Circuit {
  x: number;
  z: number;
  /** Radius (m), height (m) and speed (m/s; negative flies the other way round). */
  r: number;
  y: number;
  speed: number;
}

export const CIRCUITS: readonly Circuit[] = [
  { x: 35, z: 40, r: 38, y: 40, speed: 9 },
  { x: -70, z: 55, r: 30, y: 34, speed: -8 },
  { x: 150, z: -60, r: 34, y: 52, speed: 8 },
  { x: -230, z: -65, r: 26, y: 30, speed: 7 },
  { x: -160, z: -300, r: 30, y: 46, speed: -9 },
  { x: 260, z: -110, r: 30, y: 40, speed: 8 },
];

export interface BirdPose {
  x: number;
  y: number;
  z: number;
  /** Heading in the game's convention (0 faces -z). */
  heading: number;
}

/** Where bird `i` is at time `t`: circling its flock's circuit, each on its own radius, height and phase. Pure. */
export function birdPose(i: number, t: number, circuits: readonly Circuit[] = CIRCUITS): BirdPose {
  const c = circuits[i % circuits.length];
  const k = Math.floor(i / circuits.length);
  const rad = c.r * (0.72 + 0.12 * k + 0.1 * Math.sin(i * 1.3));
  const dir = Math.sign(c.speed) || 1;
  const ang = i * 2.399 + (t * Math.abs(c.speed)) / rad * dir;
  const x = c.x + Math.cos(ang) * rad, z = c.z + Math.sin(ang) * rad;
  // the way it is flying: the derivative of the circle
  const dx = -Math.sin(ang) * dir, dz = Math.cos(ang) * dir;
  return { x, y: c.y + Math.sin(t * 0.6 + i * 1.9) * 3 + k * 2.5, z, heading: Math.atan2(-dx, -dz) };
}

/** Small white birds on lazy circles over the harbour, the parks and the squares. One instanced mesh; the wings flap in the vertex shader. */
export class Birds {
  readonly mesh: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly one = new THREE.Vector3(2.4, 2.4, 2.4); // a wingspan of about four metres, so they read from afar
  private readonly p = new THREE.Vector3();

  constructor(readonly count: number) {
    const g = new THREE.Group();
    const part = (geo: THREE.BufferGeometry, c: number, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
      m.position.set(x, y, z);
      g.add(m);
    };
    part(new THREE.BoxGeometry(0.2, 0.14, 0.55), 0xffffff);
    part(new THREE.BoxGeometry(0.1, 0.1, 0.12), 0xffffff, 0, 0.05, -0.32);
    part(new THREE.BoxGeometry(0.85, 0.02, 0.26, 4, 1, 1), 0xf4f6fa, 0.5, 0.02, 0);
    part(new THREE.BoxGeometry(0.85, 0.02, 0.26, 4, 1, 1), 0xf4f6fa, -0.5, 0.02, 0);
    part(new THREE.BoxGeometry(0.2, 0.021, 0.27), 0x3a3f4a, 0.86, 0.02, 0.02);
    part(new THREE.BoxGeometry(0.2, 0.021, 0.27), 0x3a3f4a, -0.86, 0.02, 0.02);
    const base = mergeColored(g);
    const mat = base.material as THREE.MeshLambertMaterial;
    mat.side = THREE.DoubleSide;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uTime: motionUniforms.uTime });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float wing = max(abs(transformed.x) - 0.12, 0.0);
          transformed.y += sin(uTime * 5.5 + float(gl_InstanceID) * 1.7) * wing * 0.7;`,
        );
    };
    mat.customProgramCacheKey = () => 'bird';
    this.mesh = new THREE.InstancedMesh(base.geometry, mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.name = 'birds';
  }

  update(time: number): void {
    for (let i = 0; i < this.count; i++) {
      const b = birdPose(i, time);
      this.q.setFromAxisAngle(this.up, b.heading);
      this.m.compose(this.p.set(b.x, b.y, b.z), this.q, this.one);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
