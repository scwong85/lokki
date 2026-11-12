import * as THREE from 'three';
import { palette } from '../render/palette';
import { newFlightState, stepFlight, GULL_RADIUS, type FlightEvent, type FlightInput, type FlightState } from './flight';
import { surfaceBelow, type Box } from '../world/collision';
import type { Target } from '../gameplay/targets';

/** Graybox gull: capsule + beak + two wing planks + blob shadow (readability aids only; real model is M2). */
export class Gull {
  readonly mesh = new THREE.Group();
  readonly shadow: THREE.Mesh;
  readonly position = new THREE.Vector3();
  state: FlightState;
  private prev: { x: number; y: number; z: number; heading: number };
  private body = new THREE.Group();
  private wings: THREE.Mesh[] = [];
  private pitch = 0;
  private roll = 0;
  private flapPhase = 0;

  constructor(private start: { x: number; z: number }) {
    this.state = newFlightState(start.x, start.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z, heading: 0 };

    const white = new THREE.MeshLambertMaterial({ color: palette.gull, flatShading: true });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), white);
    torso.rotation.x = Math.PI / 2;
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 6),
      new THREE.MeshLambertMaterial({ color: palette.gullBeak, flatShading: true }),
    );
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.08, -0.75);
    this.body.add(torso, beak);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.55), white);
      wing.geometry.translate(side * 0.65, 0, 0);
      wing.position.set(side * 0.25, 0.15, 0);
      this.wings.push(wing);
      this.body.add(wing);
    }
    this.mesh.rotation.order = 'YXZ';
    this.mesh.add(this.body);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x4a4a6a, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
  }

  reset(): void {
    this.state = newFlightState(this.start.x, this.start.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z, heading: 0 };
  }

  update(inp: FlightInput, camYaw: number, dt: number, boxes: readonly Box[], time: number, targets: readonly Target[] = []): FlightEvent[] {
    const s = this.state;
    this.prev = { x: s.x, y: s.y, z: s.z, heading: s.heading };
    return stepFlight(s, inp, camYaw, dt, boxes, time, targets);
  }

  applyInterpolation(alpha: number, frameDt: number, boxes: readonly Box[]): void {
    const s = this.state;
    const p = this.prev;
    this.position.set(p.x + (s.x - p.x) * alpha, p.y + (s.y - p.y) * alpha, p.z + (s.z - p.z) * alpha);
    const dh = Math.atan2(Math.sin(s.heading - p.heading), Math.cos(s.heading - p.heading));
    this.mesh.position.copy(this.position);

    const hs = Math.hypot(s.vx, s.vz);
    const airborne = s.mode !== 'ground';
    const targetPitch = airborne ? Math.atan2(s.vy, Math.max(hs, 3)) : 0;
    const targetRoll = airborne ? Math.max(-0.7, Math.min(0.7, s.turnRate * 0.3)) : 0;
    const k = 1 - Math.exp(-8 * frameDt);
    this.pitch += (targetPitch - this.pitch) * k;
    this.roll += (targetRoll - this.roll) * k;
    this.mesh.rotation.set(this.pitch, p.heading + dh * alpha, this.roll);
    this.body.scale.y = s.stunT > 0 ? 0.6 : 1;

    // wings: folded on ground, spread in glide, swept back in a dive, flap pulse after each flap
    let wingZ = airborne ? 0 : -0.9;
    if (s.mode === 'dive') wingZ = -0.5;
    this.flapPhase = Math.max(0, 1 - s.flapAnim / 0.3);
    wingZ += Math.sin(this.flapPhase * Math.PI) * 0.7;
    this.wings[0].rotation.z = -wingZ;
    this.wings[1].rotation.z = wingZ;

    // blob shadow on the surface below (helps judge height and landings)
    const surf = surfaceBelow(boxes, this.position.x, this.position.z, this.position.y - GULL_RADIUS + 0.05);
    const h = Math.max(0, this.position.y - GULL_RADIUS - surf.y);
    this.shadow.position.set(this.position.x, surf.y + 0.03, this.position.z);
    const sc = Math.max(0.4, 1.4 - h * 0.03);
    this.shadow.scale.set(sc, sc, sc);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.4 - h * 0.01);
  }
}
