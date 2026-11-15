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

/**
 * Window styles for the upper floors, six 64x64 cells stacked top to bottom (see `WINDOW_STYLES` in world/facade.ts):
 * 0 classic two-pane, 1 tall arched, 2 wide ribbon, 3 small pair, 4 shuttered, 5 banded (no windows, a painted stripe).
 * Every cell keeps a white margin, and the bottom-left corner stays white (faces without windows sample there).
 */
export const windowAtlas = (): THREE.Texture => {
  const N = 6;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64 * N;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  const R = (col: string, x: number, y: number, w: number, h: number, cell: number) => rect(g, col, x, cell * 64 + y, w, h);
  const FR = '#ece6dc', GL = '#7189a3', SKY = '#9fb4c9', SILL = '#d6cfc3';
  // 0 classic
  R(FR, 22, 13, 20, 31, 0); R(GL, 24, 15, 16, 27, 0); R(SKY, 24, 15, 16, 7, 0); R(FR, 31, 15, 2, 27, 0); R(FR, 24, 26, 16, 2, 0); R(SILL, 20, 44, 24, 3, 0);
  // 1 tall arched
  R(FR, 24, 14, 16, 36, 1); R(GL, 26, 16, 12, 32, 1); R(SKY, 26, 16, 12, 8, 1);
  g.fillStyle = FR; g.beginPath(); g.arc(32, 64 + 14, 8, Math.PI, 0); g.fill();
  g.fillStyle = GL; g.beginPath(); g.arc(32, 64 + 15, 6, Math.PI, 0); g.fill();
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
