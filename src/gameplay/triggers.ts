import type { PropType } from '../data/props';

export interface Zone3 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export type TriggerDef =
  /** A loose prop (not in the beak or a hand) of this type/tag lies in the zone (or floats in the sea). */
  | { id: string; kind: 'propInZone'; event: string; propType?: PropType; tag?: string; zone: Zone3 | 'sea'; count?: number; /** Only counts once this other trigger has fired (the crowd must be there before the ribbon is cut). */ needs?: string; /** Does not count once this other trigger has fired (a hint for doing a step too early). */ unless?: string; /** Fires even when no step wants the event (a reaction or a hint hangs on it). */ always?: boolean }
  /** At least `count` people with this role stand in the zone. */
  | { id: string; kind: 'npcsInZone'; event: string; role: string; zone: Zone3; count: number }
  /** The zone empties: it held at least `min` people (any role with '*') and now holds at most `max`. Fires once, when the square has been cleared. */
  | { id: string; kind: 'npcsClear'; event: string; role: string; zone: Zone3; min: number; max: number }
  /** The gull stands/flies in the zone. */
  | { id: string; kind: 'gullInZone'; event: string; zone: Zone3; grounded?: boolean; /** Fires every time the gull enters, not just once. */ repeat?: boolean }
  /** The gull has paddled on the sea for this many seconds in total. */
  | { id: string; kind: 'swim'; event: string; seconds: number }
  /** The gull stands on something at least `minY` high (any rooftop) while carrying a prop of this type. */
  | { id: string; kind: 'carryLanded'; event: string; propType: PropType; minY: number; zone?: Zone3; /** Counts while flying (no landing needed). */ airborne?: boolean }
  /** The gull carries a prop of this type through the points in order; each point fires its own event. */
  | { id: string; kind: 'carryCheckpoints'; propType: PropType; points: { x: number; z: number; r: number }[]; events: string[]; maxY?: number };

export interface PropView {
  id?: number;
  type: PropType;
  tag?: string;
  x: number;
  y: number;
  z: number;
  /** Not carried, not held by an NPC, not broken. */
  free: boolean;
}

export interface TriggerCtx {
  props: readonly PropView[];
  gull: { x: number; y: number; z: number; grounded: boolean };
  carried: PropView | null;
  /** People (for 'npcsInZone'). */
  npcs?: readonly { role: string; x: number; z: number }[];
  isLand: (x: number, z: number) => boolean;
  /** Seconds since the last step (for triggers that count time). */
  dt?: number;
}

const inZone = (z: Zone3, x: number, y: number, zz: number): boolean =>
  x >= z.minX && x <= z.maxX && zz >= z.minZ && zz <= z.maxZ && (z.minY === undefined || y >= z.minY) && (z.maxY === undefined || y <= z.maxY);

/**
 * World triggers that turn "something happened in the world" into quest events.
 * A trigger only fires for an event some quest currently wants (`wanted`), so progress is never wasted.
 * Pure logic.
 */
export class TriggerSystem {
  private fired = new Set<string>();
  private index = new Map<string, number>();
  private swimT = new Map<string, number>();
  private inside = new Map<string, boolean>();
  private wasFull = new Set<string>();

  constructor(private defs: readonly TriggerDef[]) {}

  /** Load another level's triggers. */
  load(defs: readonly TriggerDef[]): void {
    this.defs = defs;
    this.reset();
  }

  update(ctx: TriggerCtx, wanted: ReadonlySet<string>): string[] {
    const out: string[] = [];
    for (const d of this.defs) {
      if (d.kind === 'carryCheckpoints') {
        const i = this.index.get(d.id) ?? 0;
        if (i >= d.events.length || !ctx.carried || ctx.carried.type !== d.propType || !(wanted.has(d.events[i]) || wanted.has(d.events[d.events.length - 1]))) continue; // the points are wanted when the last event of the route is
        const pt = d.points[i];
        if (Math.hypot(ctx.gull.x - pt.x, ctx.gull.z - pt.z) <= pt.r && ctx.gull.y <= (d.maxY ?? 99)) {
          out.push(d.events[i]);
          this.index.set(d.id, i + 1);
        }
        continue;
      }
      if (this.fired.has(d.id) || !(wanted.has(d.event) || (d.kind === 'propInZone' && d.always))) {
        if (d.kind === 'gullInZone' && d.repeat) this.inside.set(d.id, inZone(d.zone, ctx.gull.x, ctx.gull.y, ctx.gull.z) && (!d.grounded || ctx.gull.grounded)); // keep track while nobody wants it
        continue;
      }
      if (d.kind === 'propInZone' && ((d.needs && !this.fired.has(d.needs)) || (d.unless && this.fired.has(d.unless)))) continue;
      let hit: boolean;
      if (d.kind === 'carryLanded') hit = !!ctx.carried && ctx.carried.type === d.propType && (d.airborne || ctx.gull.grounded) && ctx.gull.y >= d.minY && (!d.zone || inZone(d.zone, ctx.gull.x, ctx.gull.y, ctx.gull.z));
      else if (d.kind === 'npcsInZone') hit = (ctx.npcs ?? []).filter((n) => (d.role === '*' || n.role === d.role) && inZone(d.zone, n.x, 0, n.z)).length >= d.count;
      else if (d.kind === 'npcsClear') {
        const here = (ctx.npcs ?? []).filter((n) => (d.role === '*' || n.role === d.role) && inZone(d.zone, n.x, 0, n.z)).length;
        if (here >= d.min) this.wasFull.add(d.id);
        hit = this.wasFull.has(d.id) && here <= d.max;
      }
      else if (d.kind === 'swim') {
        if (ctx.gull.grounded && !ctx.isLand(ctx.gull.x, ctx.gull.z) && ctx.gull.y < 1.5) this.swimT.set(d.id, (this.swimT.get(d.id) ?? 0) + (ctx.dt ?? 0));
        hit = (this.swimT.get(d.id) ?? 0) >= d.seconds;
      } else if (d.kind === 'gullInZone') {
        const now = inZone(d.zone, ctx.gull.x, ctx.gull.y, ctx.gull.z) && (!d.grounded || ctx.gull.grounded);
        if (d.repeat) {
          hit = now && !this.inside.get(d.id);
          this.inside.set(d.id, now);
          if (hit) {
            out.push(d.event); // every entry counts: it never becomes "fired"
            continue;
          }
        } else hit = now;
      }
      else {
        let n = 0;
        for (const p of ctx.props) {
          if (!p.free || (d.propType && p.type !== d.propType) || (d.tag && p.tag !== d.tag)) continue;
          if (d.zone === 'sea' ? !ctx.isLand(p.x, p.z) && p.y < 1.5 : inZone(d.zone, p.x, p.y, p.z)) n++;
        }
        hit = n >= (d.count ?? 1);
      }
      if (hit) {
        this.fired.add(d.id);
        out.push(d.event);
      }
    }
    return out;
  }

  /** Let a trigger that has fired fire again (an item taken off the picnic and put back, M112). */
  unfire(id: string): void {
    this.fired.delete(id);
  }

  reset(): void {
    this.fired.clear();
    this.index.clear();
    this.swimT.clear();
    this.inside.clear();
    this.wasFull.clear();
  }
}
