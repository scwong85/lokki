import * as THREE from 'three';
import type { Marker } from '../data/quests';

/** Pulsing ring + light pillar for each quest marker (a small pool). */
export class MarkerPool {
  readonly group = new THREE.Group();
  private items: { ring: THREE.Mesh; pillar: THREE.Mesh }[] = [];

  constructor(count = 8) {
    const ringGeo = new THREE.RingGeometry(0.85, 1, 32);
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 30, 8, 1, true);
    for (let i = 0; i < count; i++) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 9;
      const pillar = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
      ring.visible = pillar.visible = false;
      this.group.add(ring, pillar);
      this.items.push({ ring, pillar });
    }
  }

  update(markers: readonly Marker[], time: number): void {
    this.items.forEach((it, i) => {
      const m = markers[i];
      it.ring.visible = it.pillar.visible = !!m;
      if (!m) return;
      const y = (m.y ?? 0) + 0.15;
      it.ring.position.set(m.x, y, m.z);
      it.ring.scale.setScalar(m.r * (1 + Math.sin(time * 4) * 0.06));
      it.pillar.position.set(m.x, y + 15, m.z);
      it.pillar.scale.set(Math.max(1, m.r * 0.5), 1, Math.max(1, m.r * 0.5));
    });
  }
}
