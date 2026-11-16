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
    hopSpeed: p(6.5, 2, 14, 0.1), // vertical speed of the take-off when you hold Space on the ground
    jumpSpeed: p(5.4, 2, 10, 0.1), // vertical speed of a ground jump (tap Space): about 0.9 m high
    jumpSpeedFactor: p(1.25, 0.8, 2.5, 0.05), // how much faster than walking you can go in a jump
    takeoffHold: p(0.28, 0.05, 1, 0.01), // hold Space this long on the ground to take off instead of jumping
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
    airTurnRate: p(3.0, 0.5, 8, 0.1), // rad/s (was 3.8 after M16; eased back after playtest: a bit too fast)
    airTurnSlow: p(0.65, 0, 2, 0.05), // extra turning authority when flying slowly (flaring turns on a coin)
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
    magnet: p(12, 0, 30, 0.5), // landing magnet: pull (m/s²) toward a perch top when gliding slowly down near it; 0 = off
    magnetRange: p(3.5, 0.5, 8, 0.1), // metres sideways
    magnetHeight: p(4, 0.5, 10, 0.1), // metres above the perch top
    magnetMaxSpeed: p(16, 2, 30, 0.5), // only when slower than this (dive-speed passes are left alone)
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
  cleaner: {
    baseTime: p(8, 2, 16, 0.5), // seconds the Clean Freak scrubs his sign after one splat
    extraPerSplat: p(3, 0, 8, 0.5), // ... and each splat while he is at it adds this
    maxTime: p(18, 4, 40, 1),
  },
  selfie: {
    idle: p(6, 1, 20, 0.5), // seconds a selfie tourist guards her ice cream between photos
    count: p(3, 1.5, 6, 0.5), // the "3, 2, 1" countdown
    open: p(2.2, 1, 5, 0.1), // the shot: her ice cream is open this long
    frameRange: p(7, 2, 15, 0.5), // how close to her you must be to be in the photo (m)
    frameHeight: p(8, 2, 20, 0.5), // ...and not higher than this
    frameConeDeg: p(100, 30, 180, 5), // the camera's field of view in front of her
  },
  gamepad: {
    deadzone: p(0.18, 0, 0.5, 0.01), // stick wobble ignored
    lookSpeed: p(900, 100, 3000, 50), // right-stick look speed (mouse pixels per second at full tilt)
  },
  touch: {
    stickRadius: p(56, 20, 140, 2), // px the thumb travels for full speed
    deadzone: p(7, 0, 30, 1), // px of thumb wobble ignored
    lookScale: p(2.6, 0.2, 6, 0.1), // drag-to-look speed (times the mouse sensitivity)
    diveAim: p(1.4, 0, 5, 0.1), // how much sliding on DIVE steepens the dive
    stickZone: p(0.42, 0.2, 0.6, 0.02), // left part of the screen that spawns the stick
  },
  water: {
    waves: p(1, 0, 2, 0.1), // strength of the wave colour pattern
    floatHeight: p(0.12, -0.2, 0.6, 0.02), // where loose items float
    buoyancy: p(18, 0, 60, 1), // how hard the water pushes items up
    drag: p(2.5, 0, 10, 0.1), // water drag on floating items
    swimSpeed: p(0.55, 0.1, 1.5, 0.05), // swimming speed as a fraction of walking
    swimSink: p(0.2, 0, 0.5, 0.02), // how low the gull sits in the water
    driftSpeed: p(1.6, 0, 6, 0.1), // the current that carries a message bottle (m/s)
    bobHeight: p(0.1, 0, 0.4, 0.01), // how far floating items rise and fall with the waves (m)
    bobSpeed: p(1.9, 0.3, 5, 0.1), // wave rhythm for floating items
    rock: p(0.22, 0, 0.8, 0.02), // how far floating items tilt with the waves (rad)
  },
  street: {
    walkers: p(12, 0, 40, 1), // pedestrians wandering the streets (halved on the low graphics preset)
    cyclists: p(4, 0, 15, 1), // cyclists
    cull: p(150, 40, 400, 10), // only people this close to you are moved and drawn (m)
  },
  people: {
    facing: p(3.14, -3.15, 3.15, 0.05), // model yaw so people face where they walk
    walkRate: p(1.3, 0.2, 3, 0.05), // walk animation speed
    runRate: p(1.2, 0.2, 3, 0.05), // run animation speed
    blend: p(0.2, 0, 1, 0.05), // seconds to blend between animations
    runArms: p(0.1, 0, 1, 0.05), // how much the panic/cheer arm raise overrides the run clip (0 = the clip's own arms)
  },
  juice: {
    landSquash: p(0.22, 0, 0.5, 0.01),
    hopStretch: p(0.2, 0, 0.5, 0.01),
    snatchStretch: p(0.3, 0, 0.6, 0.01),
    snatchSlowmo: p(0.16, 0, 0.5, 0.01), // seconds of slow motion on a snatch (single player only)
    slowmoScale: p(0.35, 0.1, 1, 0.05),
    emoteSeconds: p(1.6, 0.5, 4, 0.1),
    puffs: p(1, 0, 1, 1), // particles on/off
    shake: p(1, 0, 1, 0.1), // screen shake strength (0 = off)
    shakeDecay: p(5, 1, 20, 0.5), // how fast a shake dies down
    shakeAmount: p(0.35, 0, 1.5, 0.05), // metres of camera offset at full strength
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
    targetAssistRadius: p(12, 2, 25, 1), // the same for level targets (the buoy, the brass sign): much more forgiving
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
    noticeBuild: p(1.4, 0.1, 5, 0.1), // seconds a calm person must see you before they notice (diving: half)
    suspicionFade: p(0.8, 0, 4, 0.1), // how fast that fades once you are out of sight
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
  lock: {
    range: p(90, 20, 200, 5), // Tab locks onto things this close (m)
    coneDeg: p(80, 20, 180, 5), // ...and this far either side of where the camera looks (total angle)
    maxRange: p(130, 30, 300, 5), // the lock lets go beyond this
    diveTurn: p(6, 1, 15, 0.5), // how hard a locked dive bends toward its target (rad/s)
    poopAssist: p(45, 5, 100, 1), // a locked target pulls droppings in from this far (m)
  },
  kalle: {
    speed: p(9, 3, 20, 0.5), // m/s
    thinkTime: p(2.2, 0.5, 8, 0.1), // seconds he waits on his perch before the next snack
    range: p(70, 15, 200, 5), // he only goes after snacks this close to his perch
    scareRange: p(4.5, 1, 10, 0.5), // a diving gull this close makes him drop his snack
  },
  drone: {
    speed: p(7, 2, 15, 0.5), // m/s
    height: p(2.2, 0.5, 6, 0.1), // hovers this far above the gull
    battery: p(50, 15, 180, 5), // seconds of flight
    attackRange: p(7, 3, 20, 0.5), // starts a dive when the gull is this close
    windup: p(0.7, 0.3, 2, 0.05), // aim time before the dive (dodge it)
    hitRange: p(1.8, 0.5, 4, 0.1), // a dive hits a gull this close to where it ends up
    cooldown: p(2.2, 0.5, 8, 0.1),
    bonkRange: p(2.3, 0.5, 5, 0.1), // a diving gull this close bonks the drone
    bonkDrain: p(14, 0, 40, 1), // battery seconds lost per bonk
  },
  winter: {
    snowCount: p(420, 0, 600, 10), // snowflakes around you in winter levels
  },
  owl: {
    scareRange: p(6, 2, 15, 0.5), // the plastic owl frightens people (and vendors) this close
    cooldown: p(2.5, 0.5, 10, 0.5), // between scares
  },
  quest: {
    timeLimit: p(60, 15, 300, 5), // ice-cream snatch, starts when the first tourist spots you
    capTime: p(45, 10, 200, 5), // cap heist, starts when you take the cap
    finaleTime: p(120, 30, 400, 5), // grand finale, starts when you ring the ferry horn
    retryDelay: p(3, 0, 20, 0.5), // a failed timed quest resets itself after this
    expressTime: p(95, 30, 300, 5), // thermal express: seconds before the bun goes cold
    bottleTime: p(40, 10, 120, 5), // message in a bottle: seconds from picking it up until the ferry horn
    escapeDistance: p(30, 10, 80, 1),
    escapeTime: p(3, 0.5, 15, 0.5),
  },
  tram: {
    speed: p(7, 2, 20, 0.5), // m/s along the track
    dwellSeconds: p(9, 2, 30, 0.5), // waiting at the stop
    endSeconds: p(6, 1, 30, 0.5), // waiting at the end of the line
    startDelay: p(4, 0, 30, 0.5),
    blockedSeconds: p(14, 4, 40, 1), // halted while the driver clears the track
    brakeDistance: p(9, 3, 30, 0.5), // something on the track this far ahead stops the tram
    trackSlack: p(1.5, 0, 4, 0.1), // how far beside the rails still counts as on the track
  },
  havoc: {
    runSeconds: p(180, 60, 600, 10), // length of a Havoc Hour run
    chainSeconds: p(6, 2, 20, 0.5), // a chain stays alive this long after the last mischief
    maxMult: p(8, 2, 20, 1),
    repeatFactor: p(0.5, 0, 1, 0.05), // doing the same thing again in a chain scores this fraction
    startDelay: p(4, 0, 20, 1), // the clock starts on your first move, or after this
  },
  motion: {
    treeSway: p(1, 0, 3, 0.05), // how far treetops sway in the wind (0 = still)
    swaySpeed: p(1.6, 0.3, 4, 0.05),
    boatBob: p(1, 0, 3, 0.05), // how much moored boats bob and roll (0 = still)
    lampGlow: p(1, 0, 1.5, 0.05), // brightness of the street lamps at dusk and night
  },
  coop: {
    tauntRadius: p(16, 4, 40, 1), // people this close to a taunting gull watch it and nobody else
    tauntLoud: p(1.3, 0.3, 3, 0.1), // how loud a taunt is (people turn to look)
    tauntEvery: p(0.9, 0.3, 3, 0.1), // seconds between taunt squawks while held
    passWindow: p(2.5, 0.5, 6, 0.1), // a thrown item counts as "in flight" this long
    catchRadius: p(2.6, 0.8, 6, 0.1), // a partner's throw this close jumps into your beak
    chainWindow: p(8, 2, 20, 0.5), // seconds between passes that still count as one volley
    spotRadius: p(3, 1, 8, 0.1), // a splat this close to the partner's lock counts as spotted
    spotAssist: p(1.8, 0.5, 5, 0.1), // lock radius a bomber gets from the partner's mark
    tangleSeconds: p(6, 2, 15, 0.5), // how long a caught gull is stuck without help
    rescueRadius: p(2.2, 1, 6, 0.1), // the partner frees you from this close
  },
  sun: {
    shadowDx: p(-0.45, -2, 2, 0.05), // the shadow falls this far in x per metre of height (the sun is south-east)
    shadowDz: p(-0.35, -2, 2, 0.05),
    wakeRadius: p(1.5, 0.5, 4, 0.1), // a shadow this close to a sleeper's face wakes them
    fadeHeight: p(22, 6, 60, 1), // above this the shadow is too faint to matter
    cloudFactor: p(0.25, 0, 1, 0.05), // Cloud Glide: the shadow shrinks to this fraction while gliding high
    awakeSeconds: p(12, 3, 40, 1), // how long a woken sunbather stays sitting up
    shove: p(6, 1, 20, 0.5), // an awake sunbather swats you away from the towel
    guardRadius: p(2.8, 1, 6, 0.1),
  },
  dog: {
    speed: p(7.5, 2, 14, 0.5),
    chaseRadius: p(11, 3, 30, 1), // park dogs chase gulls on the ground this close
    fetchRadius: p(45, 10, 100, 1), // a ball this close is fetched
    biteShove: p(7, 1, 20, 0.5),
    scatterRadius: p(1.5, 0.5, 4, 0.1), // food within this of the running dog flies
    idleWander: p(2.5, 0, 8, 0.5),
  },
  sprinkler: {
    seconds: p(16, 4, 60, 1), // how long they run after the valve is pecked
    scare: p(1, 0, 3, 0.1), // how loudly people flee the spray
  },
  quiet: {
    loud: p(1.6, 0.5, 4, 0.1), // how loud flying in the quiet zone is
    interval: p(1.2, 0.3, 5, 0.1), // seconds between racket noises while you fly there
  },
  pigeons: {
    guardRadius: p(7, 2, 20, 0.5), // gulls this close to the statue get chased off
    shove: p(9, 1, 30, 0.5), // how hard the gang shoves a gull away
    feedRadius: p(4, 1, 10, 0.5), // a bun or salmiakki this close to the gang counts
    scatterSeconds: p(20, 5, 60, 1), // how long they stay away after salmiakki
    count: p(9, 3, 20, 1),
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
    vendorDistract: p(3, 0.5, 10, 0.5), // seconds a vendor stares at a noise (crow call, decoy flock) and ignores gulls
    wakeLoud: p(0.5, 0.1, 1.5, 0.05), // a sleeping vendor wakes at a noise this loud (clatter 1, splat 0.4) within half the hearing range
    wakeDistance: p(2.2, 0.5, 6, 0.1), // ...or a gull this close
    sleepAfter: p(9, 2, 30, 1), // seconds of quiet before a woken vendor dozes off again
    droneStun: p(1.3, 0, 4, 0.1),
    droneKnock: p(6, 0, 15, 0.5),
    droneStamina: p(18, 0, 60, 1),
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
    wardenThiefRange: p(30, 5, 100, 1), // with two gulls, he goes after the one carrying stolen food within this range
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
    music: p(0.5, 0, 1, 0.05), // music loudness (times master)
    musicFade: p(3, 0.5, 10, 0.5), // seconds to crossfade between music tiers
    musicDownDelay: p(12, 0, 60, 1), // seconds the heat must stay lower before the music calms down
  },
  render: {
    fogNear: p(150, 0, 400, 1),
    fogFar: p(700, 100, 1500, 1),
    nightLight: p(0.38, 0.1, 1, 0.02), // how bright the lights are at dusk (the night market)
    hemi: p(1.9, 0, 4, 0.05), // sky/ground fill light
    sun: p(1.9, 0, 5, 0.05), // sun (casts the shadows)
    exposure: p(1.0, 0.3, 2.5, 0.05), // tone-mapping exposure
    shadowArea: p(70, 20, 200, 5), // half-size in metres of the shadow box around the player
    ao: p(0.32, 0, 0.8, 0.02), // baked darkening at the foot of walls
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
