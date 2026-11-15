/**
 * Co-op combos: something two different players both did within a short time ("both snatched", "both pooped on someone",
 * "passed an item on"). Pure logic; the game feeds it what happens and it says when a pair is complete.
 */
export class CoopCombo {
  private last = new Map<string, { player: number; t: number }>();

  /** `window` seconds in which the *other* player must have done the same thing. Returns true when that completes a pair. */
  hit(kind: string, player: number, t: number, window: number): boolean {
    const prev = this.last.get(kind);
    this.last.set(kind, { player, t });
    return !!prev && prev.player !== player && t - prev.t <= window;
  }

  reset(): void {
    this.last.clear();
  }
}
