/** Static greybox collision: axis-aligned boxes + ground plane at y=0. Pure logic. */
export interface Box {
  min: [number, number, number];
  max: [number, number, number];
  /** 'perch' tops count as perches when landed on. */
  kind: 'building' | 'perch' | 'prop';
  color: number;
}

export interface Contact {
  nx: number;
  ny: number;
  nz: number;
  box: Box | null; // null = ground plane
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Push sphere (centre p, radius r) out of all boxes and the ground. Mutates p; returns contacts. */
export function collideSphere(boxes: readonly Box[], p: Vec3, r: number): Contact[] {
  const contacts: Contact[] = [];
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (const b of boxes) {
      const cx = Math.max(b.min[0], Math.min(p.x, b.max[0]));
      const cy = Math.max(b.min[1], Math.min(p.y, b.max[1]));
      const cz = Math.max(b.min[2], Math.min(p.z, b.max[2]));
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dz = p.z - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r * r) continue;
      any = true;
      let nx: number, ny: number, nz: number, push: number;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        nx = dx / d;
        ny = dy / d;
        nz = dz / d;
        push = r - d;
      } else {
        // centre inside the box: leave through the nearest face
        const faces: [number, number, number, number][] = [
          [p.x - b.min[0], -1, 0, 0],
          [b.max[0] - p.x, 1, 0, 0],
          [p.y - b.min[1], 0, -1, 0],
          [b.max[1] - p.y, 0, 1, 0],
          [p.z - b.min[2], 0, 0, -1],
          [b.max[2] - p.z, 0, 0, 1],
        ];
        faces.sort((a, c) => a[0] - c[0]);
        [push, nx, ny, nz] = faces[0];
        push += r;
      }
      p.x += nx * push;
      p.y += ny * push;
      p.z += nz * push;
      contacts.push({ nx, ny, nz, box: b });
    }
    if (p.y - r < 0) {
      p.y = r;
      contacts.push({ nx: 0, ny: 1, nz: 0, box: null });
      any = true;
    }
    if (!any) break;
  }
  return contacts;
}

/** Height of the highest surface at/under (x,z) that is not above yFrom. Ground = 0. */
export function surfaceBelow(boxes: readonly Box[], x: number, z: number, yFrom: number, margin = 0.3): { y: number; box: Box | null } {
  let best = 0;
  let bestBox: Box | null = null;
  for (const b of boxes) {
    if (x < b.min[0] - margin || x > b.max[0] + margin || z < b.min[2] - margin || z > b.max[2] + margin) continue;
    const top = b.max[1];
    if (top <= yFrom + 0.01 && top > best) {
      best = top;
      bestBox = b;
    }
  }
  return { y: best, box: bestBox };
}
