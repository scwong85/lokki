import * as THREE from 'three';
import { startLoop } from './core/loop';
import { Input } from './core/input';
import { events } from './core/events';
import { tuning } from './core/tuning';
import { createScene } from './render/scene';
import { FollowCamera } from './render/camera';
import { Gull } from './gull/gull';
import { DebugPanel } from './ui/debugPanel';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const scene = createScene();
const gull = new Gull();
scene.add(gull.mesh);
const cam = new FollowCamera(innerWidth / innerHeight);
const input = new Input(renderer.domElement);
const debug = new DebugPanel(document.body);

events.on('tuningChanged', () => {
  const f = scene.fog as THREE.Fog;
  f.near = tuning.render.fogNear.value;
  f.far = tuning.render.fogFar.value;
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cam.resize(innerWidth / innerHeight);
});

startLoop({
  update(dt) {
    const m = input.consumeMouse();
    cam.rotate(m.dx, m.dy);
    const { x, y } = input.axes();
    gull.update(x, y, cam.yaw, dt);
    input.endStep();
  },
  render(alpha, frameDt) {
    gull.applyInterpolation(alpha);
    cam.update(gull.position, frameDt);
    renderer.render(scene, cam.camera);
    debug.frame(frameDt);
  },
});

(window as unknown as { __lokkiReady: boolean }).__lokkiReady = true;
events.emit('ready', undefined);
