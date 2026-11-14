/** How much of the HUD to show. Pure rules; the page applies them with a body class (see index.html). */
export type HudMode = 'full' | 'minimal' | 'off';

export const HUD_MODES: HudMode[] = ['full', 'minimal', 'off'];

export const HUD_NAMES: Record<HudMode, string> = { full: 'Full', minimal: 'Minimal', off: 'Off' };

export function nextHudMode(m: HudMode): HudMode {
  return HUD_MODES[(HUD_MODES.indexOf(m) + 1) % HUD_MODES.length];
}

export interface HudFlags {
  /** Floating target labels: every quest, only quests in progress, or none. */
  waypoints: 'all' | 'active' | 'none';
  /** The small timer shown on its own when the to-do note is hidden. */
  miniTimer: boolean;
}

export function hudFlags(m: HudMode): HudFlags {
  if (m === 'off') return { waypoints: 'none', miniTimer: true };
  if (m === 'minimal') return { waypoints: 'active', miniTimer: false };
  return { waypoints: 'all', miniTimer: false };
}
