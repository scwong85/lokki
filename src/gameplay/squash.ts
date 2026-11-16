/**
 * Squash and stretch: a damped spring around 1. Kick it negative to squash (landing), positive to stretch (take-off, snatch).
 * `y` is the vertical scale; `xz` keeps the volume roughly constant. Pure.
 */
export class Squash {
  private v = 0;
  private x = 0;

  constructor(private readonly stiffness = 180, private readonly damping = 14) {}

  kick(amount: number): void {
    this.v += amount * 12;
  }

  update(dt: number): void {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.v += (-this.stiffness * this.x - this.damping * this.v) * h;
      this.x += this.v * h;
    }
    this.x = Math.max(-0.45, Math.min(0.6, this.x));
  }

  get y(): number {
    return 1 + this.x;
  }

  get xz(): number {
    return 1 / Math.sqrt(Math.max(0.4, 1 + this.x));
  }
}
