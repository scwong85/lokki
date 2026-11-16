import * as THREE from 'three';
import { palette } from './palette';
import { tuning } from '../core/tuning';

/**
 * The sea: a flat plane whose colour moves with soft waves and sparkles (computed in the shader from world position
 * and time, so it costs no geometry), a foam line along the shore and a stone edge on the quays.
 */
export class Water {
  readonly group = new THREE.Group();
  private uniforms = { uTime: { value: 0 }, uWave: { value: 1 } };
  private mat: THREE.MeshLambertMaterial | null = null;

  constructor(land: { rings: number[][] }[], isLand: (x: number, z: number) => boolean) {
    const mat = new THREE.MeshLambertMaterial({ color: palette.water });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uniforms.uTime;
      sh.uniforms.uWave = this.uniforms.uWave;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nuniform float uTime;\nuniform float uWave;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec2 p = vWorldPos.xz;
          float w = sin(p.x * 0.31 + uTime * 0.9) * sin(p.y * 0.27 - uTime * 0.7)
                  + 0.55 * sin((p.x + p.y) * 0.73 + uTime * 1.6);
          float fine = sin(p.x * 2.7 + p.y * 1.1 + uTime * 2.6) * sin(p.y * 2.3 - p.x * 0.9 - uTime * 2.1);
          float glint = smoothstep(0.86, 0.97, fine) * smoothstep(0.2, 1.0, w);
          float trough = smoothstep(-0.6, -1.4, w);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.88, trough * uWave);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.07, smoothstep(0.4, 1.2, w) * uWave);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), glint * 0.45 * uWave);`,
        );
    };
    this.mat = mat;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat);
    sea.rotation.x = -Math.PI / 2;
    sea.receiveShadow = true;
    this.group.add(sea);
    this.group.add(shoreStrips(land, isLand));
  }

  /** Winter: the harbour is covered in pale ice (no waves). */
  setFrozen(on: boolean): void {
    this.mat?.color.setHex(on ? 0xdff2fa : palette.water);
    this.frozen = on;
  }
  private frozen = false;

  update(time: number): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uWave.value = this.frozen ? 0.15 : tuning.water.waves.value;
  }
}

/** Foam just off the shore (white, see-through) and a stone edge just on the land side. */
function shoreStrips(land: { rings: number[][] }[], isLand: (x: number, z: number) => boolean): THREE.Group {
  const foamPos: number[] = [];
  const stonePos: number[] = [];
  const quad = (out: number[], a: number[], b: number[], c: number[], d: number[]) => out.push(...a, ...c, ...b, ...a, ...d, ...c);
  for (const l of land) {
    for (const r of l.rings) {
      const n = r.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = r[i * 2], z1 = r[i * 2 + 1], x2 = r[j * 2], z2 = r[j * 2 + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 0.5 || Math.hypot((x1 + x2) / 2, (z1 + z2) / 2) > 700) continue;
        let nx = -(z2 - z1) / len, nz = (x2 - x1) / len; // some normal; flip it to point at the water
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
        if (isLand(mx + nx * 1.2, mz + nz * 1.2)) {
          nx = -nx;
          nz = -nz;
        }
        if (isLand(mx + nx * 1.2, mz + nz * 1.2)) continue; // not a shore edge (both sides land)
        const fw = 1.6, sw = 0.7;
        quad(foamPos, [x1, 0.012, z1], [x2, 0.012, z2], [x2 + nx * fw, 0.012, z2 + nz * fw], [x1 + nx * fw, 0.012, z1 + nz * fw]);
        quad(stonePos, [x1 - nx * sw, 0.06, z1 - nz * sw], [x2 - nx * sw, 0.06, z2 - nz * sw], [x2, 0.06, z2], [x1, 0.06, z1]);
      }
    }
  }
  const mk = (pos: number[], mat: THREE.Material) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };
  const group = new THREE.Group();
  const foam = mk(foamPos, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  const stone = mk(stonePos, new THREE.MeshLambertMaterial({ color: 0xc9c2b8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  stone.receiveShadow = true;
  group.add(foam, stone);
  return group;
}

/** Expanding rings on the water: the swimming gull, splashes, things landing in the sea. */
export class Ripples {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; t: number; size: number }[] = [];

  constructor(max = 14) {
    for (let i = 0; i < max; i++) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);
      this.items.push({ mesh, t: 0, size: 1 });
    }
  }

  add(x: number, z: number, size = 1): void {
    const it = this.items.reduce((a, b) => (a.t <= b.t ? a : b));
    it.t = 1;
    it.size = size;
    it.mesh.position.set(x, 0.03, z);
    it.mesh.visible = true;
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (it.t <= 0) continue;
      it.t = Math.max(0, it.t - dt / 1.4);
      const k = 1 - it.t;
      it.mesh.scale.setScalar((0.3 + k * 1.6) * it.size);
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = it.t * 0.7;
      it.mesh.visible = it.t > 0;
    }
  }
}
