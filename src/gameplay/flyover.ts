/**
 * The "show me" flyover (M121): when a course of a collection opens, the camera sweeps over each of its rows' places for a moment, so the
 * player sees where to go before looking. Any key skips it. Pure: it says where the camera is; main.ts takes the camera over while it runs.
 */
export interface Shot {
  pos: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
  /** The spot being shown (for a marker). */
  spot: { x: number; z: number };
}

export class Flyover {
  private spots: { x: number; z: number }[] = [];
  private t = 0;
  private per = 2.5;
  private height = 22;
  private back = 20;

  get active(): boolean {
    return this.spots.length > 0 && this.t < this.spots.length * this.per;
  }

  start(spots: readonly { x: number; z: number }[], per: number, height: number, back: number): void {
    this.spots = spots.map((s) => ({ x: s.x, z: s.z }));
    this.t = 0;
    this.per = Math.max(0.5, per);
    this.height = height;
    this.back = back;
  }

  skip(): void {
    this.spots = [];
  }

  update(dt: number): void {
    if (this.active) this.t += dt;
    if (!this.active) this.spots = [];
  }

  /** Where the camera is now (null when not running): above and behind the spot, drifting slowly round it. */
  shot(): Shot | null {
    if (!this.active) return null;
    const i = Math.min(this.spots.length - 1, Math.floor(this.t / this.per));
    const u = (this.t - i * this.per) / this.per;
    const s = this.spots[i];
    const a = 0.5 + i * 1.7 + u * 0.5;
    return { pos: { x: s.x + Math.sin(a) * this.back, y: this.height, z: s.z + Math.cos(a) * this.back }, look: { x: s.x, y: 1, z: s.z }, spot: s };
  }
}
