import { events } from './events';

export interface Param {
  value: number;
  min: number;
  max: number;
  step: number;
}

const p = (value: number, min: number, max: number, step = 0.01): Param => ({ value, min, max, step });

/** All feel parameters live here (PLAN §6.6). Groups are per system. Units: metres, seconds, radians unless noted. */
export const tuning = {
  walk: {
    speed: p(4.5, 1, 12, 0.1),
    accel: p(25, 1, 100, 0.5),
    friction: p(20, 1, 100, 0.5),
    turnRate: p(12, 1, 40, 0.5),
    hopSpeed: p(6.5, 2, 14, 0.1), // vertical speed of a ground hop (also the take-off)
    hopInterval: p(0.25, 0.05, 1, 0.01),
  },
  flight: {
    gravity: p(16, 4, 40, 0.5),
    glideSpeed: p(14, 4, 30, 0.1), // cruise speed while gliding
    flareSpeed: p(6, 2, 14, 0.1), // speed while braking (hold S)
    maxSpeed: p(24, 10, 50, 0.5),
    glideSink: p(2.4, 0, 8, 0.1), // steady fall speed while gliding
    flareSink: p(1, 0, 6, 0.1), // fall speed while flaring close to a surface
    flapImpulse: p(11, 2, 25, 0.1),
    maxClimb: p(11, 2, 25, 0.1),
    flapBoost: p(3, 0, 12, 0.1), // forward speed added per flap
    flapInterval: p(0.38, 0.1, 1.2, 0.01),
    flapCost: p(8, 0, 40, 0.5),
    airAccel: p(10, 1, 50, 0.5),
    airDrag: p(4, 0.5, 30, 0.5),
    airTurnRate: p(2.4, 0.5, 8, 0.1), // rad/s
    staminaMax: p(100, 20, 300, 1),
    glideRegen: p(8, 0, 60, 0.5),
    groundRegen: p(35, 0, 150, 1),
    perchRegen: p(60, 0, 200, 1),
  },
  dive: {
    minAngleDeg: p(25, 10, 60, 1), // dive steepness when the camera is low (aim: mouse up/down)
    maxAngleDeg: p(75, 40, 89, 1), // ...and when the camera is high
    pitchLow: p(0, -0.3, 0.6, 0.05), // camera pitch that maps to minAngle
    pitchHigh: p(1, 0.4, 1.2, 0.05), // camera pitch that maps to maxAngle
    angleRate: p(1.5, 0.2, 6, 0.1), // how fast the dive angle follows the aim (rad/s)
    speed: p(34, 15, 60, 0.5),
    accel: p(45, 5, 150, 1),
    minTime: p(0.7, 0.1, 2, 0.05), // committed: cannot be cancelled before this
    maxTime: p(2, 0.5, 5, 0.1),
    turnFactor: p(0.9, 0, 1.5, 0.05), // steering authority while diving (1 = same as gliding)
    minHeight: p(3, 0, 20, 0.5), // need this much clearance to start
    cooldown: p(1, 0, 5, 0.1),
    pullOutRate: p(30, 5, 100, 1), // how fast falling speed bleeds off after a dive
    pullUpRatio: p(0.25, 0, 1, 0.05), // share of dive speed turned into a swoop up on release
    hitForgiveness: p(1.2, 0, 3, 0.1), // extra target radius for dive hits
    assistStrength: p(0.6, 0, 1, 0.05), // 0 = no aim assist
    assistConeDeg: p(20, 0, 45, 1), // targets inside this cone around the dive line get assist
    assistRange: p(70, 10, 150, 1),
  },
  landing: {
    softSpeed: p(3.5, 0.5, 10, 0.1), // below: clean landing
    hardSpeed: p(8, 3, 25, 0.5), // above: hard landing
    stunSoft: p(0.15, 0, 1, 0.05),
    stunHard: p(0.9, 0, 3, 0.05),
    diveStun: p(0.4, 0, 3, 0.05),
    groundDrag: p(14, 1, 60, 0.5), // skid deceleration when faster than walking
    assistHeight: p(2.5, 0, 8, 0.1), // flare sink applies within this height
    bonkSpeed: p(9, 2, 30, 0.5), // wall/ceiling impact that stuns
    bonkStun: p(0.6, 0, 3, 0.05),
  },
  wind: {
    strength: p(3, 0, 15, 0.1),
    gustiness: p(0.5, 0, 1.5, 0.05),
    directionDeg: p(40, 0, 360, 1),
    airEffect: p(1, 0, 3, 0.05), // how much wind pushes a flying gull
  },
  camera: {
    distance: p(7, 2, 20, 0.1),
    height: p(2.5, 0, 10, 0.1),
    lag: p(8, 1, 30, 0.1),
    fov: p(65, 40, 100, 1),
    mouseSensitivity: p(0.0025, 0.0005, 0.01, 0.0005),
    diveFovKick: p(14, 0, 40, 1), // FOV increase during dive only
    fovSmooth: p(5, 1, 20, 0.5),
    rollAmount: p(0.06, 0, 0.3, 0.01), // camera roll per rad/s of turning
    rollSmooth: p(4, 1, 20, 0.5),
    lookAhead: p(0.2, 0, 1, 0.01), // seconds of velocity the camera looks ahead
    minHeight: p(0.6, 0, 3, 0.1),
  },
  course: {
    targetRespawn: p(8, 1, 60, 0.5),
  },
  audio: {
    master: p(0.5, 0, 1, 0.05),
    sfx: p(0.8, 0, 1, 0.05),
    wind: p(0.5, 0, 1, 0.05), // air-rush loudness
  },
  render: {
    fogNear: p(40, 0, 200, 1),
    fogFar: p(220, 50, 800, 1),
  },
};

export type Tuning = typeof tuning;

/** Export as a plain {group:{name:value}} object for "Copy tuning as JSON". */
export function exportTuning(t: Tuning = tuning): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [g, params] of Object.entries(t)) {
    out[g] = {};
    for (const [k, v] of Object.entries(params as Record<string, Param>)) out[g][k] = v.value;
  }
  return out;
}

/** Apply a plain exported object onto tuning (unknown keys ignored, values clamped). */
export function importTuning(json: Record<string, Record<string, number>>, t: Tuning = tuning): void {
  for (const [g, params] of Object.entries(json)) {
    const group = (t as Record<string, Record<string, Param> | undefined>)[g];
    if (!group) continue;
    for (const [k, v] of Object.entries(params)) {
      const prm = group[k];
      if (prm && typeof v === 'number') prm.value = Math.min(prm.max, Math.max(prm.min, v));
    }
  }
  events.emit('tuningChanged', undefined);
}
