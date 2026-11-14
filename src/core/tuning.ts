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
    minHeight: p(1.6, 0, 20, 0.5), // need this much clearance to start (low enough to dive from under the net)
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
  interaction: {
    grabRange: p(2.2, 0.5, 5, 0.1), // m from the beak (counted to the edge of the prop)
    grabConeDeg: p(120, 20, 360, 5), // props inside this cone ahead of the gull can be grabbed
    closeRange: p(1.4, 0, 4, 0.1), // props this close are grabbed whichever way the gull faces
    carryMax: p(1, 0.1, 50, 0.1), // kg the gull can lift (Fat bird skill raises this later)
    carryPenalty: p(0.8, 0, 5, 0.05), // flap strength is divided by (1 + carried kg * this)
    tossSpeed: p(10, 2, 30, 0.5),
    tossUp: p(4, 0, 15, 0.5),
    grabCooldown: p(0.3, 0, 2, 0.05),
  },
  poop: {
    cooldown: p(1.2, 0.2, 8, 0.1),
    inherit: p(0.8, 0, 1.5, 0.05), // share of the gull's velocity the poop starts with
    gravity: p(16, 4, 40, 0.5),
    drag: p(0.35, 0, 3, 0.05), // pulls the poop's sideways speed toward the wind
    windEffect: p(1, 0, 3, 0.05),
    splatSize: p(0.9, 0.3, 3, 0.05),
    maxDecals: p(80, 10, 300, 1),
    assistStrength: p(0.8, 0, 1, 0.05), // 0 = no aim assist toward tourists
    assistRadius: p(4, 0.5, 8, 0.5), // a target this close to the landing spot pulls the poop in
  },
  physics: {
    gravity: p(14, 4, 30, 0.5), // props only; the gull has its own flight gravity
    friction: p(0.8, 0, 2, 0.05),
    restitution: p(0.3, 0, 1, 0.05),
    breakSpeed: p(6, 1, 30, 0.5), // impact speed that shatters fragile props
    noiseSpeed: p(2.5, 0.5, 20, 0.5), // impact speed that makes a noisy prop clatter
    thumpSpeed: p(4.5, 1, 20, 0.5), // any prop landing this hard makes a quiet thump people can hear (tossing things distracts)
  },
  npc: {
    walkSpeed: p(1.4, 0.5, 4, 0.1),
    runSpeed: p(3.6, 1, 7, 0.1), // panic and chase
    turnRate: p(3.5, 0.5, 10, 0.1), // rad/s
    sightRange: p(14, 3, 40, 0.5),
    sightConeDeg: p(130, 30, 360, 5),
    eatSightFactor: p(0.45, 0.1, 1, 0.05), // eating tourists are distracted
    blindAboveDeg: p(55, 20, 90, 1), // gulls straight overhead are not seen
    noticeTime: p(0.4, 0.1, 2, 0.05),
    shieldRange: p(10, 2, 25, 0.5),
    handTurnRate: p(4, 1, 12, 0.5), // how fast the hand with the ice cream swings to the far side
    hearRange: p(24, 5, 60, 1),
    distractTime: p(2.5, 0.5, 8, 0.1),
    snatchReach: p(1.2, 0.5, 3, 0.1),
    panicTime: p(1.8, 0.3, 6, 0.1),
    chaseTime: p(4, 1, 12, 0.5),
    recoverTime: p(3, 0.5, 10, 0.5),
    loseSightTime: p(2.5, 0.5, 8, 0.1),
  },
  quest: {
    timeLimit: p(60, 15, 300, 5), // ice-cream snatch, starts when the first tourist spots you
    capTime: p(45, 10, 200, 5), // cap heist, starts when you take the cap
    finaleTime: p(120, 30, 400, 5), // grand finale, starts when you ring the ferry horn
    retryDelay: p(3, 0, 20, 0.5), // a failed timed quest resets itself after this
    escapeDistance: p(30, 10, 80, 1),
    escapeTime: p(3, 0.5, 15, 0.5),
  },
  heat: {
    gainNoticed: p(4, 0, 30, 0.5), // a tourist spots you
    gainSnatch: p(25, 0, 60, 1),
    gainPoopNpc: p(15, 0, 60, 1),
    gainBreak: p(8, 0, 40, 1),
    gainTip: p(8, 0, 40, 1),
    gainClatter: p(2, 0, 20, 0.5),
    decay: p(4, 0, 30, 0.5), // per second while nobody sees you
    decayDelay: p(2, 0, 10, 0.5), // seconds out of sight before it starts to fall
    tier1: p(20, 5, 100, 1), // vendors wake up
    tier2: p(40, 5, 100, 1), // scare lines
    tier3: p(60, 5, 100, 1), // nets
    tier4: p(80, 5, 100, 1), // the Gull Warden
    wardenRelief: p(20, 0, 60, 1), // heat drop when you poop on the Warden
  },
  deter: {
    sprayRange: p(9, 2, 15, 0.5),
    sprayConeDeg: p(70, 20, 180, 5),
    sprayWindup: p(0.6, 0.2, 2, 0.05), // the vendor aims, then fires: you can dodge
    sprayCooldown: p(3, 0.5, 10, 0.5),
    sprayStun: p(0.7, 0, 3, 0.05),
    sprayKnock: p(7, 0, 20, 0.5),
    sprayStamina: p(25, 0, 100, 1),
    lineStun: p(0.9, 0, 3, 0.05),
    lineKnock: p(4, 0, 15, 0.5),
    lineStamina: p(30, 0, 100, 1),
    netStun: p(1.4, 0, 4, 0.05),
    netStamina: p(20, 0, 100, 1),
    swatStun: p(0.7, 0, 3, 0.05),
    swatKnock: p(8, 0, 20, 0.5),
    swatStamina: p(25, 0, 100, 1),
    learnVendors: p(4, 1, 20, 1), // dodged sprays before the vendors count as learned
    learnLines: p(8, 1, 30, 1), // clean passes through the market
    learnNets: p(3, 1, 20, 1), // flights under the nets (gulls learn fast)
    learnWarden: p(5, 1, 20, 1),
    learnedFactor: p(0.2, 0, 1, 0.05), // strength of a learned deterrent
    wardenPatrolSpeed: p(1.2, 0.5, 3, 0.1),
    wardenSpeed: p(2.6, 1, 6, 0.1), // hunting
    wardenSwatRange: p(2.4, 1, 5, 0.1),
    wardenSwatWindup: p(0.5, 0.2, 1.5, 0.05),
    wardenSwatCooldown: p(2, 0.5, 8, 0.5),
    wardenSulk: p(5, 1, 15, 0.5), // after being pooped on
    wardenDistract: p(5, 1, 12, 0.5), // how long a noise holds his attention (umbrella down)
    umbrellaDelay: p(1.5, 0, 6, 0.1), // the umbrella stays down this long after he recovers (your window)
    installTime: p(2.5, 0.5, 10, 0.5), // new lines and nets take this long to be put up (harmless meanwhile)
    hawkTime: p(4, 1, 15, 0.5),
    hawkCooldown: p(8, 1, 40, 1),
  },
  skills: {
    mimicCooldown: p(6, 1, 30, 0.5),
    mimicDistance: p(18, 5, 40, 1), // where the crow call is heard, ahead of the camera
    mimicLoud: p(1.2, 0.3, 2, 0.1),
    flockCooldown: p(25, 5, 90, 1),
    flockCount: p(4, 2, 8, 1),
    flockTime: p(5, 2, 12, 0.5), // how long the decoy gulls make a racket
    flockDistance: p(22, 8, 50, 1),
    disguiseTime: p(10, 3, 30, 0.5),
    disguiseCooldown: p(25, 5, 90, 1),
  },
  audio: {
    master: p(0.5, 0, 1, 0.05),
    sfx: p(0.8, 0, 1, 0.05),
    wind: p(0.5, 0, 1, 0.05), // air-rush loudness
  },
  render: {
    fogNear: p(150, 0, 400, 1),
    fogFar: p(700, 100, 1500, 1),
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
