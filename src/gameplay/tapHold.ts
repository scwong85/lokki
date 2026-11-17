/**
 * One key, two verbs: a quick tap and a longer hold (T: tap = honk, hold = taunt). A tap is reported on release, a hold counts
 * from the moment the key has been down longer than `tapMax`. Pure logic.
 */
export class TapHold {
  private held = 0;
  /** Seconds until the next tap may fire (a cooldown, so a honk cannot be spammed). */
  cooldown = 0;

  constructor(private readonly tapMax: () => number, private readonly gap: () => number) {}

  /** Advance one step. `tap` is true on the step the key is released after a short press (and the cooldown is over). */
  update(down: boolean, dt: number): { holding: boolean; tap: boolean } {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (down) {
      this.held += dt;
      return { holding: this.held > this.tapMax(), tap: false };
    }
    const tapped = this.held > 0 && this.held <= this.tapMax() && this.cooldown <= 0;
    this.held = 0;
    if (tapped) this.cooldown = this.gap();
    return { holding: false, tap: tapped };
  }
}
