/**
 * Who people pay attention to when there is more than one gull. Pure.
 * Tourists and vendors watch the **nearest** gull they can perceive; the Warden goes after the **most suspicious**
 * one (carrying stolen food) if it is within his range, else the nearest.
 */
export interface GullView {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Disguised as a pigeon (or otherwise invisible to this watcher). */
  hidden?: boolean;
  /** Carrying something stolen. */
  suspicious?: boolean;
}

const d2 = (a: { x: number; z: number }, b: { x: number; z: number }) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

export function nearestGull<T extends GullView>(from: { x: number; z: number }, gulls: readonly T[], includeHidden = false): T | null {
  let best: T | null = null;
  for (const g of gulls) {
    if (g.hidden && !includeHidden) continue;
    if (!best || d2(from, g) < d2(from, best)) best = g;
  }
  return best;
}

export function wardenTarget<T extends GullView>(from: { x: number; z: number }, gulls: readonly T[], range: number): T | null {
  const thief = gulls.filter((g) => !g.hidden && g.suspicious && d2(from, g) <= range * range);
  return nearestGull(from, thief) ?? nearestGull(from, gulls);
}
