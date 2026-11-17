import type { NpcMode } from './npc';

export interface NpcPoseInput {
  mode: NpcMode;
  moving: boolean;
  walkPhase: number;
  t: number;
  time: number;
  holding: boolean;
  /** Looking at a noise instead of the gull. */
  distracted?: boolean;
}

export interface NpcPose {
  /** Hip swing amplitude in rad. */
  legSwing: number;
  /** Free arm swing amplitude. */
  armSwing: number;
  /** Free arm raised (0..1): panic, waving. */
  armRaise: number;
  /** Body lean forward (rad). */
  lean: number;
  bob: number;
  /** Floating indicator above the head. */
  indicator: 'none' | 'notice' | 'alarm' | 'distracted';
}

/** Pure animation rules for a tourist. */
export function npcPose(i: NpcPoseInput): NpcPose {
  const p = basePose(i);
  // a tourist looking at a noise shows a "?": the ice cream is not being watched
  if (i.distracted && i.holding && p.indicator !== 'distracted') return { ...p, indicator: 'distracted' };
  return p;
}

function basePose(i: NpcPoseInput): NpcPose {
  const stride = i.moving ? 1 : 0;
  switch (i.mode) {
    case 'walk':
      return { legSwing: 0.6 * stride, armSwing: 0.5 * stride, armRaise: 0, lean: 0.05, bob: Math.abs(Math.sin(i.walkPhase)) * 0.03 * stride, indicator: 'none' };
    case 'eat':
      return { legSwing: 0, armSwing: 0, armRaise: 0, lean: 0, bob: Math.sin(i.time * 6) * 0.01, indicator: 'none' };
    case 'notice':
      return { legSwing: 0, armSwing: 0, armRaise: 0.2, lean: -0.1, bob: 0, indicator: 'notice' };
    case 'shield':
      return { legSwing: 0, armSwing: 0, armRaise: 0.3, lean: -0.08, bob: 0, indicator: 'alarm' };
    case 'panic':
      return { legSwing: 0.9 * stride, armSwing: 0, armRaise: 1, lean: 0.1, bob: Math.abs(Math.sin(i.walkPhase)) * 0.05 * stride, indicator: 'alarm' };
    case 'chase':
      return { legSwing: 0.9 * stride, armSwing: 0, armRaise: 0.8 + Math.sin(i.time * 14) * 0.2, lean: 0.2, bob: Math.abs(Math.sin(i.walkPhase)) * 0.04 * stride, indicator: 'alarm' };
    case 'cheer':
      return { legSwing: 0, armSwing: 0, armRaise: 1, lean: 0, bob: Math.abs(Math.sin(i.time * 9)) * 0.14, indicator: 'none' };
    case 'yuck':
      return { legSwing: 0, armSwing: 0, armRaise: 0.7 + Math.sin(i.time * 18) * 0.3, lean: -0.25 + Math.sin(i.time * 12) * 0.1, bob: Math.abs(Math.sin(i.time * 10)) * 0.03, indicator: 'alarm' };
    case 'startle':
      return { legSwing: 0, armSwing: 0, armRaise: 1, lean: -0.3, bob: Math.abs(Math.sin(i.time * 16)) * 0.12, indicator: 'alarm' };
    case 'slip':
      return { legSwing: 0, armSwing: 0, armRaise: 1, lean: -1.35, bob: 0, indicator: 'alarm' };
    case 'recover':
      return { legSwing: 0, armSwing: 0, armRaise: 0, lean: 0.15, bob: 0, indicator: 'none' };
    default:
      return { legSwing: 0, armSwing: 0, armRaise: 0, lean: 0, bob: Math.sin(i.time * 1.5) * 0.008, indicator: 'none' };
  }
}
