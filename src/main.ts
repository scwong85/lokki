import * as THREE from 'three';
import { startLoop } from './core/loop';
import { Input } from './core/input';
import { events } from './core/events';
import { tuning } from './core/tuning';
import { addGroundPlane, createScene } from './render/scene';
import { palette } from './render/palette';
import { FollowCamera } from './render/camera';
import { Gull } from './gull/gull';
import { GULL_RADIUS, aimDiveAngle, divePreview, type FlightEvent } from './gull/flight';
import { windAt } from './gull/wind';
import { buildCourse, buildCourseVisuals } from './world/greybox';
import { buildCity } from './world/city';
import { World } from './world/collision';
import type { PropSpawn } from './gameplay/props';
import { Credits } from './ui/credits';
import { PhysicsWorld } from './physics/physics';
import { Interaction, type GagEvent } from './gameplay/interaction';
import { Reticle } from './render/reticle';
import { bestAimTarget, diveHits, updateTargets, type Target } from './gameplay/targets';
import { DiveMarker } from './render/diveMarker';
import { DebugPanel } from './ui/debugPanel';
import { Hud } from './ui/hud';
import { AudioManager } from './core/audio';
import { NpcManager } from './gameplay/npcs';
import { QuestLog, type QuestNote } from './gameplay/quest';
import { QUESTS } from './data/quests';
import { TOURIST_SPAWNS } from './data/npcs';
import type { NpcEvent } from './gameplay/npc';
import { Todo } from './ui/todo';
import { CityDefense, type DefenseEvent } from './gameplay/defense';
import { DETERRENT_NAMES, applyHit } from './gameplay/deterrents';
import type { HeatReason } from './gameplay/heat';
import type { Noise } from './gameplay/npc';
import { HeatMeter } from './ui/heatMeter';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
await RAPIER.init();
const phys = new PhysicsWorld(RAPIER);

const scene = createScene();
// `?greybox` loads the M1 test course instead of the city
const greybox = new URLSearchParams(location.search).has('greybox');
let world: World;
let targets: Target[];
let targetMeshes: THREE.Object3D[];
let start: { x: number; z: number };
let propSpawns: PropSpawn[] = [];
let walkable: (x: number, z: number) => boolean = () => true;
if (greybox) {
  const course = buildCourse();
  const visuals = buildCourseVisuals(course.boxes, course.targets);
  addGroundPlane(scene, palette.ground);
  scene.add(visuals.group);
  world = new World(course.boxes);
  ({ targets, start } = course);
  targetMeshes = visuals.targetMeshes;
} else {
  const city = buildCity();
  scene.add(city.group);
  world = city.world;
  ({ targets, start, targetMeshes, propSpawns, walkable } = city);
  phys.addStaticMesh(city.physicsMesh.vertices, city.physicsMesh.indices);
}
const gull = new Gull(start);
phys.createGullBody(GULL_RADIUS, start.x, GULL_RADIUS, start.z);
const interaction = new Interaction(phys, world, scene);
for (const sp of propSpawns) interaction.props.spawn(sp);
// tourists and the quest log only exist in the city
const npcs = greybox ? null : new NpcManager(world, interaction.props, scene, walkable);
if (npcs) {
  for (const sp of TOURIST_SPAWNS) npcs.spawn(sp);
  interaction.npcs = npcs;
}
// the city's response: heat, vendors, scare lines, nets, the Warden (city only)
const defense = greybox ? null : new CityDefense(world, scene, walkable);
const heatMeter = defense ? new HeatMeter(document.body) : null;
const stepNoises: Noise[] = [];
if (npcs && defense) {
  let nTourist = 0;
  interaction.npcs = {
    snatchCandidates: (b) => npcs.snatchCandidates(b),
    onSnatched: (id) => npcs.onSnatched(id),
    blockedHint: (b) => npcs.blockedHint(b),
    poopSpheres: () => {
      const t = npcs.poopSpheres();
      nTourist = t.length;
      return [...t, ...defense.poopSpheres()];
    },
    onPooped: (i) => (i < nTourist ? npcs.onPooped(i) : defense.onPooped(i - nTourist)),
  };
}
const quests = new QuestLog(greybox ? [] : QUESTS);
const todo = new Todo(document.body);
const poopReticle = new Reticle();
scene.add(poopReticle.mesh);
const marker = new DiveMarker();
scene.add(gull.mesh, gull.shadow, marker.group);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
(window as unknown as { __lokki: unknown }).__lokki = { gull, cam, world, interaction, npcs, quests, defense };
const debug = new DebugPanel(document.body);
const hud = new Hud(document.body);
const credits = new Credits(document.body);
const audio = new AudioManager();
for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, () => audio.unlock());
let simTime = 0;
let hits = 0;
let lastBump = -10;
let explainedLearning = false;

events.on('tuningChanged', () => {
  phys.setGravity(tuning.physics.gravity.value);
  const f = scene.fog as THREE.Fog;
  f.near = tuning.render.fogNear.value;
  f.far = tuning.render.fogFar.value;
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cam.resize(innerWidth / innerHeight);
});

function onFlightEvents(evs: FlightEvent[]): void {
  for (const e of evs) {
    if (e.type === 'flap') audio.play('flap');
    else if (e.type === 'hop') audio.play('hop');
    else if (e.type === 'diveStart') {
      audio.play('screech');
      gull.openBeak(0.5);
    } else if (e.type === 'exhausted') hud.toast('Out of breath!', 0.6);
    else if (e.type === 'land' && e.quality === 'hard') {
      hud.toast('Oof!');
      audio.play('thud');
      gull.openBeak(0.8);
    } else if (e.type === 'land' && e.quality === 'rough') {
      hud.toast('Rough landing', 0.6);
      audio.play('thud');
    } else if (e.type === 'land' && e.perch) hud.toast('Perched', 0.8);
    else if (e.type === 'bonk') {
      hud.toast('Bonk!');
      audio.play('bonk');
      gull.openBeak(0.8);
    }
  }
}

/** A sound the tourists and the Warden can hear. */
function noise(x: number, z: number, loud: number): void {
  npcs?.addNoise(x, z, loud);
  stepNoises.push({ x, z, loud });
}

function heat(reason: HeatReason): void {
  if (defense) onDefense(defense.addHeat(reason));
}

function onDefense(evs: DefenseEvent[]): void {
  for (const e of evs) {
    switch (e.type) {
      case 'tier':
        if (e.up) audio.play('alarm');
        break;
      case 'deployed': {
        const msg = {
          vendors: 'The vendors grab their spray bottles!',
          lines: 'The city is stringing scare lines over the stalls!',
          nets: 'Nets are going up over the stalls!',
          warden: 'The Gull Warden has arrived!',
        }[e.id];
        hud.toast(msg, 2.2);
        break;
      }
      case 'dodged': {
        const what = { vendors: 'Dodged the spray!', warden: 'Dodged the swat!', lines: 'Slipped past the scare lines!', nets: 'Flew under the net!' }[e.id];
        hud.toast(`${what} (gulls learning ${e.count}/${e.need})`, 1.6);
        if (!explainedLearning) {
          explainedLearning = true;
          setTimeout(() => hud.toast('Every clean dodge teaches the gulls. A learned deterrent barely hurts any more, but the city brings in something new.', 4.5), 1700);
        }
        break;
      }
      case 'learned':
        hud.toast(`The gulls have learned to beat the ${DETERRENT_NAMES[e.id]}! It barely works now.`, 2.6);
        break;
      case 'hit': {
        const dropped = applyHit(gull.state, e.hit);
        if (!dropped) {
          hud.toast('Slipped through!', 0.8);
          break;
        }
        const lost = interaction.dropCarried(gull.state);
        const what = { spray: 'Sprayed by a vendor!', swat: 'Swatted by the Warden!', line: 'Tangled in a scare line!', net: 'Caught in the net!' }[e.hit.kind];
        hud.toast(lost ? `${what} Dropped the ${lost.def.name}!` : what, 1.4);
        audio.play(e.hit.kind === 'spray' ? 'splat' : e.hit.kind === 'swat' ? 'bonk' : 'twang');
        hud.flash({ spray: '#7ec8ff', swat: '#ffb347', line: '#ffffff', net: '#ffffff' }[e.hit.kind]);
        gull.openBeak(0.7);
        break;
      }
      case 'spray':
        audio.play('hiss');
        break;
      case 'noticed':
        audio.play(e.who === 'warden' ? 'whistle' : 'gasp');
        if (e.who === 'warden') hud.toast('The Warden spotted you!', 1.2);
        break;
      case 'poopVendor':
        audio.play('splat');
        hud.toast('Splat! That vendor is out of action for a bit', 1.4);
        break;
      case 'poopWarden':
        audio.play('splat');
        audio.play('yelp');
        hud.toast('Splat! The Warden is NOT amused', 1.8);
        notes(quests.onEvent('poopWarden'));
        break;
      case 'umbrella':
        audio.play('clatter');
        hud.toast('Plink! The umbrella took it', 1.2);
        break;
    }
  }
}

/** Quest notifications -> toasts and sounds. */
function notes(list: QuestNote[]): void {
  for (const n of list) {
    const q = quests.quests.find((x) => x.id === n.quest)!;
    if (n.type === 'started') hud.toast(`Spotted! ${Math.round(tuning.quest.timeLimit.value)} seconds!`, 1.4);
    else if (n.type === 'objective') {
      const text = q.objectives.find((o) => o.id === n.objective)!.text;
      hud.toast(`✓ ${text}`, 1.6);
    } else if (n.type === 'won') {
      audio.play('win');
      hud.toast(q.timed ? 'Ice cream secured!' : 'All extras done!', 2.2);
    } else if (n.type === 'lost') {
      audio.play('lose');
      hud.toast('Time is up! Press R to try again', 3);
    }
  }
}

function onNpcEvents(evs: NpcEvent[]): void {
  for (const e of evs) {
    if (e.type === 'noticed') {
      audio.play('gasp');
      notes(quests.onEvent('alert'));
      heat('noticed');
    } else if (e.type === 'panic' || e.type === 'chase') audio.play('yelp');
  }
}

function onGags(gags: GagEvent[]): void {
  for (const g of gags) {
    switch (g.type) {
      case 'grab':
        audio.play('pop');
        gull.openBeak(0.25);
        hud.toast(`Got the ${g.prop.def.name}!`, 0.7);
        break;
      case 'toss':
        audio.play('hop');
        break;
      case 'heavy':
        hud.toast(`The ${g.prop.def.name} is too heavy!`, 0.8);
        break;
      case 'splat':
        audio.play('splat');
        noise(g.x, g.z, 0.4);
        break;
      case 'snatch':
        audio.play('yelp');
        hud.toast('Snatched!', 1);
        notes(quests.onEvent('snatch'));
        heat('snatch');
        break;
      case 'poopNpc':
        audio.play('splat');
        audio.play('yelp');
        hud.toast('Splat! Right on a tourist!', 1.1);
        notes(quests.onEvent('poopNpc'));
        heat('poopNpc');
        break;
      case 'poopProp':
        audio.play('splat');
        hud.toast(`Splat! ${g.prop.def.name}`, 0.9);
        break;
      case 'break': {
        audio.play('crash');
        hud.toast('Crash!', 0.9);
        const t = g.prop.cur.p;
        noise(t.x, t.z, 1);
        heat('break');
        if (g.prop.type === 'bottle') notes(quests.onEvent('breakBottle'));
        break;
      }
      case 'clatter': {
        // a noisy prop clangs (loud, adds heat); anything else thrown hard just thumps (quieter, but still distracts)
        audio.play(g.quiet ? 'thud' : 'clatter');
        noise(g.prop.cur.p.x, g.prop.cur.p.z, g.quiet ? 0.6 : 1);
        if (!g.quiet) heat('clatter');
        break;
      }
      case 'tipped': {
        hud.toast(`${g.prop.def.name} tipped over!`, 1);
        const t = g.prop.cur.p;
        noise(t.x, t.z, 1);
        heat('tipped');
        if (g.prop.type === 'bin') notes(quests.onEvent('tipBin'));
        break;
      }
    }
  }
}

startLoop({
  update(dt) {
    simTime += dt;
    const m = input.consumeMouse();
    cam.rotate(m.dx, m.dy);
    if (input.wasPressed('KeyR')) {
      gull.reset();
      interaction.reset();
      npcs?.reset();
      defense?.reset();
      quests.reset();
    }
    if (input.wasPressed('KeyC')) credits.toggle();
    if (input.wasPressed('KeyH') && defense?.activateHawk()) hud.toast('Hawk-eye!', 0.8);
    if (input.wasPressed('KeyM')) hud.toast(audio.toggleMute() ? 'Sound off' : 'Sound on', 0.8);
    const { x, y } = input.axes();
    const wasDive = gull.state.mode === 'dive';
    const evs = gull.update(
      { ax: x, ay: y, flap: input.isDown('Space'),
        dive: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
        aimPitch: cam.pitch,
        carryMass: interaction.carriedMass,
      },
      cam.yaw,
      dt,
      world,
      simTime,
      targets,
    );
    onFlightEvents(evs);
    if (npcs?.pushGull(gull.state) && simTime - lastBump > 1) {
      lastBump = simTime;
      audio.play('bonk');
      hud.toast('Blocked! They are guarding it', 1.1);
    }
    onGags(
      interaction.update(
        gull.state,
        { grab: input.wasPressed('KeyE'), toss: input.wasPressed('KeyQ'), poop: input.wasPressed('KeyF') || input.wasClicked() },
        dt,
        simTime,
      ),
    );
    if (npcs) {
      const g = gull.state;
      onNpcEvents(npcs.update(dt, { x: g.x, y: g.y, z: g.z, diving: g.mode === 'dive' }));
      notes(quests.tick({ dt, carryingStolen: interaction.carried?.stolen === true, nearestNpc: npcs.nearestDistance(g) }));
      if (defense) onDefense(defense.update(dt, g, stepNoises, npcs.npcs.some((n) => n.seesGull)));
      stepNoises.length = 0;
    }
    if (wasDive) {
      const s = gull.state;
      const got = diveHits(targets, { x: s.x, y: s.y, z: s.z }, GULL_RADIUS);
      if (got.length) {
        hits += got.length;
        audio.play('chime');
        hud.toast(got.length > 1 ? `Double hit! x${got.length}` : 'Got it!', 0.8);
      }
    }
    updateTargets(targets, dt);
    input.endStep();
  },
  render(alpha, frameDt) {
    gull.applyInterpolation(alpha, frameDt, world);
    interaction.render(alpha, gull.state, simTime, cam.camera.quaternion);
    npcs?.render(simTime, interaction.beakPos(gull.state), cam.camera.quaternion);
    defense?.render(simTime, frameDt);
    if (defense && heatMeter) heatMeter.update(defense.heat, defense.response, defense.hawkReady, defense.hawkActive);
    todo.update(quests.quests, npcs ? npcs.nearestDistance(gull.state) : Infinity, interaction.carried?.stolen === true);
    targets.forEach((t, i) => (targetMeshes[i].visible = t.cooldown === 0));
    const s = gull.state;
    // dive aim aid: where a dive would land, and which target (if any) is on the line
    const diving = s.mode === 'dive';
    const canDive = s.mode === 'air' && s.stunT === 0 && s.heightAbove >= tuning.dive.minHeight.value;
    let aimTarget: ReturnType<typeof bestAimTarget> = null;
    if (diving || canDive) {
      const heading = diving ? s.heading : cam.yaw;
      const angle = diving ? s.diveAngle : aimDiveAngle(cam.pitch);
      aimTarget = bestAimTarget(targets, s, heading, angle);
      marker.update(gull.position, divePreview(s, heading, angle, world), aimTarget !== null, diving);
    } else {
      marker.update(null, null, false, false);
    }
    targets.forEach((t, i) => targetMeshes[i].scale.setScalar(t === aimTarget ? 1.5 : 1));
    // poop aim reticle + context prompt
    const poopReady = 1 - Math.min(1, interaction.poopCd / tuning.poop.cooldown.value);
    const aimPoop = s.mode !== 'ground' && s.stunT === 0 && interaction.poopCd <= 0;
    const poopHit = aimPoop ? interaction.poopPrediction(s, simTime) : null;
    const blocked = poopHit?.tag === 'umbrella';
    poopReticle.update(poopHit, blocked);
    hud.setInteraction(blocked ? 'Umbrella blocks it! Distract the Warden with a noise first (drop or throw a bottle)' : interaction.grabPrompt(s), poopReady);
    cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    audio.setAir(Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, s.mode !== 'ground');
    renderer.render(scene, cam.camera);
    debug.frame(frameDt, `${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    hud.update(s, tuning.flight.staminaMax.value, windAt(simTime), cam.yaw, hits, targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
events.emit('ready', undefined);
