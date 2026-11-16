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
  | { id: string; kind: 'propInZone'; event: string; propType?: PropType; tag?: string; zone: Zone3 | 'sea' }
  /** The gull stands/flies in the zone. */
  | { id: string; kind: 'gullInZone'; event: string; zone: Zone3; grounded?: boolean }
  /** The gull has paddled on the sea for this many seconds in total. */
  | { id: string; kind: 'swim'; event: string; seconds: number }
  /** The gull stands on something at least `minY` high (any rooftop) while carrying a prop of this type. */
  | { id: string; kind: 'carryLanded'; event: string; propType: PropType; minY: number }
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
        if (i >= d.events.length || !ctx.carried || ctx.carried.type !== d.propType || !wanted.has(d.events[i])) continue;
        const pt = d.points[i];
        if (Math.hypot(ctx.gull.x - pt.x, ctx.gull.z - pt.z) <= pt.r && ctx.gull.y <= (d.maxY ?? 99)) {
          out.push(d.events[i]);
          this.index.set(d.id, i + 1);
        }
        continue;
      }
      if (this.fired.has(d.id) || !wanted.has(d.event)) continue;
      let hit = false;
      if (d.kind === 'carryLanded') hit = !!ctx.carried && ctx.carried.type === d.propType && ctx.gull.grounded && ctx.gull.y >= d.minY;
      else if (d.kind === 'swim') {
        if (ctx.gull.grounded && !ctx.isLand(ctx.gull.x, ctx.gull.z) && ctx.gull.y < 1.5) this.swimT.set(d.id, (this.swimT.get(d.id) ?? 0) + (ctx.dt ?? 0));
        hit = (this.swimT.get(d.id) ?? 0) >= d.seconds;
      } else if (d.kind === 'gullInZone') hit = inZone(d.zone, ctx.gull.x, ctx.gull.y, ctx.gull.z) && (!d.grounded || ctx.gull.grounded);
      else {
        for (const p of ctx.props) {
          if (!p.free || (d.propType && p.type !== d.propType) || (d.tag && p.tag !== d.tag)) continue;
          if (d.zone === 'sea' ? !ctx.isLand(p.x, p.z) && p.y < 1.5 : inZone(d.zone, p.x, p.y, p.z)) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        this.fired.add(d.id);
        out.push(d.event);
      }
    }
    return out;
  }

  reset(): void {
    this.fired.clear();
    this.index.clear();
    this.swimT.clear();
  }
}
