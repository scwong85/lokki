/**
 * Floating: new vertical speed for something at height y moving at vy over water. Below the float line the water
 * cancels gravity and pushes up (proportional to depth, capped) and damps the bob; above it nothing happens. Pure.
 */
export function floatVy(y: number, vy: number, floatY: number, gravity: number, buoyancy: number, drag: number, dt: number): number {
  const depth = floatY - y;
  if (depth <= 0) return vy;
  return (vy + (gravity + buoyancy * Math.min(depth, 1)) * dt) * Math.max(0, 1 - drag * dt);
}

/** Horizontal water drag factor for one step. */
export const waterDrag = (drag: number, dt: number): number => Math.max(0, 1 - drag * 0.5 * dt);

/** Half the height of a prop shape (its centre height when resting upright). */
export function halfHeight(shape: { kind: string; hy?: number; hh?: number; r?: number }): number {
  if (shape.kind === 'box') return shape.hy ?? 0.1;
  if (shape.kind === 'capsule') return (shape.hh ?? 0) + (shape.r ?? 0);
  return shape.hh ?? shape.r ?? 0.1;
}
