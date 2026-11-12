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
import { Credits } from './ui/credits';
import { bestAimTarget, diveHits, updateTargets, type Target } from './gameplay/targets';
import { DiveMarker } from './render/diveMarker';
import { DebugPanel } from './ui/debugPanel';
import { Hud } from './ui/hud';
import { AudioManager } from './core/audio';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const scene = createScene();
// `?greybox` loads the M1 test course instead of the city
const greybox = new URLSearchParams(location.search).has('greybox');
let world: World;
let targets: Target[];
let targetMeshes: THREE.Object3D[];
let start: { x: number; z: number };
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
  ({ targets, start, targetMeshes } = city);
}
const gull = new Gull(start);
const marker = new DiveMarker();
scene.add(gull.mesh, gull.shadow, marker.group);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
(window as unknown as { __lokki: unknown }).__lokki = { gull, cam, world };
const debug = new DebugPanel(document.body);
const hud = new Hud(document.body);
const credits = new Credits(document.body);
const audio = new AudioManager();
for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, () => audio.unlock());
let simTime = 0;
let hits = 0;

events.on('tuningChanged', () => {
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

startLoop({
  update(dt) {
    simTime += dt;
    const m = input.consumeMouse();
    cam.rotate(m.dx, m.dy);
    if (input.wasPressed('KeyR')) gull.reset();
    if (input.wasPressed('KeyC')) credits.toggle();
    if (input.wasPressed('KeyM')) hud.toast(audio.toggleMute() ? 'Sound off' : 'Sound on', 0.8);
    const { x, y } = input.axes();
    const wasDive = gull.state.mode === 'dive';
    const evs = gull.update(
      { ax: x, ay: y, flap: input.isDown('Space'),
        dive: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
        aimPitch: cam.pitch,
      },
      cam.yaw,
      dt,
      world,
      simTime,
      targets,
    );
    onFlightEvents(evs);
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
    cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    audio.setAir(Math.hypot(s.vx, s.vy, s.vz) / tuning.dive.speed.value, s.mode !== 'ground');
    renderer.render(scene, cam.camera);
    debug.frame(frameDt, `${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    hud.update(s, tuning.flight.staminaMax.value, windAt(simTime), cam.yaw, hits, targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
events.emit('ready', undefined);
