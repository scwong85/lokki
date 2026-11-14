import * as THREE from 'three';
import { createRng } from '../core/rng';

/** Ground tiles drawn at runtime (light patterns on white, tinted by the layer colour). Seeded, so they look the same every time. */
function tile(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void, seed: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  const rng = createRng(seed);
  draw(g, () => rng.next());
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const grey = (v: number) => `rgb(${v},${v},${v})`;

/** Cobbled paving (the market square, quays and pavements): staggered setts with soft joints. */
export const pavingTexture = (): THREE.Texture =>
  tile(256, (g, rnd) => {
    const s = 32;
    for (let row = 0; row < 256 / s; row++) {
      const off = (row % 2) * (s / 2);
      for (let col = -1; col < 256 / s + 1; col++) {
        const x = col * s + off, y = row * s;
        g.fillStyle = grey(236 + Math.floor(rnd() * 16));
        g.fillRect(x + 2, y + 2, s - 4, s - 4);
      }
    }
    g.strokeStyle = grey(212);
    g.lineWidth = 2;
    for (let row = 0; row <= 256 / s; row++) {
      g.beginPath();
      g.moveTo(0, row * s);
      g.lineTo(256, row * s);
      g.stroke();
    }
  }, 11);

/** Asphalt streets: fine speckle and the odd patch. */
export const asphaltTexture = (): THREE.Texture =>
  tile(256, (g, rnd) => {
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = grey(222 + Math.floor(rnd() * 34));
      g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 2, 2);
    }
    for (let i = 0; i < 4; i++) {
      g.fillStyle = grey(238);
      g.fillRect(Math.floor(rnd() * 220), Math.floor(rnd() * 220), 20 + Math.floor(rnd() * 30), 14 + Math.floor(rnd() * 20));
    }
  }, 12);

/** Grass: lighter and darker tufts. */
export const grassTexture = (): THREE.Texture =>
  tile(256, (g, rnd) => {
    for (let i = 0; i < 1400; i++) {
      const v = rnd() < 0.5 ? 222 + Math.floor(rnd() * 20) : 255;
      g.fillStyle = `rgb(${v},${Math.min(255, v + 6)},${v})`;
      const x = Math.floor(rnd() * 256), y = Math.floor(rnd() * 256);
      g.fillRect(x, y, 2, 4);
      g.fillRect(x + 2, y + 1, 2, 3);
    }
  }, 13);
