import { Squash } from '../gameplay/squash';
import * as THREE from 'three';
import type { GullSlot } from '../data/gullSkins';
import { newFlightState, stepFlight, GULL_RADIUS, type FlightEvent, type FlightInput, type FlightState } from './flight';
import type { World } from '../world/collision';
import type { Target } from '../gameplay/targets';
import { tuning } from '../core/tuning';
import { GullModel } from './model';
import { computePose } from './pose';
import { followRemote, type Pose } from '../net/remote';
import type { GullSnap } from '../net/snapshot';

/** The player's gull: flight state + procedural model + blob shadow. */
export class Gull {
  readonly mesh = new THREE.Group();
  readonly shadow: THREE.Mesh;
  readonly position = new THREE.Vector3();
  readonly model = new GullModel();
  state: FlightState;
  readonly squash = new Squash();
  private lastMode = 'ground';
  /** Extra vertical wobble for a moment (taunt, emote, a finished to-do). */
  wiggleT = 0;

  /** Slide the whole gull sideways (standing on a moving tram roof). */
  carry(dx: number, dz: number): void {
    this.state.x += dx;
    this.state.z += dz;
    this.prev.x += dx;
    this.prev.z += dz;
  }

  private prev: { x: number; y: number; z: number; heading: number };
  private pitch = 0;
  private roll = 0;
  private walkPhase = 0;
  private beakT = 0;
  private time = 0;
  /** Is there sea under this spot? (set by the game; the greybox has none) */
  isWater: ((x: number, z: number) => boolean) | null = null;

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

  /** Where this gull starts (and returns to on a restart): a level in another district starts elsewhere. */
  setStart(x: number, z: number): void {
    this.start = { x, z };
  }

  /** Wear a gull look (colours per slot). */
  setSkin(colours: Record<GullSlot, number>): void {
    this.model.setSkin(colours);
  }

  /** Pigeon look on/off. */
  setDisguise(on: boolean): void {
    this.model.setDisguise(on);
  }

  /** Another player's gull: the last news about it (it is then eased towards that, not simulated). */
  private remoteT: (Pose & { mode: string; fa: number; ha: number; tr: number }) | null = null;

  /** True while this gull is steered by news from the network instead of its own flight. */
  get isRemote(): boolean {
    return this.remoteT !== null;
  }

  /** The other player is in pigeon disguise (their news says so). */
  remoteDisguised = false;
  /** Taunting (holding everyone's attention) and tangled (caught, waiting for the partner). */
  taunting = false;
  tangled = false;

  setRemote(s: GullSnap): void {
    if (!!s.dg !== this.remoteDisguised) {
      this.remoteDisguised = !!s.dg;
      this.model.setDisguise(this.remoteDisguised);
    }
    this.taunting = !!s.tn;
    const t = { x: s.p[0], y: s.p[1], z: s.p[2], vx: s.v[0], vy: s.v[1], vz: s.v[2], heading: s.h, mode: s.mode, fa: s.fa ?? 0, ha: s.ha ?? 0, tr: s.tr ?? 0 };
    if (!this.remoteT) Object.assign(this.state, { x: t.x, y: t.y, z: t.z, heading: t.heading }); // first news: appear there
    this.remoteT = t;
  }

  /** One sim step of an other-player gull: ease towards the last news. */
  stepRemote(dt: number): void {
    const t = this.remoteT;
    if (!t) return;
    const s = this.state;
    this.prev = { x: s.x, y: s.y, z: s.z, heading: s.heading };
    followRemote(s, t, dt, 14);
    s.mode = t.mode as FlightState['mode'];
    s.flapAnim = t.fa;
    s.heightAbove = t.ha;
    s.turnRate = t.tr;
    s.stunT = 0;
    s.overWater = !!this.isWater?.(s.x, s.z) && s.y < GULL_RADIUS + 1;
  }

  reset(): void {
    this.remoteT = null;
    this.state = newFlightState(this.start.x, this.start.z);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z, heading: 0 };
  }

  /** Hold the beak open for a moment (screech, ouch). */
  openBeak(secs: number): void {
    this.beakT = Math.max(this.beakT, secs);
  }

  update(inp: FlightInput, camYaw: number, dt: number, world: World, time: number, targets: readonly Target[] = []): FlightEvent[] {
    const s = this.state;
    this.prev = { x: s.x, y: s.y, z: s.z, heading: s.heading };
    s.overWater = !!this.isWater?.(s.x, s.z) && s.y < GULL_RADIUS + 1;
    return stepFlight(s, inp, camYaw, dt, world, time, targets);
  }

  applyInterpolation(alpha: number, frameDt: number, world: World): void {
    const s = this.state;
    const p = this.prev;
    this.time += frameDt;
    this.beakT = Math.max(0, this.beakT - frameDt);
    this.position.set(p.x + (s.x - p.x) * alpha, p.y + (s.y - p.y) * alpha, p.z + (s.z - p.z) * alpha);
    const dh = Math.atan2(Math.sin(s.heading - p.heading), Math.cos(s.heading - p.heading));
    this.mesh.position.copy(this.position);
    const swimming = s.mode === 'ground' && s.overWater;
    if (swimming) this.mesh.position.y -= tuning.water.swimSink.value - Math.sin(this.time * 2.2) * 0.03; // sits in the water and bobs

    const hs = Math.hypot(s.vx, s.vz);
    const airborne = s.mode !== 'ground';
    const targetPitch = airborne ? Math.atan2(s.vy, Math.max(hs, 3)) : 0;
    const targetRoll = airborne ? Math.max(-0.7, Math.min(0.7, s.turnRate * 0.3)) : 0;
    const k = 1 - Math.exp(-8 * frameDt);
    this.pitch += (targetPitch - this.pitch) * k;
    this.roll += (targetRoll - this.roll) * k;
    this.mesh.rotation.set(this.pitch, p.heading + dh * alpha, this.roll);
    // squash on landing, stretch on take-off; a wiggle when showing off
    if (s.mode !== this.lastMode) {
      if (s.mode === 'ground') this.squash.kick(-tuning.juice.landSquash.value);
      else if (this.lastMode === 'ground') this.squash.kick(tuning.juice.hopStretch.value);
      this.lastMode = s.mode;
    }
    this.squash.update(Math.min(frameDt, 0.05));
    this.wiggleT = Math.max(0, this.wiggleT - frameDt);
    const wig = this.wiggleT > 0 ? Math.sin(this.time * 22) * 0.07 : 0;
    const sy = this.squash.y * (s.stunT > 0 ? 0.85 : 1) + wig;
    this.mesh.scale.set(this.squash.xz, sy, this.squash.xz);
    if (this.wiggleT > 0) this.mesh.rotation.z += Math.sin(this.time * 16) * 0.18;

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
        swimming,
        jumping: s.jump,
      }),
      frameDt,
    );

    // blob shadow on the surface below (helps judge height and landings)
    const surf = world.surfaceBelow(this.position.x, this.position.z, this.position.y - GULL_RADIUS + 0.05);
    const h = Math.max(0, this.position.y - GULL_RADIUS - surf.y);
    this.shadow.position.set(this.position.x, surf.y + 0.12, this.position.z);
    const sc = Math.max(0.4, 1.6 - h * 0.03);
    this.shadow.scale.set(sc, sc, sc);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.4 - h * 0.01);
    this.shadow.visible = !swimming;
  }
}
