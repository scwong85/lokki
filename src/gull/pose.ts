/** Pure procedural pose for the gull model: gameplay state in, joint angles out. Unit-testable, no three.js. */
export interface PoseInput {
  mode: 'ground' | 'air' | 'dive';
  stunned: boolean;
  /** Horizontal speed (m/s) and walk-cycle phase (radians, accumulated by the caller). */
  hspeed: number;
  walkPhase: number;
  /** Seconds since last flap, and how long a flap stroke lasts. */
  flapAnim: number;
  flapDuration: number;
  heightAbove: number;
  turnRate: number;
  /** Body pitch in radians (nose up positive). */
  bodyPitch: number;
  /** Beak held open (screech, stunned). */
  beakOpen: boolean;
  time: number;
  /** Floating on the sea. */
  swimming?: boolean;
}

export interface Pose {
  /** Shoulder angle: + = wing tips up, - = down. */
  flap: number;
  /** Flap stroke in progress: apply directly instead of smoothing. */
  flapActive: boolean;
  /** 0 = wing fully extended, 1 = folded at the elbow. */
  fold: number;
  /** Wing swept backwards (rad). */
  sweep: number;
  /** 0 = legs down, 1 = legs tucked up and back. */
  legTuck: number;
  /** Leg swing amplitude (rad) for walking; phase comes from walkPhase. */
  legStride: number;
  walkPhase: number;
  headRoll: number;
  headPitch: number;
  /** 0 closed .. 1 wide open. */
  beakOpen: number;
  /** Body vertical offset (m). */
  bob: number;
  /** Floating on the sea: the legs are tucked away completely and not drawn. */
  swimming: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computePose(i: PoseInput): Pose {
  const headRoll = clamp(i.turnRate * 0.15, -0.4, 0.4);
  const base: Pose = {
    flap: 0, flapActive: false, fold: 0, sweep: 0.1, legTuck: 1, legStride: 0, walkPhase: i.walkPhase,
    headRoll, headPitch: -i.bodyPitch * 0.6, beakOpen: i.beakOpen ? 1 : 0, bob: 0, swimming: false,
  };

  if (i.stunned) {
    return {
      ...base, flap: -0.8, fold: 0.3, sweep: 0.3, legTuck: i.mode === 'ground' ? 0 : 1,
      headRoll: Math.sin(i.time * 12) * 0.35, headPitch: 0.3, beakOpen: 1,
    };
  }

  if (i.mode === 'ground' && i.swimming) {
    // floating: wings folded, no walking legs; they are tucked away so the gull floats instead of standing in the water
    return { ...base, flap: -0.5, fold: 1, sweep: 0.5, legTuck: 1, legStride: 0, swimming: true, headPitch: Math.sin(i.time * 1.4) * 0.06, bob: Math.sin(i.time * 2.2) * 0.02 };
  }

  if (i.mode === 'ground') {
    const stride = clamp(i.hspeed / 4.5, 0, 1);
    return {
      ...base, flap: -0.5, fold: 1, sweep: 0.5, legTuck: 0, legStride: stride * 0.6,
      headPitch: Math.sin(i.walkPhase * 2) * 0.12 * stride, bob: Math.abs(Math.sin(i.walkPhase)) * 0.04 * stride,
    };
  }

  if (i.mode === 'dive') {
    return { ...base, flap: -0.15, fold: 0.7, sweep: 1.1, legTuck: 1, headPitch: -i.bodyPitch * 0.4 - 0.1 };
  }

  // glide / flap
  const p = i.flapAnim / i.flapDuration;
  const flapping = p < 1;
  const legTuck = clamp((i.heightAbove - 0.8) / 2.2, 0, 1); // legs drop when about to land
  if (flapping) {
    return { ...base, flap: 0.85 * Math.cos(p * Math.PI * 2), flapActive: true, fold: 0.15 * (1 - Math.cos(p * Math.PI * 2)), legTuck };
  }
  return { ...base, flap: 0.12 + Math.sin(i.time * 3) * 0.05, legTuck };
}
