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
const quests = new QuestLog(greybox ? [] : QUESTS);
const todo = new Todo(document.body);
const poopReticle = new Reticle();
scene.add(poopReticle.mesh);
const marker = new DiveMarker();
scene.add(gull.mesh, gull.shadow, marker.group);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
(window as unknown as { __lokki: unknown }).__lokki = { gull, cam, world, interaction, npcs, quests };
const debug = new DebugPanel(document.body);
const hud = new Hud(document.body);
const credits = new Credits(document.body);
const audio = new AudioManager();
for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, () => audio.unlock());
let simTime = 0;
let hits = 0;
let lastBump = -10;

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
        npcs?.addNoise(g.x, g.z, 0.4);
        break;
      case 'snatch':
        audio.play('yelp');
        hud.toast('Snatched!', 1);
        notes(quests.onEvent('snatch'));
        break;
      case 'poopNpc':
        audio.play('splat');
        audio.play('yelp');
        hud.toast('Splat! Right on a tourist!', 1.1);
        notes(quests.onEvent('poopNpc'));
        break;
      case 'poopProp':
        audio.play('splat');
        hud.toast(`Splat! ${g.prop.def.name}`, 0.9);
        break;
      case 'break': {
        audio.play('crash');
        hud.toast('Crash!', 0.9);
        const t = g.prop.cur.p;
        npcs?.addNoise(t.x, t.z, 1);
        if (g.prop.type === 'bottle') notes(quests.onEvent('breakBottle'));
        break;
      }
      case 'clatter': {
        audio.play('clatter');
        const t = g.prop.cur.p;
        npcs?.addNoise(t.x, t.z, 1);
        break;
      }
      case 'tipped': {
        hud.toast(`${g.prop.def.name} tipped over!`, 1);
        const t = g.prop.cur.p;
        npcs?.addNoise(t.x, t.z, 1);
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
      quests.reset();
    }
    if (input.wasPressed('KeyC')) credits.toggle();
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
    interaction.render(alpha);
    npcs?.render(simTime, interaction.beakPos(gull.state), cam.camera.quaternion);
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
    poopReticle.update(aimPoop ? interaction.poopPrediction(s, simTime) : null);
    hud.setInteraction(interaction.grabPrompt(s), poopReady);
    cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    audio.setAir(Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, s.mode !== 'ground');
    renderer.render(scene, cam.camera);
    debug.frame(frameDt, `${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    hud.update(s, tuning.flight.staminaMax.value, windAt(simTime), cam.yaw, hits, targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
events.emit('ready', undefined);
