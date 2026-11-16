import { tuning } from '../../core/tuning';

/**
 * Havoc Hour scoring. Every kind of mischief has a base value. Mischief chains: each DIFFERENT kind within the chain window
 * raises the multiplier; doing the same thing again scores less. Being caught by the city breaks the chain (never the run).
 * Pure logic.
 */
export const BASE: Readonly<Record<string, number>> = {
  snatch: 100,
  poopNpc: 80,
  poopProp: 15,
  soaked: 60,
  photobomb: 150,
  sunbatherWoke: 50,
  dogScatter: 120,
  dogFetched: 60,
  sprinkled: 60,
  pigeonsFriends: 100,
  pigeonsScattered: 100,
  bellSnatch: 150,
  tramBlocked: 150,
  tramRide: 120,
  doubleSnatch: 100,
  snatchUnseen: 60,
  yuck: 40,
  distract: 40,
  balloonPop: 30,
  review: 80,
  'coop:decoy': 200,
  'coop:pass': 80,
  'coop:volley': 150,
  'coop:spotted': 150,
  'coop:rescue': 100,
  'coop:snatch': 120,
  'coop:poopNpc': 120,
  'coop:handover': 80,
};

/** Cosmetic names for the pop-ups. */
export const LABEL: Readonly<Record<string, string>> = {
  snatch: 'Snatched!',
  poopNpc: 'Splat!',
  poopProp: 'Bullseye',
  soaked: 'Soaked',
  photobomb: 'Photobomb!',
  sunbatherWoke: 'Sun thief',
  dogScatter: 'Dog stampede',
  dogFetched: 'Good boy',
  sprinkled: 'Wet look',
  pigeonsFriends: 'Pigeon pal',
  pigeonsScattered: 'Pigeon panic',
  bellSnatch: 'Bell heist',
  tramBlocked: 'Tram stopped',
  tramRide: 'Tram surfer',
  doubleSnatch: 'Double snatch',
  snatchUnseen: 'Unseen!',
  yuck: 'Yuck!',
  distract: 'Distraction',
  balloonPop: 'Pop!',
  review: 'One star',
  'coop:decoy': 'Perfect decoy',
  'coop:pass': 'Mid-air pass',
  'coop:volley': 'Volley!',
  'coop:spotted': 'Spotted',
  'coop:rescue': 'Rescued',
  'coop:snatch': 'Double act',
  'coop:poopNpc': 'Double splat',
  'coop:handover': 'Handover',
};

export const RANKS: readonly { min: number; name: string }[] = [
  { min: 0, name: 'Harmless pigeon' },
  { min: 400, name: 'Petty thief' },
  { min: 1200, name: 'Troublemaker' },
  { min: 2500, name: 'Menace' },
  { min: 4500, name: 'Public nuisance' },
  { min: 7500, name: 'Local legend' },
  { min: 12000, name: 'Public enemy no. 1' },
];

export const rankFor = (score: number): { index: number; name: string; next: number | null } => {
  let i = 0;
  RANKS.forEach((r, k) => {
    if (score >= r.min) i = k;
  });
  return { index: i, name: RANKS[i].name, next: RANKS[i + 1]?.min ?? null };
};

export interface ChainState {
  mult: number;
  kinds: Set<string>;
  /** Time of the last scoring event (the chain dies `chainSeconds` later). */
  lastT: number;
  /** Points scored inside the current chain. */
  chainPoints: number;
  /** Biggest chain this run. */
  bestChain: number;
  bestMult: number;
  total: number;
}

export const newChain = (): ChainState => ({ mult: 0, kinds: new Set(), lastT: -1e9, chainPoints: 0, bestChain: 0, bestMult: 0, total: 0 });

export interface ScoreResult {
  gained: number;
  mult: number;
  /** The chain was alive when this happened. */
  chained: boolean;
  repeat: boolean;
  label: string;
}

/** Is the chain still alive at time `t`? */
export const chainAlive = (s: ChainState, t: number): boolean => s.mult > 0 && t - s.lastT <= tuning.havoc.chainSeconds.value;

/** Score one event. Returns null when the event is not mischief. */
export function applyEvent(s: ChainState, kind: string, t: number): ScoreResult | null {
  const base = BASE[kind];
  if (base === undefined) return null;
  const h = tuning.havoc;
  const chained = chainAlive(s, t);
  if (!chained) {
    s.mult = 0;
    s.kinds.clear();
    s.chainPoints = 0;
  }
  const repeat = s.kinds.has(kind);
  if (!repeat) {
    s.kinds.add(kind);
    s.mult = Math.min(h.maxMult.value, s.mult + 1);
  }
  const gained = Math.round(base * s.mult * (repeat ? h.repeatFactor.value : 1));
  s.lastT = t;
  s.chainPoints += gained;
  s.total += gained;
  s.bestChain = Math.max(s.bestChain, s.chainPoints);
  s.bestMult = Math.max(s.bestMult, s.mult);
  return { gained, mult: s.mult, chained, repeat, label: LABEL[kind] ?? kind };
}

/** Caught by the city: the chain ends, the points already scored stay. Returns the points the chain had. */
export function breakChain(s: ChainState): number {
  const had = s.chainPoints;
  s.mult = 0;
  s.kinds.clear();
  s.chainPoints = 0;
  s.lastT = -1e9;
  return had;
}

/** 0..1: how much of the chain window is left (for the meter). */
export const chainLeft = (s: ChainState, t: number): number => (chainAlive(s, t) ? Math.max(0, 1 - (t - s.lastT) / tuning.havoc.chainSeconds.value) : 0);

/** A timed run: the clock, the chain, the log. */
export class HavocRun {
  readonly chain = newChain();
  t = 0;
  started = false;
  done = false;
  readonly seconds: number;
  /** How many scoring events happened. */
  events = 0;
  readonly kinds = new Map<string, number>();

  constructor(seconds = tuning.havoc.runSeconds.value) {
    this.seconds = seconds;
  }

  get left(): number {
    return Math.max(0, this.seconds - this.t);
  }

  start(): void {
    this.started = true;
  }

  update(dt: number): void {
    if (!this.started || this.done) return;
    this.t += dt;
    if (this.t >= this.seconds) {
      this.t = this.seconds;
      this.done = true;
    }
  }

  /** Feed a game event (anything; non-mischief is ignored). Does nothing before the start or after the end. */
  feed(kind: string): ScoreResult | null {
    if (!this.started || this.done) return null;
    const r = applyEvent(this.chain, kind, this.t);
    if (r) {
      this.events++;
      this.kinds.set(kind, (this.kinds.get(kind) ?? 0) + 1);
    }
    return r;
  }

  hit(): number {
    return this.started && !this.done ? breakChain(this.chain) : 0;
  }

  get score(): number {
    return this.chain.total;
  }
}
