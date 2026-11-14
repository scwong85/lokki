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
    rect(g, '#ece6dc', 18, 10, 28, 37); // frame
    rect(g, '#7189a3', 21, 13, 22, 31); // glass
    rect(g, '#9fb4c9', 21, 13, 22, 8); // sky reflection
    rect(g, '#ece6dc', 31, 13, 2, 31); // mullion
    rect(g, '#ece6dc', 21, 26, 22, 2); // transom
    rect(g, '#d6cfc3', 15, 47, 34, 3); // sill
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
