import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Bake a group of single-colour meshes into ONE mesh with vertex colours (one draw call instead of many).
 * Parts keep their position/rotation/scale relative to the group.
 */
export function mergeColored(group: THREE.Object3D): THREE.Mesh {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const geos: THREE.BufferGeometry[] = [];
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshLambertMaterial;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as THREE.BufferGeometry;
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = m.color.r;
      col[i * 3 + 1] = m.color.g;
      col[i * 3 + 2] = m.color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  });
  const merged = mergeGeometries(geos, false)!;
  merged.computeBoundingSphere();
  return new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}
