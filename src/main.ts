import * as THREE from 'three';
import { startLoop } from './core/loop';
import { Input } from './core/input';
import { events } from './core/events';
import { tuning } from './core/tuning';
import { createScene } from './render/scene';
import { FollowCamera } from './render/camera';
import { Gull } from './gull/gull';
import { GULL_RADIUS, type FlightEvent } from './gull/flight';
import { windAt } from './gull/wind';
import { buildCourse, buildCourseVisuals } from './world/greybox';
import { diveHits, updateTargets } from './gameplay/targets';
import { DebugPanel } from './ui/debugPanel';
import { Hud } from './ui/hud';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const scene = createScene();
const course = buildCourse();
const visuals = buildCourseVisuals(course.boxes, course.targets);
scene.add(visuals.group);
const gull = new Gull(course.start);
scene.add(gull.mesh, gull.shadow);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
const debug = new DebugPanel(document.body);
const hud = new Hud(document.body);
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
    if (e.type === 'exhausted') hud.toast('Out of breath!', 0.6);
    else if (e.type === 'land' && e.quality === 'hard') hud.toast('Oof!');
    else if (e.type === 'land' && e.quality === 'rough') hud.toast('Rough landing', 0.6);
    else if (e.type === 'land' && e.perch) hud.toast('Perched', 0.8);
    else if (e.type === 'bonk') hud.toast('Bonk!');
  }
}

startLoop({
  update(dt) {
    simTime += dt;
    const m = input.consumeMouse();
    cam.rotate(m.dx, m.dy);
    if (input.wasPressed('KeyR')) gull.reset();
    const { x, y } = input.axes();
    const wasDive = gull.state.mode === 'dive';
    const evs = gull.update(
      { ax: x, ay: y, flap: input.isDown('Space'), dive: input.isDown('ShiftLeft') || input.isDown('ShiftRight') },
      cam.yaw,
      dt,
      course.boxes,
      simTime,
    );
    onFlightEvents(evs);
    if (wasDive) {
      const s = gull.state;
      const got = diveHits(course.targets, { x: s.x, y: s.y, z: s.z }, GULL_RADIUS);
      if (got.length) {
        hits += got.length;
        hud.toast(got.length > 1 ? `Double hit! x${got.length}` : 'Got it!', 0.8);
      }
    }
    updateTargets(course.targets, dt);
    input.endStep();
  },
  render(alpha, frameDt) {
    gull.applyInterpolation(alpha, frameDt, course.boxes);
    course.targets.forEach((t, i) => (visuals.targetMeshes[i].visible = t.cooldown === 0));
    const s = gull.state;
    cam.update(gull.position, frameDt, { vx: s.vx, vy: s.vy, vz: s.vz, diving: s.mode === 'dive', turnRate: s.turnRate });
    renderer.render(scene, cam.camera);
    debug.frame(frameDt);
    hud.update(s, tuning.flight.staminaMax.value, windAt(simTime), cam.yaw, hits, course.targets.length, frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
events.emit('ready', undefined);
