/**
 * How loud a sound at `dist` metres is: full volume up close (`near`), fading linearly to `floor` at `far` and beyond.
 * A church bell has a high floor (it carries across the whole square), a tram bell a floor of 0.
 */
export function distanceGain(dist: number, near: number, far: number, floor = 0): number {
  if (dist <= near) return 1;
  if (dist >= far) return floor;
  return 1 - (1 - floor) * ((dist - near) / (far - near));
}
