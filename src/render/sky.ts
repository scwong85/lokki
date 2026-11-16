import * as THREE from 'three';
import type { SkyPreset } from '../data/skies';
import { windAt } from '../gull/wind';

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.9999; // always behind everything
}`;

const FRAG = `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGround;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunSize;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.22, e));
  c = mix(c, uTop, smoothstep(0.18, 0.85, e));
  c = mix(c, uGround, smoothstep(0.0, -0.12, e));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  float disc = smoothstep(0.9985, 0.9993, s) * uSunSize;
  float glow = (pow(s, 24.0) * 0.38 + pow(s, 6.0) * 0.14) * uSunSize;
  c += uSunColor * (disc + glow);
  gl_FragColor = vec4(c, 1.0);
}`;

/**
 * The sky: a dome that follows the camera (so it has a real horizon and a sun), a handful of drifting low-poly clouds, and the
 * tint of the light, all driven by a preset (data/skies). Two draw calls.
 */
export class Sky {
  readonly dome: THREE.Mesh;
  readonly clouds: THREE.InstancedMesh;
  private readonly mat: THREE.ShaderMaterial;
  private readonly cloudMat: THREE.MeshLambertMaterial;
  private readonly spots: { x: number; y: number; z: number; s: number; sq: number }[] = [];
  private t = 0;
  /** The current look (so the graphics can read the light level and the sun direction). */
  current: SkyPreset | null = null;
  readonly sunDir = new THREE.Vector3(30, 50, 20).normalize();
  /** Brightness factor for the lights. */
  light = 1;

  constructor(private readonly scene: THREE.Scene, cloudCount = 22) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(30, 50, 20) }, uSunColor: { value: new THREE.Color() }, uSunSize: { value: 1 },
      },
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 14), this.mat);
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
    const geo = new THREE.IcosahedronGeometry(1, 0);
    this.clouds = new THREE.InstancedMesh(geo, this.cloudMat, cloudCount);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -900;
    let seed = 11;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < cloudCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 260 + rnd() * 200;
      this.spots.push({ x: Math.cos(a) * r, y: 70 + rnd() * 90, z: Math.sin(a) * r, s: 26 + rnd() * 40, sq: 0.28 + rnd() * 0.18 });
    }
    scene.add(this.clouds);
  }

  /** Switch to a look. Fog, hemisphere and sun colours follow; the graphics read `light` and `sunDir` each frame. */
  apply(p: SkyPreset): void {
    this.current = p;
    const u = this.mat.uniforms;
    (u.uTop.value as THREE.Color).setHex(p.top);
    (u.uMid.value as THREE.Color).setHex(p.mid);
    (u.uHorizon.value as THREE.Color).setHex(p.horizon);
    (u.uGround.value as THREE.Color).setHex(p.fog);
    (u.uSunDir.value as THREE.Vector3).set(...p.sunDir);
    (u.uSunColor.value as THREE.Color).setHex(p.sunColor);
    u.uSunSize.value = p.sunSize;
    this.sunDir.set(...p.sunDir).normalize();
    this.light = p.light;
    this.cloudMat.color.setHex(p.cloud);
    this.clouds.count = Math.round(this.spots.length * Math.min(1, Math.max(0, p.cloudAmount)));
    if (this.scene.fog) (this.scene.fog as THREE.Fog).color.setHex(p.fog);
    const hemi = this.scene.getObjectByName('hemi') as THREE.HemisphereLight | undefined;
    if (hemi) {
      hemi.color.setHex(p.hemiSky);
      hemi.groundColor.setHex(p.hemiGround);
    }
    const sun = this.scene.getObjectByName('sun') as THREE.DirectionalLight | undefined;
    if (sun) sun.color.setHex(p.sunColor);
    this.scene.background = new THREE.Color(p.fog);
  }

  /** Per frame: the dome follows the camera; the clouds drift with the wind (and stay on the dome's side of the horizon). */
  update(dt: number, camera: THREE.Vector3, time: number): void {
    this.t += dt;
    this.dome.position.copy(camera);
    const w = windAt(time);
    const wl = Math.hypot(w.x, w.z) || 1;
    const wx = w.x / wl, wz = w.z / wl;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    const drift = this.t * 1.6;
    for (let i = 0; i < this.clouds.count; i++) {
      const s = this.spots[i];
      // wrap the drift around a 900 m ring so clouds never run out
      const dx = ((s.x + wx * drift + 450) % 900 + 900) % 900 - 450;
      const dz = ((s.z + wz * drift + 450) % 900 + 900) % 900 - 450;
      p.set(camera.x + dx, s.y, camera.z + dz);
      sc.set(s.s, s.s * s.sq, s.s * 0.7);
      m.compose(p, q, sc);
      this.clouds.setMatrixAt(i, m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }
}
