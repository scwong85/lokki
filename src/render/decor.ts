import * as THREE from 'three';

/** Scenery that makes a puzzle readable at a glance: a buffet table, a picnic blanket with a basket. Plain meshes (and a solid top for the table). */
export type DecorKind = 'table' | 'blanket' | 'kiosk' | 'ribbon' | 'muster' | 'hall' | 'stall' | 'float' | 'awning';
export interface DecorDef {
  kind: DecorKind;
  x: number;
  z: number;
  /** Rotation about the vertical axis (rad). */
  rot?: number;
  /** Height it stands at. */
  y?: number;
}

const m = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color });

function checker(a: string, b: string, n = 6): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const s = 128 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? a : b;
    g.fillRect(i * s, j * s, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Size of the solid top of the table (half extents) and its height, for the physics world. */
export const TABLE_TOP = { hx: 2.1, hy: 0.05, hz: 0.7, y: 0.85 };

/** The little market hall (M107): a solid brick pavilion whose flat roof is a perch, a landing slab, and a place for a picnic. Half extents and roof height. */
export const HALL = { hx: 6, hz: 3.5, h: 4.2 };

function textSign(text: string, w: number, h: number, bg: string, fg: string): THREE.MeshBasicMaterial {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const x = c.getContext('2d')!;
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg;
  x.font = `bold ${Math.round(c.height * 0.62)}px system-ui, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}

export function buildDecor(d: DecorDef): THREE.Group {
  const g = new THREE.Group();
  if (d.kind === 'hall') {
    const { hx, hz, h } = HALL;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h - 0.3, hz * 2), m(0xc8735a));
    walls.position.y = (h - 0.3) / 2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(hx * 2 + 0.4, 0.3, hz * 2 + 0.4), m(0xeadfcf));
    roof.position.y = h - 0.15;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(hx * 2 + 0.1, 0.5, hz * 2 + 0.1), m(0x9c8f86));
    plinth.position.y = 0.25;
    g.add(walls, roof, plinth);
    // arched windows on the long sides, a door in the middle of the south side, a sign over it
    for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) {
      if (side === 1 && i === 0) continue;
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.06), m(0xfff1c9));
      win.position.set(i * 2.2, 2.0, side * (hz + 0.02));
      g.add(win);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.08), m(0x6b4a3a));
    door.position.set(0, 1.3, hz + 0.03);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 0.06), [m(0x2f6b4f), m(0x2f6b4f), m(0x2f6b4f), m(0x2f6b4f), textSign('KAUPPAHALLI', 5, 0.7, '#2f6b4f', '#fff3d6'), m(0x2f6b4f)]);
    sign.position.set(0, h - 0.75, hz + 0.05);
    g.add(door, sign);
    // a flagpole on the roof corner, so the picnic spot shows from far away
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), m(0xffffff));
    pole.position.set(-hx + 0.4, h + 1.5, -hz + 0.4);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.03), m(0x2a5ea8));
    flag.position.set(-hx + 1.0, h + 2.6, -hz + 0.4);
    g.add(pole, flag);
  } else if (d.kind === 'stall') {
    // a fruit stall: the table top (solid, as the buffet) with crates of berries at both ends and an orange skirt
    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2, TABLE_TOP.hy * 2, TABLE_TOP.hz * 2), m(0xe9d3b0));
    top.position.y = TABLE_TOP.y;
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2 + 0.1, 0.7, TABLE_TOP.hz * 2 + 0.1), m(0xf28c38));
    skirt.position.y = TABLE_TOP.y - 0.38;
    g.add(top, skirt);
    for (const x of [-1.6, -1.0, 1.0, 1.6]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), m(0xc99a68));
      crate.position.set(x, TABLE_TOP.y + 0.14, 0);
      const fruit = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), m(Math.abs(x) > 1.3 ? 0xe5484d : 0x6fae6a));
      fruit.position.set(x, TABLE_TOP.y + 0.26, 0);
      g.add(crate, fruit);
    }
  } else if (d.kind === 'awning') {
    // a striped awning on two poles (the Baker's door: a splat lands on it, a thrown thing goes under it; M111/M112)
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 2.2), [m(0xf4efe6), m(0xf4efe6), new THREE.MeshLambertMaterial({ map: checker('#e8786a', '#fff7ea', 8) }), m(0xf4efe6), m(0xf4efe6), m(0xf4efe6)]);
    cloth.position.set(0, 2.9, 0);
    cloth.rotation.x = -0.22;
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.05), m(0xe8786a));
    fringe.position.set(0, 2.55, 1.15);
    g.add(cloth, fringe);
    for (const x of [-1.6, 1.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), m(0xffffff));
      pole.position.set(x, 1.4, 1.05);
      g.add(pole);
    }
  } else if (d.kind === 'float') {
    // a fishing float on the water and a line back to the quay
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), m(0xe5484d));
    top.position.y = 0.12;
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m(0xffffff));
    bottom.position.y = 0.1;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), m(0xffd36e));
    stick.position.y = 0.38;
    g.add(top, bottom, stick);
  } else if (d.kind === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2, TABLE_TOP.hy * 2, TABLE_TOP.hz * 2), m(0xffffff));
    top.position.y = TABLE_TOP.y;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2 + 0.1, 0.6, TABLE_TOP.hz * 2 + 0.1), m(0xfff1d6)); // a cloth hanging down the sides
    cloth.position.y = TABLE_TOP.y - 0.33;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(TABLE_TOP.hx * 2 + 0.12, 0.08, TABLE_TOP.hz * 2 + 0.12), m(0xe05a8b));
    stripe.position.y = TABLE_TOP.y - 0.5;
    g.add(top, cloth, stripe);
    // a plate and a cake stand's worth of trimmings, so it reads as a buffet
    for (const x of [-1.5, -0.8, 0.8, 1.5]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), m(0xffffff));
      plate.position.set(x, TABLE_TOP.y + 0.07, 0.25);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m(x < 0 ? 0xd9a066 : 0xe86a8a));
      bun.position.set(x, TABLE_TOP.y + 0.15, 0.25);
      g.add(plate, bun);
    }
  } else if (d.kind === 'kiosk') {
    // a little ice-cream kiosk: counter, striped awning, a sign
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.2), m(0xfff1d6));
    counter.position.y = 0.5;
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.4), m(0xe05a8b));
    top.position.y = 1.04;
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.0), m(0xf7a1c4));
    awning.position.set(0, 2.3, 0.3);
    awning.rotation.x = 0.18;
    for (const x of [-1.7, 1.7]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), m(0xffffff));
      post.position.set(x, 1.15, 0.9);
      g.add(post);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), m(0xfff7dc));
    sign.position.set(0, 2.7, -0.2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), m(0xd9a066));
    cone.position.set(0, 2.72, -0.15);
    cone.rotation.x = Math.PI;
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), m(0xf7a1c4));
    scoop.position.set(0, 3.05, -0.15);
    g.add(counter, top, awning, sign, cone, scoop);
  } else if (d.kind === 'ribbon') {
    // two posts with a red ribbon between them; `cut` shows two limp halves instead
    for (const x of [-3, 3]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), m(0xffffff));
      post.position.set(x, 0.55, 0);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m(0xe0b43a));
      ball.position.set(x, 1.15, 0);
      g.add(post, ball);
    }
    const whole = new THREE.Mesh(new THREE.BoxGeometry(6, 0.14, 0.02), m(0xd9402f));
    whole.position.y = 0.95;
    whole.name = 'whole';
    const cut = new THREE.Group();
    cut.name = 'cut';
    cut.visible = false;
    for (const s of [-1, 1]) {
      const half = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.02), m(0xd9402f));
      half.position.set(s * 1.7, 0.62, 0);
      half.rotation.z = s * 1.0;
      cut.add(half);
    }
    g.add(whole, cut);
  } else if (d.kind === 'muster') {
    // the fire-drill assembly point: a big green sign on a pole, and a green patch on the ground
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const x = c.getContext('2d')!;
    x.fillStyle = '#2e9d5f';
    x.fillRect(0, 0, 256, 160);
    x.strokeStyle = '#ffffff';
    x.lineWidth = 8;
    x.strokeRect(10, 10, 236, 140);
    x.fillStyle = '#ffffff';
    x.font = 'bold 44px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('MUSTER', 128, 75);
    x.font = 'bold 28px system-ui, sans-serif';
    x.fillText('assembly point', 128, 118);
    const tex = new THREE.CanvasTexture(c);
    const face = new THREE.MeshBasicMaterial({ map: tex });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.08), [m(0xffffff), m(0xffffff), m(0xffffff), m(0xffffff), face, face]);
    sign.position.y = 2.6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), m(0xffffff));
    pole.position.y = 1.2;
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.06, 20), m(0x9fd8b0));
    patch.position.y = 0.04;
    g.add(sign, pole, patch);
  } else {
    // a thin slab (not a plane), raised clear of the paving so it never z-fights with the ground
    const top = new THREE.MeshLambertMaterial({ map: checker('#d9402f', '#fff7ea') });
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 3.2), [m(0xd9402f), m(0xd9402f), top, m(0xd9402f), m(0xd9402f), m(0xd9402f)]);
    cloth.position.y = 0.07;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), m(0xb97b3b));
    basket.position.set(1.4, 0.3, -0.6);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 12, Math.PI), m(0x8a5a26));
    handle.position.set(1.4, 0.5, -0.6);
    // a little flag so it can be seen from far above
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), m(0xffffff));
    pole.position.set(-1.9, 1.1, 1.3);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.03), m(0xe05a8b));
    flag.position.set(-1.5, 1.95, 1.3);
    g.add(cloth, basket, handle, pole, flag);
  }
  g.position.set(d.x, d.y ?? 0, d.z);
  g.rotation.y = d.rot ?? 0;
  return g;
}

/** Show the ribbon cut (two limp halves) or whole again. */
export function setRibbonCut(view: THREE.Group, cut: boolean): void {
  const whole = view.getObjectByName('whole');
  const halves = view.getObjectByName('cut');
  if (whole) whole.visible = !cut;
  if (halves) halves.visible = cut;
}
