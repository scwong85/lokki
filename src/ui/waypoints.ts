import * as THREE from 'three';
import type { Marker } from '../data/quests';
import { placeWaypoint } from '../gameplay/waypoints';

/** Floating labels ("Teddy bear 330 m") over quest markers, with an arrow at the screen edge when the goal is off screen. */
export class Waypoints {
  private el: HTMLElement;
  private items: { box: HTMLElement; arrow: HTMLElement; text: HTMLElement }[] = [];
  private tmp = new THREE.Vector3();

  constructor(root: HTMLElement, count = 8) {
    this.el = document.createElement('div');
    this.el.id = 'waypoints';
    root.appendChild(this.el);
    for (let i = 0; i < count; i++) {
      const box = document.createElement('div');
      box.className = 'wp';
      box.hidden = true;
      const arrow = document.createElement('span');
      arrow.className = 'wp-arrow';
      arrow.textContent = '➤';
      const text = document.createElement('span');
      text.className = 'wp-text';
      box.append(arrow, text);
      this.el.appendChild(box);
      this.items.push({ box, arrow, text });
    }
  }

  update(markers: readonly Marker[], camera: THREE.PerspectiveCamera, gull: { x: number; z: number }, width: number, height: number): void {
    let n = 0;
    for (const m of markers) {
      if (!m.label || n >= this.items.length) continue;
      const it = this.items[n++];
      const dist = Math.hypot(m.x - gull.x, m.z - gull.z);
      this.tmp.set(m.x, (m.y ?? 0) + 4, m.z);
      const toPoint = this.tmp.clone().sub(camera.position);
      const forward = camera.getWorldDirection(new THREE.Vector3());
      const behind = toPoint.dot(forward) < 0;
      this.tmp.project(camera);
      const p = placeWaypoint(this.tmp.x, this.tmp.y, behind, width, height);
      it.box.hidden = false;
      it.box.style.left = `${p.x}px`;
      it.box.style.top = `${p.y}px`;
      it.text.textContent = `${m.label} · ${Math.round(dist)} m`;
      it.arrow.style.display = p.onScreen ? 'none' : 'inline-block';
      it.arrow.style.transform = `rotate(${p.angle}rad)`;
    }
    for (let i = n; i < this.items.length; i++) this.items[i].box.hidden = true;
  }
}
