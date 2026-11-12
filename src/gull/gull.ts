import * as THREE from 'three';
import { newFlightState, stepFlight, GULL_RADIUS, type FlightEvent, type FlightInput, type FlightState } from './flight';
import { surfaceBelow, type Box } from '../world/collision';
import type { Target } from '../gameplay/targets';
import { tuning } from '../core/tuning';
import { GullModel } from './model';
import { computePose } from './pose';

/** The player's gull: flight state + procedural model + blob shadow. */
export class Gull {
  readonly mesh = new THREE.Group();
  readonly shadow: THREE.Mesh;
  readonly position = new THREE.Vector3();
  readonly model = new GullModel();
  state: FlightState;
  private prev: { x: number; y: number; z: number; heading: number };
  private pitch = 0;
  private roll = 0;
  private walkPhase = 0;
  private beakT = 0;
  private time = 0;

  constructor(private start: { x: number; z: number }) {
    this.state = newFlightState(start.x, start.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z, heading: 0 };
    this.mesh.rotation.order = 'YXZ';
    this.mesh.add(this.model.root);
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

  /** Hold the beak open for a moment (screech, ouch). */
  openBeak(secs: number): void {
    this.beakT = Math.max(this.beakT, secs);
  }

  update(inp: FlightInput, camYaw: number, dt: number, boxes: readonly Box[], time: number, targets: readonly Target[] = []): FlightEvent[] {
    const s = this.state;
    this.prev = { x: s.x, y: s.y, z: s.z, heading: s.heading };
    return stepFlight(s, inp, camYaw, dt, boxes, time, targets);
  }

  applyInterpolation(alpha: number, frameDt: number, boxes: readonly Box[]): void {
    const s = this.state;
    const p = this.prev;
    this.time += frameDt;
    this.beakT = Math.max(0, this.beakT - frameDt);
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
    this.mesh.scale.y = s.stunT > 0 ? 0.85 : 1;

    this.walkPhase += hs * frameDt * 2.4;
    this.model.apply(
      computePose({
        mode: s.mode,
        stunned: s.stunT > 0,
        hspeed: hs,
        walkPhase: this.walkPhase,
        flapAnim: s.flapAnim,
        flapDuration: tuning.flight.flapInterval.value,
        heightAbove: s.heightAbove,
        turnRate: s.turnRate,
        bodyPitch: this.pitch,
        beakOpen: this.beakT > 0,
        time: this.time,
      }),
      frameDt,
    );

    // blob shadow on the surface below (helps judge height and landings)
    const surf = surfaceBelow(boxes, this.position.x, this.position.z, this.position.y - GULL_RADIUS + 0.05);
    const h = Math.max(0, this.position.y - GULL_RADIUS - surf.y);
    this.shadow.position.set(this.position.x, surf.y + 0.03, this.position.z);
    const sc = Math.max(0.4, 1.6 - h * 0.03);
    this.shadow.scale.set(sc, sc, sc);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.4 - h * 0.01);
  }
}
