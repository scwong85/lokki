import { describe, expect, it } from 'vitest';
import { newDrone, stepDrone, type DroneEvent } from '../../src/gameplay/drone';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;
const gull = (x: number, y: number, z: number, diving = false) => ({ x, y, z, diving });

describe('the drone', () => {
  it('chases the gull, dives at it after a warning, and hits it if it stays', () => {
    const d = newDrone(0, 30);
    const g = gull(0, 3, 0);
    const ev: DroneEvent[] = [];
    for (let i = 0; i < 60 * 12 && !ev.some((e) => e.type === 'hit' || e.type === 'dodged'); i++) ev.push(...stepDrone(d, g, DT));
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(d.battery).toBeLessThan(tuning.drone.battery.value);
  });
  it('a gull that moves away during the windup dodges the dive', () => {
    const d = newDrone(0, 10);
    const g = gull(0, 3, 0);
    const ev: DroneEvent[] = [];
    for (let i = 0; i < 60 * 12 && !ev.some((e) => e.type === 'hit' || e.type === 'dodged'); i++) {
      if (d.mode === 'windup' && d.t > 0.2) g.x = 12; // flies off after the aim is locked
      ev.push(...stepDrone(d, g, DT));
    }
    expect(ev.some((e) => e.type === 'dodged')).toBe(true);
    expect(ev.some((e) => e.type === 'hit')).toBe(false);
  });
  it('a dive at the drone bonks it and drains the battery', () => {
    const d = newDrone(5, 6);
    const before = d.battery;
    const ev = stepDrone(d, gull(5, 6.5, 5, true), DT);
    expect(ev.some((e) => e.type === 'bonk')).toBe(true);
    expect(d.battery).toBeLessThan(before - 10);
  });
  it('lands when the battery runs out and then stays put', () => {
    const d = newDrone(3, 3);
    d.battery = 0.5;
    const ev: DroneEvent[] = [];
    for (let i = 0; i < 120; i++) ev.push(...stepDrone(d, gull(50, 3, 50), DT));
    expect(ev.filter((e) => e.type === 'landed').length).toBe(1);
    expect(d.mode).toBe('down');
    const x = d.x, z = d.z;
    stepDrone(d, gull(d.x + 1, 1, d.z), DT);
    expect([d.x, d.z]).toEqual([x, z]);
  });
});
