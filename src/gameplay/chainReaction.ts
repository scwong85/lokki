import { tuning } from '../core/tuning';

/** Event kinds (before any ':') that count as a reaction in the world: something happened because of what the gull did. */
export const REACTIONS: ReadonlySet<string> = new Set([
  'knockdown', 'spread', 'dancers', 'soaked', 'yuck', 'poopNpc', 'poopVendor', 'poopWarden', 'tipChair', 'tipBin', 'distract', 'vendorDistract',
  'balloonPop', 'sprinkled', 'sunbatherWoke', 'dogScatter', 'slammed', 'snatch', 'snatchUnseen', 'bellSnatch', 'tramBlocked', 'photobomb',
  'pigeonsScattered', 'signSplat', 'robbed', 'owlScare', 'taunt', 'tugWin', 'review',
]);

export const kindOf = (event: string): string => event.split(':')[0];

export interface ChainHit {
  /** How many different reactions happened within the window. */
  kinds: number;
  /** The kinds, in order. */
  chain: string[];
}

/**
 * Chain-reaction recogniser: when several DIFFERENT reactions follow one another within a few seconds ("the bell rang, so the
 * queue jumped, so somebody slipped"), the game notices. Fires once per burst (then waits a cooldown). Pure logic.
 */
export class ChainDetector {
  private recent: { t: number; kind: string }[] = [];
  private cooldownUntil = -Infinity;
  /** The longest chain this run. */
  best = 0;

  feed(t: number, event: string): ChainHit | null {
    const kind = kindOf(event);
    if (!REACTIONS.has(kind)) return null;
    const w = tuning.chain.window.value;
    this.recent = this.recent.filter((r) => t - r.t <= w);
    if (!this.recent.some((r) => r.kind === kind)) this.recent.push({ t, kind });
    const kinds = this.recent.length;
    if (kinds > this.best) this.best = kinds;
    if (kinds >= tuning.chain.need.value && t >= this.cooldownUntil) {
      this.cooldownUntil = t + tuning.chain.cooldown.value;
      const chain = this.recent.map((r) => r.kind);
      this.recent = [];
      return { kinds, chain };
    }
    return null;
  }

  reset(): void {
    this.recent = [];
    this.cooldownUntil = -Infinity;
    this.best = 0;
  }
}

export interface Badge {
  id: string;
  name: string;
  blurb: string;
}

/** Badges for a run, from what happened: the tally of event kinds (with `kind:n` keys), the biggest chain and the biggest crowd. */
export const BADGES: readonly (Badge & { earned: (r: { tally: Record<string, number>; chain: number }) => boolean })[] = [
  { id: 'chain3', name: 'Chain reaction', blurb: 'Three different things happened in a row, all your fault.', earned: (r) => r.chain >= 3 },
  { id: 'chain5', name: 'Rube Goldberg', blurb: 'Five different things in one chain.', earned: (r) => r.chain >= 5 },
  { id: 'party', name: 'Party starter', blurb: 'Five people dancing at once.', earned: (r) => (r.tally['dancers:5'] ?? 0) > 0 },
  { id: 'skittles', name: 'Strike!', blurb: 'Four people knocked down in one go.', earned: (r) => (r.tally['knockdown:4'] ?? 0) > 0 },
  { id: 'panic', name: 'Wildfire', blurb: 'A fright spread to five people.', earned: (r) => (r.tally['spread:5'] ?? 0) > 0 },
];

export const badgesEarned = (tally: Record<string, number>, chain: number): Badge[] =>
  BADGES.filter((b) => b.earned({ tally, chain })).map(({ id, name, blurb }) => ({ id, name, blurb }));

/** Gentle nudge after a quiet while: tells you to try something. Pure timing. */
export class IdleNudge {
  private idle = 0;
  private since = 0;
  private nudged = 0;

  /** Something happened: start counting again. */
  poke(): void {
    this.idle = 0;
    this.since = 0;
    this.nudged = 0;
  }

  /** Returns how many nudges to show now (0 or 1); the first after `after` seconds of quiet, then every `every`. */
  update(dt: number, after: number, every: number): boolean {
    this.idle += dt;
    if (this.idle < after) return false;
    this.since += dt;
    if (this.nudged === 0 || this.since >= every) {
      this.nudged++;
      this.since = 0;
      return true;
    }
    return false;
  }

  get count(): number {
    return this.nudged;
  }
}
