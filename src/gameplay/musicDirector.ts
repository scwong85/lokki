import { tuning } from '../core/tuning';
import type { MusicTier } from '../data/music';

/** Which music tier a heat tier (0-4) wants: calm while nobody minds, playful once the city notices, chaos at the top or in the finale. */
export function wantedTier(heatTier: number, finale: boolean): MusicTier {
  if (finale || heatTier >= 4) return 'chaos';
  return heatTier >= 2 ? 'playful' : 'calm';
}

const rank: Record<MusicTier, number> = { calm: 0, playful: 1, chaos: 2 };

/**
 * Picks the music tier. Goes up at once, but only comes back down after the lower tier has been wanted
 * for a while, so the music does not flip back and forth around a heat threshold. Pure logic.
 */
export class MusicDirector {
  tier: MusicTier = 'calm';
  private lowerFor = 0;

  update(dt: number, heatTier: number, finale: boolean): MusicTier {
    const want = wantedTier(heatTier, finale);
    if (rank[want] > rank[this.tier]) {
      this.tier = want;
      this.lowerFor = 0;
    } else if (rank[want] < rank[this.tier]) {
      this.lowerFor += dt;
      if (this.lowerFor >= tuning.audio.musicDownDelay.value) {
        this.tier = want;
        this.lowerFor = 0;
      }
    } else this.lowerFor = 0;
    return this.tier;
  }

  reset(): void {
    this.tier = 'calm';
    this.lowerFor = 0;
  }
}

/** Next track index in a tier: rotates, never repeats the current one when there is a choice. */
export function nextTrack(count: number, current: number): number {
  return count <= 1 ? 0 : (current + 1) % count;
}

/** Move a level toward a target at fadeSeconds for a full 0..1 swing. */
export function approach(level: number, target: number, dt: number, fadeSeconds: number): number {
  const step = dt / Math.max(0.05, fadeSeconds);
  return level < target ? Math.min(target, level + step) : Math.max(target, level - step);
}
