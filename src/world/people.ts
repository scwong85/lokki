import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OUTFIT_BANDS, type Outfit, type PersonClip } from '../gameplay/personAnim';

/** The loaded person model (CC0 Quaternius "Animated Human"): template + named clips. */
export interface PeopleAssets {
  template: THREE.Group;
  clips: Record<PersonClip, THREE.AnimationClip>;
  /** Model units -> metres. */
  scale: number;
}

const CLIP_NAMES: Record<PersonClip, string> = { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', working: 'Working' };

/** Load once at boot. Returns null if anything goes wrong (the game falls back to the simple capsule people). */
export async function loadPeople(url: string, height = 1.75): Promise<PeopleAssets | null> {
  try {
    const o = await new FBXLoader().loadAsync(url);
    const clips = {} as Record<PersonClip, THREE.AnimationClip>;
    for (const [k, n] of Object.entries(CLIP_NAMES) as [PersonClip, string][]) {
      const c = o.animations.find((a) => a.name.endsWith(`|${n}`));
      if (!c) return null;
      clips[k] = c;
    }
    const box = new THREE.Box3().setFromObject(o);
    return { template: o, clips, scale: height / (box.max.y - box.min.y) };
  } catch {
    return null;
  }
}

const texCache = new Map<string, THREE.Texture>();

/** A tiny band texture for one outfit (shared between people with the same clothes). */
export function outfitTexture(o: Outfit): THREE.Texture {
  const key = OUTFIT_BANDS.map((b) => o[b.key]).join(',');
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  for (const b of OUTFIT_BANDS) {
    g.fillStyle = `#${o[b.key].toString(16).padStart(6, '0')}`;
    g.fillRect(0, Math.floor(b.from * 64), 4, Math.ceil((b.to - b.from) * 64));
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  texCache.set(key, t);
  return t;
}
