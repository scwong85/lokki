/**
 * Mechanic gating (docs/design/arcs.md, sections 2 and 6). A *mechanic* is a verb or interaction the player learns. Each is introduced
 * by one stage of one arc and is then available in every later stage; before that it does nothing. A level without a gate has
 * everything (the Playground, the sandbox, today's levels).
 */
export interface Gate {
  /** Arc (act), 1 to 4. */
  arc: number;
  /** Stage inside the arc, 1 to 5. */
  stage: number;
}

export type MechId = 'poop' | 'toss' | 'honk' | 'tug' | 'hide' | 'peck' | 'taunt' | 'slip' | 'jukebox' | 'cloth' | 'domino' | 'contagion' | 'slam' | 'pose' | 'disguise' | 'gust' | 'dogcall' | 'cannonball';

export interface MechDef {
  id: MechId;
  name: string;
  /** The stage that introduces it (it is available there and after). */
  at: Gate;
  tip: string;
}

const g = (arc: number, stage: number): Gate => ({ arc, stage });

/** The ladder. Flying, snatching, landing, walking and carrying are always available. */
export const MECHANICS: readonly MechDef[] = [
  { id: 'poop', name: 'Poop', at: g(1, 2), tip: 'F or click drops a poop. Wind pushes it.' },
  { id: 'toss', name: 'Toss', at: g(1, 2), tip: 'Q throws what you carry.' },
  { id: 'honk', name: 'Honk', at: g(1, 2), tip: 'Tap T for a honk: people jump.' },
  { id: 'tug', name: 'Tug', at: g(1, 3), tip: 'On the ground, hold E on a held item and mash E to pull.' },
  { id: 'hide', name: 'Hide and BOO', at: g(1, 3), tip: 'Crouch still in a bush: people far away cannot see you. Honk for a BOO.' },
  { id: 'peck', name: 'Alarm and sprinkler', at: g(1, 3), tip: 'E on a button pecks it.' },
  { id: 'taunt', name: 'Taunt and lure', at: g(1, 4), tip: 'Hold T: angry people follow you.' },
  { id: 'slip', name: 'Slip', at: g(1, 4), tip: 'Splats make the pavement slippery.' },
  { id: 'jukebox', name: 'Jukebox and bell', at: g(1, 4), tip: 'E pecks the jukebox or rings the bell.' },
  { id: 'cloth', name: 'Tablecloth yank', at: g(1, 5), tip: 'E at the table yanks the cloth.' },
  { id: 'domino', name: 'Domino', at: g(1, 5), tip: 'E on the first tile starts the row.' },
  { id: 'contagion', name: 'Panic spreads', at: g(1, 5), tip: 'A fright jumps to people standing close.' },
  { id: 'slam', name: 'Slam', at: g(1, 5), tip: 'A fast, low dive bowls people over.' },
  { id: 'pose', name: 'Pose', at: g(2, 2), tip: 'Keys 1 to 4 strike a pose (wave, laugh, point, facepalm). Pose in a photo at the click and it is ruined your way.' },
  { id: 'disguise', name: 'Captain\'s cap', at: g(2, 4), tip: 'Wear the cap and nobody sees a gull.' },
  { id: 'gust', name: 'Wing gust', at: g(3, 1), tip: 'Flap low: light things blow away.' },
  { id: 'dogcall', name: 'Dog call', at: g(3, 1), tip: 'A honk calls the park dogs.' },
  { id: 'cannonball', name: 'Cannonball', at: g(4, 1), tip: 'A hard dive into the water soaks the pier.' },
];

const BY_ID = new Map(MECHANICS.map((m) => [m.id, m]));

/** Order two gates: negative if a is before b. */
export const compareGates = (a: Gate, b: Gate): number => a.arc - b.arc || a.stage - b.stage;

/** Parse "1.3" (arc 1, stage 3) from a URL or data; null for anything else (no gate: everything is unlocked). */
export function parseGate(s: string | null | undefined): Gate | null {
  const m = /^(\d+)\.(\d+)$/.exec(s ?? '');
  return m ? { arc: Number(m[1]), stage: Number(m[2]) } : null;
}

/** Is the mechanic available in a level with this gate? A null gate unlocks everything. */
export function isUnlocked(id: MechId, gate: Gate | null): boolean {
  if (!gate) return true;
  const m = BY_ID.get(id);
  return !m || compareGates(m.at, gate) <= 0;
}

/** The mechanics a stage introduces (to show tips and the "new" badge). */
export function introducedAt(gate: Gate): MechDef[] {
  return MECHANICS.filter((m) => compareGates(m.at, gate) === 0);
}

/** Everything available at a gate. */
export function unlockedAt(gate: Gate | null): MechDef[] {
  return MECHANICS.filter((m) => isUnlocked(m.id, gate));
}

/** Which mechanic a switch effect needs. */
export function switchMech(effect: string): MechId {
  switch (effect) {
    case 'alarm':
    case 'soak':
      return 'peck';
    case 'dance':
    case 'summon':
      return 'jukebox';
    case 'yank':
      return 'cloth';
    case 'domino':
      return 'domino';
    case 'disguise':
      return 'disguise';
    default:
      return 'peck';
  }
}
