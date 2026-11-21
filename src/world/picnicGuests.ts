import * as THREE from 'three';
import { GullModel } from '../gull/model';
import { GULL_SKINS } from '../data/gullSkins';
import { computePose } from '../gull/pose';
import { tuning } from '../core/tuning';

/** Where guest `i` of `n` sits round the picnic (a ring, facing the middle). Pure. */
export function guestSeat(i: number, n: number, spot: { x: number; y: number; z: number }, r = 1.9): { x: number; y: number; z: number; heading: number } {
  const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.4;
  const x = spot.x + Math.cos(a) * r, z = spot.z + Math.sin(a) * r;
  // heading convention: 0 faces -z; face the middle
  return { x, y: spot.y + 0.6, z, heading: Math.atan2(-(spot.x - x), -(spot.z - z)) };
}

/**
 * The guests of the gull picnic (M107): one gull lands on the roof for every row delivered, so the picnic fills up as you go. They
 * glide in from high up, then stand round the blanket bobbing; at the finale they tuck in (heads down, beaks open). View only.
 */
export class PicnicGuests {
  readonly group = new THREE.Group();
  private guests: { model: GullModel; holder: THREE.Group; t: number; on: boolean; from: THREE.Vector3; seat: ReturnType<typeof guestSeat>; flap: number }[] = [];
  private time = 0;
  feasting = false;

  constructor(readonly spot: { x: number; y: number; z: number }, count: number) {
    for (let i = 0; i < count; i++) {
      const model = new GullModel();
      model.setSkin(GULL_SKINS[i % GULL_SKINS.length].colours);
      // the model poses its own root (bob, height), so it sits in a holder that we move
      const holder = new THREE.Group();
      holder.add(model.root);
      holder.visible = false;
      this.group.add(holder);
      const seat = guestSeat(i, count, spot);
      const a = i * 2.1;
      this.guests.push({ model, holder, t: 0, on: false, from: new THREE.Vector3(spot.x + Math.cos(a) * 40, spot.y + 26, spot.z + Math.sin(a) * 40), seat, flap: 99 });
    }
  }

  /** How many have landed (or are on their way). */
  get count(): number {
    return this.guests.filter((g) => g.on).length;
  }

  /** The next guest flies in. */
  arrive(): void {
    const g = this.guests.find((x) => !x.on);
    if (!g) return;
    g.on = true;
    g.t = 0;
    g.holder.visible = true;
  }

  update(dt: number): void {
    this.time += dt;
    const fly = tuning.picnic.guestFlySeconds.value;
    this.guests.forEach((g, i) => {
      if (!g.on) return;
      g.t += dt;
      g.flap += dt;
      const k = Math.min(1, g.t / fly);
      const e = 1 - (1 - k) * (1 - k); // ease out: it slows to land
      const flying = k < 1;
      if (flying && g.flap > tuning.flight.flapInterval.value) g.flap = 0;
      const r = g.holder;
      r.position.set(g.from.x + (g.seat.x - g.from.x) * e, g.from.y + (g.seat.y - g.from.y) * e, g.from.z + (g.seat.z - g.from.z) * e);
      r.rotation.y = flying ? Math.atan2(-(g.seat.x - g.from.x), -(g.seat.z - g.from.z)) : g.seat.heading;
      const peck = this.feasting && !flying ? Math.max(0, Math.sin(this.time * 7 + i * 1.3)) : 0;
      g.model.apply(
        computePose({ mode: flying ? 'air' : 'ground', stunned: false, hspeed: flying ? 8 : 0, walkPhase: this.time * 3 + i, flapAnim: g.flap, flapDuration: tuning.flight.flapInterval.value, heightAbove: flying ? 10 * (1 - k) + 0.3 : 0, turnRate: 0, bodyPitch: peck * 0.5, beakOpen: peck > 0.5, time: this.time + i }),
        dt,
      );
    });
  }

  reset(): void {
    this.feasting = false;
    for (const g of this.guests) {
      g.on = false;
      g.t = 0;
      g.holder.visible = false;
    }
  }
}
