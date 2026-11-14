/** Pure maths for the touch controls (unit-tested). */

/**
 * Floating joystick: thumb offset (px, screen y down) from where the touch started -> movement axes in [-1,1]
 * (x right, y forward). Inside the dead zone it is 0; beyond the radius it is clamped; in between it ramps up.
 */
export function stickAxes(dx: number, dy: number, radius: number, deadzone: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= deadzone || radius <= deadzone) return { x: 0, y: 0 };
  const mag = Math.min(1, (len - deadzone) / (radius - deadzone));
  return { x: (dx / len) * mag, y: (-dy / len) * mag };
}

/** Where the knob is drawn: the offset clamped to the stick radius. */
export function knobOffset(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  return len <= radius ? { x: dx, y: dy } : { x: (dx / len) * radius, y: (dy / len) * radius };
}

/** Is this a touch device that should get the on-screen controls? (`?touch` forces them on, `?notouch` off) */
export function wantsTouch(search: string, coarsePointer: boolean, touchPoints: number): boolean {
  const q = new URLSearchParams(search);
  if (q.has('notouch')) return false;
  if (q.has('touch')) return true;
  return coarsePointer && touchPoints > 0;
}
