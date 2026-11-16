import * as THREE from 'three';

/** Comic-style emotes that pop over heads: the reaction shows in the world instead of in a toast. */
export type EmoteKind = 'alert' | 'question' | 'anger' | 'heart' | 'zzz' | 'note' | 'wave' | 'laugh' | 'point' | 'facepalm' | 'star' | 'sweat';

const GLYPH: Record<EmoteKind, { text: string; bg: string; fg: string }> = {
  alert: { text: '!', bg: '#fff3b0', fg: '#d9480f' },
  question: { text: '?', bg: '#e7f5ff', fg: '#1c7ed6' },
  anger: { text: '#!', bg: '#ffe3e3', fg: '#c92a2a' },
  heart: { text: '♥', bg: '#ffe0ec', fg: '#e64980' },
  zzz: { text: 'z', bg: '#edf2ff', fg: '#5c7cfa' },
  note: { text: '♪', bg: '#e6fcf5', fg: '#0ca678' },
  wave: { text: 'hi', bg: '#fff9db', fg: '#f08c00' },
  laugh: { text: 'ha', bg: '#fff0f6', fg: '#d6336c' },
  point: { text: '→', bg: '#f3f0ff', fg: '#7048e8' },
  facepalm: { text: '-_-', bg: '#f1f3f5', fg: '#495057' },
  star: { text: '★', bg: '#fff3bf', fg: '#f59f00' },
  sweat: { text: ';', bg: '#e3fafc', fg: '#1098ad' },
};

/** Draws a speech bubble with the glyph. Skipped (null) where there is no canvas (unit tests). */
function bubble(kind: EmoteKind): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  const s = GLYPH[kind];
  g.fillStyle = s.bg;
  g.strokeStyle = s.fg;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(32, 28, 24, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(24, 48);
  g.lineTo(32, 62);
  g.lineTo(40, 48);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = s.fg;
  g.font = `bold ${s.text.length > 2 ? 20 : s.text.length > 1 ? 26 : 36}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(s.text, 32, 29);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Live {
  sprite: THREE.Sprite;
  life: number;
  total: number;
  /** Where it floats: re-read every frame so it follows a moving head. */
  at: () => { x: number; y: number; z: number } | null;
  key: unknown;
}

/** A small pool of sprites. `show` replaces any emote already over the same head (`key`). */
export class Emotes {
  readonly group = new THREE.Group();
  private readonly mats = new Map<EmoteKind, THREE.SpriteMaterial>();
  private readonly pool: Live[] = [];

  constructor(capacity = 24) {
    for (let i = 0; i < capacity; i++) {
      const sprite = new THREE.Sprite();
      sprite.visible = false;
      sprite.renderOrder = 20;
      this.group.add(sprite);
      this.pool.push({ sprite, life: 0, total: 1, at: () => null, key: null });
    }
  }

  private mat(kind: EmoteKind): THREE.SpriteMaterial {
    let m = this.mats.get(kind);
    if (!m) {
      m = new THREE.SpriteMaterial({ map: bubble(kind), depthTest: false, transparent: true });
      this.mats.set(kind, m);
    }
    return m;
  }

  /** Number of emotes showing (for tests). */
  get active(): number {
    return this.pool.filter((l) => l.life > 0).length;
  }

  show(kind: EmoteKind, key: unknown, at: Live['at'], seconds = 1.6): void {
    const slot = this.pool.find((l) => l.life > 0 && l.key === key) ?? this.pool.find((l) => l.life <= 0) ?? this.pool.reduce((a, b) => (a.life < b.life ? a : b));
    slot.sprite.material = this.mat(kind);
    slot.life = slot.total = seconds;
    slot.at = at;
    slot.key = key;
    slot.sprite.visible = true;
  }

  clear(): void {
    for (const l of this.pool) {
      l.life = 0;
      l.sprite.visible = false;
    }
  }

  update(dt: number): void {
    for (const l of this.pool) {
      if (l.life <= 0) continue;
      l.life -= dt;
      const p = l.at();
      if (l.life <= 0 || !p) {
        l.life = 0;
        l.sprite.visible = false;
        continue;
      }
      const age = l.total - l.life;
      // pop in with an overshoot, bob, shrink out
      const pop = age < 0.18 ? 1.25 * (age / 0.18) : age < 0.3 ? 1.25 - 0.25 * ((age - 0.18) / 0.12) : 1;
      const out = Math.min(1, l.life / 0.2);
      const s = 0.95 * pop * out;
      l.sprite.scale.set(s, s, 1);
      l.sprite.position.set(p.x, p.y + 0.5 + Math.sin(age * 5) * 0.05, p.z);
    }
  }
}
