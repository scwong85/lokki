/**
 * The pigeon race and the raid (M112, docs/design/picnic-v2.md, rows 6 and the midpoint). Pure state machines; the game supplies where the
 * cone and the gull are and draws the flock.
 *
 * The race: a honk makes the Diner drop his cone, and the pigeons that hang about his kiosk fly at it. If nobody has picked the cone up when
 * they get there they eat it (he buys another: a retry). If the gull takes it in time they chase the gull, and where the gull lands on the
 * picnic roof the raid begins. The raid: pigeons sit on the picnic and mob the gull; a honk or a bun settles them. If they are ignored for a
 * minute they fly off with the last item delivered and drop it a good way off (one trip to fetch it back).
 */
export type RaceMode = 'idle' | 'racing' | 'chasing' | 'eaten';
export type RaceEvent = 'raceStart' | 'coneEaten' | 'chaseStart' | 'arrived' | 'gaveUp' | 'aborted';

export interface RaceConfig {
  /** Where the flock waits (the kiosk). */
  home: { x: number; z: number };
  /** The picnic: a gull this close (horizontally) and at least `minY` up has brought the cone to the roof. */
  arrive: { x: number; z: number; r: number; minY: number };
  /** Seconds the flock takes to reach the cone. */
  raceSeconds: number;
  /** Seconds the flock chases a gull before giving up. */
  chaseSeconds: number;
  /** Seconds the flock lingers after eating the cone. */
  eatenSeconds: number;
  /** How fast the chasing flock closes on the gull (per second, 0..1 of the gap). */
  chaseFollow: number;
}

/** What the game says about the cone: free on the ground, in the gull's beak, in somebody's hand, or gone. */
export interface ConeView {
  state: 'free' | 'carried' | 'held' | 'gone';
  x: number;
  y: number;
  z: number;
}

export interface RaceCtx {
  cone: ConeView | null;
  gull: { x: number; y: number; z: number } | null;
}

export class PigeonRace {
  mode: RaceMode = 'idle';
  /** Seconds in the current mode. */
  t = 0;
  /** Where the flock is (it flies from home to the cone, follows the gull, comes home). */
  x: number;
  z: number;
  y = 0.4;
  private from: { x: number; z: number };

  constructor(readonly cfg: RaceConfig) {
    this.x = cfg.home.x;
    this.z = cfg.home.z;
    this.from = { ...cfg.home };
  }

  /** The Diner dropped his cone: the flock sets off for it. */
  start(cone: { x: number; z: number }): RaceEvent[] {
    if (this.mode !== 'idle') return [];
    this.mode = 'racing';
    this.t = 0;
    this.from = { x: this.x, z: this.z };
    this.target = { x: cone.x, z: cone.z };
    return ['raceStart'];
  }

  private target = { x: 0, z: 0 };

  reset(): void {
    this.mode = 'idle';
    this.t = 0;
    this.x = this.cfg.home.x;
    this.z = this.cfg.home.z;
    this.y = 0.4;
  }

  private go(mode: RaceMode): void {
    this.mode = mode;
    this.t = 0;
  }

  /** Flock position eased towards a point. */
  private glide(tx: number, tz: number, k: number): void {
    this.x += (tx - this.x) * k;
    this.z += (tz - this.z) * k;
  }

  update(dt: number, ctx: RaceCtx): RaceEvent[] {
    const out: RaceEvent[] = [];
    this.t += dt;
    const { cfg } = this;
    const cone = ctx.cone;
    const onRoof = (g: { x: number; y: number; z: number } | null): boolean => !!g && Math.hypot(g.x - cfg.arrive.x, g.z - cfg.arrive.z) <= cfg.arrive.r && g.y >= cfg.arrive.minY;
    if (this.mode === 'idle') {
      this.glide(cfg.home.x, cfg.home.z, Math.min(1, dt * 1.5));
      this.y = 0.4;
      return out;
    }
    if (this.mode === 'racing') {
      if (!cone || cone.state === 'held' || cone.state === 'gone') {
        this.go('idle'); // the Diner took it back, or it is gone
        out.push('aborted');
        return out;
      }
      if (cone.state === 'carried') {
        this.go('chasing');
        out.push('chaseStart');
        return out;
      }
      const k = Math.min(1, this.t / cfg.raceSeconds);
      this.target = { x: cone.x, z: cone.z };
      this.x = this.from.x + (this.target.x - this.from.x) * k;
      this.z = this.from.z + (this.target.z - this.from.z) * k;
      this.y = 0.6 + Math.sin(k * Math.PI) * 2.2; // they fly in low and land on it
      if (k >= 1) {
        this.go('eaten');
        out.push('coneEaten');
      }
      return out;
    }
    if (this.mode === 'chasing') {
      const g = ctx.gull;
      if (!g || !cone || cone.state === 'gone') {
        this.go('idle');
        out.push('gaveUp');
        return out;
      }
      if (cone.state === 'held') {
        this.go('idle');
        out.push('aborted');
        return out;
      }
      if (cone.state === 'free') {
        // dropped somewhere: the race is on again from where the flock is
        this.from = { x: this.x, z: this.z };
        this.go('racing');
        return out;
      }
      this.glide(g.x, g.z, Math.min(1, dt * cfg.chaseFollow));
      this.y += (Math.max(0.4, g.y - 0.8) - this.y) * Math.min(1, dt * 3);
      if (onRoof(g)) {
        this.go('idle');
        out.push('arrived');
        return out;
      }
      if (this.t >= cfg.chaseSeconds) {
        this.go('idle');
        out.push('gaveUp');
      }
      return out;
    }
    // eaten: they linger on the crumbs, then settle back at home
    this.y = 0.4;
    if (this.t >= cfg.eatenSeconds) this.go('idle');
    return out;
  }
}

/** The raid on the picnic: how long the pigeons have been left alone. */
export class Raid {
  active = false;
  /** Seconds since it began or since the last time it was settled. */
  t = 0;
  private took = false;

  constructor(public takeAfter: number) {}

  start(): void {
    this.active = true;
    this.t = 0;
    this.took = false;
  }

  /** A honk or a bun: they are settled (or gone). */
  settle(): void {
    this.active = false;
  }

  reset(): void {
    this.active = false;
    this.t = 0;
    this.took = false;
  }

  /** Returns true once, when the pigeons have been ignored long enough to fly off with something. */
  update(dt: number): boolean {
    if (!this.active || this.took) return false;
    this.t += dt;
    if (this.t >= this.takeAfter) {
      this.took = true;
      this.active = false;
      return true;
    }
    return false;
  }
}
