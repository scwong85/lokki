/**
 * Target lock (M16): press Tab to lock onto a person or a level target in front of you. A locked target pulls dives
 * and droppings onto it. Pure logic: ranking what is in front, cycling, and keeping the lock valid.
 */
export interface LockCandidate {
  /** Stable id ('n3' person, 'v100' vendor, 'warden', 'p12' prop). */
  id: string;
  x: number;
  y: number;
  z: number;
  /** Rough size, so a big target is not harder than a small one. */
  radius: number;
  label: string;
}

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * What can be locked: within `range`, and within `coneDeg` (full angle) of where the camera looks (forward = (-sin yaw, -cos yaw)).
 * Best first: closest to the middle of the view, nearer ones winning ties.
 */
export function rankCandidates(g: { x: number; y: number; z: number }, camYaw: number, list: readonly LockCandidate[], range: number, coneDeg: number): LockCandidate[] {
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const half = (coneDeg * Math.PI) / 360;
  const scored: { c: LockCandidate; score: number }[] = [];
  for (const c of list) {
    const dx = c.x - g.x, dz = c.z - g.z;
    const d = dist(g, c);
    if (d > range) continue;
    const flat = Math.hypot(dx, dz);
    // straight below or above counts as "in front" (a gull overhead locks onto what is under it)
    const ang = flat < 1.5 ? 0 : Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / flat)));
    if (ang > half) continue;
    scored.push({ c, score: ang * 40 + d });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.c);
}

/** What Tab does: nothing locked -> the best one; locked -> the next one in view; after the last -> lock off (null). */
export function nextLock(current: string | null, ranked: readonly LockCandidate[]): string | null {
  if (!ranked.length) return null;
  if (current === null) return ranked[0].id;
  const i = ranked.findIndex((c) => c.id === current);
  if (i < 0) return ranked[0].id; // the old one left the view: start again
  return i + 1 < ranked.length ? ranked[i + 1].id : null;
}

/** The locked candidate if it still exists and is within `maxRange`; otherwise null (the lock lets go by itself). */
export function resolveLock(current: string | null, list: readonly LockCandidate[], g: { x: number; y: number; z: number }, maxRange: number): LockCandidate | null {
  if (current === null) return null;
  const c = list.find((x) => x.id === current);
  return c && dist(g, c) <= maxRange ? c : null;
}
