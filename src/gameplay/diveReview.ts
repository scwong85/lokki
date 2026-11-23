/**
 * Near-miss feedback (M120): a dive at somebody's held item that comes away empty says why. During the dive it keeps the closest the beak got
 * to a held item and whether the body was in the way; when the dive ends with nothing in the beak and the beak came close, it returns a line.
 * Pure logic, fed once per frame.
 */
export interface NearHand {
  /** Beak to hand, metres. */
  d: number;
  /** The body was between the beak and the hand at that moment. */
  blocked: boolean;
}

export class DiveReview {
  private wasDiving = false;
  private best: NearHand | null = null;

  /** `near`: the closest held item now (only while diving). `range`: how close counts as a near miss. Returns a line when a dive just missed. */
  step(diving: boolean, carrying: boolean, near: NearHand | null, reach: number, range: number): string | null {
    if (diving) {
      if (near && near.d <= range && (!this.best || near.d < this.best.d || (near.blocked && near.d <= this.best.d + 0.3))) this.best = { ...near };
      this.wasDiving = true;
      return null;
    }
    if (!this.wasDiving) return null;
    this.wasDiving = false;
    const b = this.best;
    this.best = null;
    if (carrying || !b) return null;
    if (b.blocked) return 'Their body was in the way: come in from the side the hand is on, or distract them first.';
    const by = Math.max(0.1, b.d - reach);
    return `Missed by ${by.toFixed(1)} m: aim at the hand, and pull out a little later.`;
  }

  reset(): void {
    this.wasDiving = false;
    this.best = null;
  }
}
