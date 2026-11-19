import * as THREE from 'three';
import type { Prop } from '../gameplay/props';
import { glowLevel, type Highlight } from '../gameplay/itemGlow';

/** A soft bobbing sparkle over loose items (a small sprite pool; no per-item materials). */
export class ItemGlow {
  readonly group = new THREE.Group();
  private pool: THREE.Sprite[] = [];

  constructor(private max = 24) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,236,140,0.85)');
      grad.addColorStop(1, 'rgba(255,220,100,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    for (let i = 0; i < max; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 8;
      s.visible = false;
      this.group.add(s);
      this.pool.push(s);
    }
  }

  update(props: readonly Prop[], from: { x: number; y: number; z: number }, wanted: ReadonlySet<string>, hawk: boolean, mode: Highlight, time: number, spots: readonly { x: number; y: number; z: number }[] = []): void {
    let n = 0;
    if (mode !== 'off') {
      for (const p of props) {
        if (n >= this.max) break;
        if (p.broken || p.carried || p.heldBy !== null || p.def.tags.includes('heavy') || !p.mesh.visible) continue;
        const pos = p.cur.p;
        const d = Math.hypot(pos.x - from.x, pos.y - from.y, pos.z - from.z);
        const isWanted = wanted.has(p.type) || (p.tag !== undefined && wanted.has(p.tag));
        const lvl = glowLevel(d, isWanted, hawk, mode);
        if (lvl <= 0) continue;
        const s = this.pool[n++];
        const pulse = isWanted ? 1 + Math.sin(time * 5 + p.id) * 0.2 : 1;
        s.visible = true;
        s.position.set(pos.x, pos.y + 0.35 + Math.sin(time * 2.4 + p.id) * 0.08, pos.z);
        s.scale.setScalar((isWanted ? 1.5 : 0.9) * pulse * (1 + d * 0.012));
        s.material.opacity = lvl;
      }
    }
    // a faint, slow sparkle where something hidden is going on (a secret to-do): closer than 30 m, or any distance under Hawk-eye
    if (mode !== 'off') {
      for (const sp of spots) {
        if (n >= this.max) break;
        const d = Math.hypot(sp.x - from.x, sp.z - from.z);
        const lvl = glowLevel(d, false, hawk, mode === 'strong' ? 'strong' : 'subtle') > 0 || d < 30 ? 0.5 + Math.sin(time * 1.5 + sp.x) * 0.25 : 0;
        if (lvl <= 0) continue;
        const s = this.pool[n++];
        s.visible = true;
        s.position.set(sp.x, sp.y + 1.2 + Math.sin(time + sp.z) * 0.2, sp.z);
        s.scale.setScalar(2.2);
        s.material.opacity = lvl * 0.7;
      }
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].visible = false;
  }
}
