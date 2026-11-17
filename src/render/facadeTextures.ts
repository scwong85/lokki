import * as THREE from 'three';

/**
 * Facade tiles drawn at runtime (no image files). White areas take the wall's vertex colour; the texture repeats
 * once per window bay and floor. The border is white, so faces without windows sample uv (0.02, 0.02).
 */
function tile(draw: (g: CanvasRenderingContext2D) => void): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const rect = (g: CanvasRenderingContext2D, col: string, x: number, y: number, w: number, h: number) => {
  g.fillStyle = col;
  g.fillRect(x, y, w, h);
};

/** One upper-floor bay: a framed two-pane window with a sill. */
export const windowTexture = (): THREE.Texture =>
  tile((g) => {
    rect(g, '#ece6dc', 22, 13, 20, 31); // frame
    rect(g, '#7189a3', 24, 15, 16, 27); // glass
    rect(g, '#9fb4c9', 24, 15, 16, 7); // sky reflection
    rect(g, '#ece6dc', 31, 15, 2, 27); // mullion
    rect(g, '#ece6dc', 24, 26, 16, 2); // transom
    rect(g, '#d6cfc3', 20, 44, 24, 3); // sill
  });

/** One ground-floor bay: a shop window over a stone plinth. */
export const shopTexture = (): THREE.Texture =>
  tile((g) => {
    rect(g, '#e6dfd3', 4, 5, 56, 6); // sign band
    rect(g, '#efe9df', 5, 14, 54, 40); // frame
    rect(g, '#5c6e86', 8, 17, 48, 35); // glass
    rect(g, '#8ea3ba', 8, 17, 48, 9); // reflection
    rect(g, '#efe9df', 31, 17, 2, 35); // mullion
    rect(g, '#bdb5aa', 0, 56, 64, 8); // plinth
  });

/** Rows in the facade atlas: the shopfront row on top, then one row per window style. */
export const GROUND_ROW_COUNT = 4; // shop, door, gateway, café
export const ATLAS_ROWS = GROUND_ROW_COUNT + 6;

/**
 * The facade atlas: seven 64x64 cells stacked top to bottom. Cell 0 is the ground-floor shopfront; cells 1 to 6 are the
 * window styles of the upper floors (see `WINDOW_STYLES` in world/facade.ts): 0 classic two-pane, 1 tall arched, 2 wide ribbon,
 * 3 small pair, 4 shuttered, 5 banded (no windows, a painted stripe). Every window cell keeps a white margin, and the
 * bottom-left corner of the whole atlas stays white (faces without windows sample there). Shops and windows share one texture so
 * a chunk of buildings is a single mesh (one draw call, and one shadow draw).
 */
export const windowAtlas = (): THREE.Texture => {
  const N = ATLAS_ROWS;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64 * N;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  const OFF = 64 * GROUND_ROW_COUNT; // the ground-floor rows come first, so the window styles start below them
  const R = (col: string, x: number, y: number, w: number, h: number, cell: number) => rect(g, col, x, cell * 64 + y + OFF, w, h);
  // door bay (row 1): a framed wooden door with a fanlight, over a stone plinth
  rect(g, '#efe9df', 14, 76, 36, 52 - 12 + 2);
  rect(g, '#8a6a52', 18, 84, 28, 38);
  rect(g, '#6f5441', 31, 84, 2, 38);
  rect(g, '#a8c4d6', 20, 78, 24, 5);
  rect(g, '#bdb5aa', 0, 120, 64, 8);
  // gateway (row 2): a tall arched opening, dark inside
  rect(g, '#efe9df', 10, 136, 44, 52);
  g.fillStyle = '#efe9df'; g.beginPath(); g.arc(32, 144, 22, Math.PI, 0); g.fill();
  rect(g, '#4a4a58', 16, 144, 32, 42);
  g.fillStyle = '#4a4a58'; g.beginPath(); g.arc(32, 144, 16, Math.PI, 0); g.fill();
  rect(g, '#bdb5aa', 0, 184, 64, 8);
  // café front (row 3): a striped blind over a big window
  rect(g, '#efe9df', 5, 206, 54, 40);
  rect(g, '#5c6e86', 8, 224, 48, 28);
  rect(g, '#8ea3ba', 8, 224, 48, 7);
  for (let k = 0; k < 8; k++) rect(g, k % 2 ? '#fdfaf2' : '#e8786a', 6 + k * 6.5, 200, 6.5, 22);
  rect(g, '#bdb5aa', 0, 248, 64, 8);
  // shopfront (row 0): sign band, framed glass over a stone plinth
  rect(g, '#e6dfd3', 4, 5, 56, 6);
  rect(g, '#efe9df', 5, 14, 54, 40);
  rect(g, '#5c6e86', 8, 17, 48, 35);
  rect(g, '#8ea3ba', 8, 17, 48, 9);
  rect(g, '#efe9df', 31, 17, 2, 35);
  rect(g, '#bdb5aa', 0, 56, 64, 8);
  const FR = '#ece6dc', GL = '#7189a3', SKY = '#9fb4c9', SILL = '#d6cfc3';
  // 0 classic
  R(FR, 22, 13, 20, 31, 0); R(GL, 24, 15, 16, 27, 0); R(SKY, 24, 15, 16, 7, 0); R(FR, 31, 15, 2, 27, 0); R(FR, 24, 26, 16, 2, 0); R(SILL, 20, 44, 24, 3, 0);
  // 1 tall arched
  R(FR, 24, 14, 16, 36, 1); R(GL, 26, 16, 12, 32, 1); R(SKY, 26, 16, 12, 8, 1);
  g.fillStyle = FR; g.beginPath(); g.arc(32, OFF + 64 + 14, 8, Math.PI, 0); g.fill();
  g.fillStyle = GL; g.beginPath(); g.arc(32, OFF + 64 + 15, 6, Math.PI, 0); g.fill();
  R(FR, 31, 16, 2, 32, 1); R(SILL, 22, 50, 20, 3, 1);
  // 2 wide ribbon
  R(FR, 6, 18, 52, 24, 2); R(GL, 8, 20, 48, 20, 2); R(SKY, 8, 20, 48, 6, 2); R(FR, 23, 20, 2, 20, 2); R(FR, 39, 20, 2, 20, 2); R(SILL, 4, 42, 56, 3, 2);
  // 3 small pair
  R(FR, 9, 21, 18, 20, 3); R(GL, 11, 23, 14, 16, 3); R(SKY, 11, 23, 14, 5, 3); R(FR, 37, 21, 18, 20, 3); R(GL, 39, 23, 14, 16, 3); R(SKY, 39, 23, 14, 5, 3); R(SILL, 7, 41, 22, 3, 3); R(SILL, 35, 41, 22, 3, 3);
  // 4 shuttered
  R(FR, 24, 14, 16, 30, 4); R(GL, 26, 16, 12, 26, 4); R(SKY, 26, 16, 12, 6, 4); R(FR, 31, 16, 2, 26, 4); R('#8fb5a0', 14, 14, 8, 30, 4); R('#8fb5a0', 42, 14, 8, 30, 4); R('#79a08b', 17, 14, 2, 30, 4); R('#79a08b', 45, 14, 2, 30, 4); R(SILL, 22, 44, 20, 3, 4);
  // 5 banded: a painted stripe all the way across, so it tiles into a continuous band
  R('#ece6dc', 0, 26, 64, 5, 5); R('#e0d8cb', 0, 31, 64, 2, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
};

/** How strongly the windows glow (0 by day, up to 1 at night). Set from the sky preset; shared by every facade material. */
export const windowGlow = { value: 0 };

/**
 * Emissive twin of the facade atlas: the glass areas glow warm, everything else is black. Same layout (see `windowAtlas`).
 * Cell 0 is the shopfront, cells 1 to 6 the window styles.
 */
export const windowGlowAtlas = (): THREE.Texture => {
  const N = ATLAS_ROWS;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64 * N;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, c.width, c.height);
  const OFF = 64 * GROUND_ROW_COUNT;
  const W = '#ffcf85', W2 = '#ffe2b0';
  const R = (col: string, x: number, y: number, w: number, h: number, cell: number) => rect(g, col, x, cell * 64 + y + OFF, w, h);
  rect(g, W, 8, 17, 48, 35); // the shop window
  rect(g, W2, 8, 17, 48, 9);
  rect(g, W, 20, 78, 24, 5); // the fanlight over a door
  rect(g, W, 8, 224, 48, 28); // the café window
  R(W, 24, 15, 16, 27, 0);
  R(W, 26, 16, 12, 32, 1);
  R(W, 8, 20, 48, 20, 2);
  R(W, 11, 23, 14, 16, 3); R(W, 39, 23, 14, 16, 3);
  R(W, 26, 16, 12, 26, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
