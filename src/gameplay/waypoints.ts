/** Where a waypoint label goes on screen: on the marker if it is in view, else clamped to the screen edge with an arrow. Pure maths. */
export interface Placement {
  x: number;
  y: number;
  onScreen: boolean;
  /** Arrow angle in radians (0 = pointing right, clockwise positive in screen space). */
  angle: number;
}

/**
 * `ndcX/ndcY`: projected position in normalised device coordinates (-1..1, y up); `behind`: the point is behind the camera.
 * `w/h`: viewport size in pixels, `margin`: distance from the edge for clamped labels.
 */
export function placeWaypoint(ndcX: number, ndcY: number, behind: boolean, w: number, h: number, margin = 48): Placement {
  // a point behind the camera projects mirrored: flip it so the arrow points the right way round
  let nx = behind ? -ndcX : ndcX;
  let ny = behind ? -ndcY : ndcY;
  const inside = !behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
  if (inside) {
    return { x: ((nx + 1) / 2) * w, y: ((1 - ny) / 2) * h, onScreen: true, angle: 0 };
  }
  if (behind && Math.abs(nx) < 1e-6 && Math.abs(ny) < 1e-6) ny = -1; // exactly behind: show it at the bottom
  const angle = Math.atan2(-ny, nx); // screen y is down
  const m = Math.max(Math.abs(nx), Math.abs(ny)) || 1;
  nx /= m;
  ny /= m;
  const cx = ((nx + 1) / 2) * w;
  const cy = ((1 - ny) / 2) * h;
  return { x: Math.min(w - margin, Math.max(margin, cx)), y: Math.min(h - margin, Math.max(margin, cy)), onScreen: false, angle };
}
