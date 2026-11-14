import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CityDefense } from '../../src/gameplay/defense';
import { newFlightState, stepFlight } from '../../src/gull/flight';
import { World } from '../../src/world/collision';
import { NET_Y, NET_ZONE } from '../../src/data/deterrents';
import { tuning } from '../../src/core/tuning';

const DT = 1 / 60;

/** The arms race must never remove diving: with the net up you must still be able to start a dive under it and snatch. */
describe('diving with the net up', () => {
  const up = () => {
    const d = new CityDefense(new World(), new THREE.Group(), () => true);
    d.response.onTier(3);
    const away = newFlightState(300, 300);
    away.y = 30;
    away.mode = 'air';
    for (let i = 0; i < 60; i++) d.update(0.1, away, [], false); // lines and net are put up
    return d;
  };

  it('there is enough room under the net to start a dive (clearance needed < space under the net)', () => {
    const space = NET_ZONE.maxY - 0.5; // free height above the ground for a gull flying under the net
    expect(space).toBeGreaterThan(tuning.dive.minHeight.value + 0.4);
  });

  it('a gull flying low under the net can start a dive', () => {
    const s = newFlightState(0, -16);
    s.mode = 'air';
    s.y = NET_ZONE.maxY - 0.3; // as high as it can fly under the net
    s.vz = -tuning.flight.glideSpeed.value;
    const ev = stepFlight(s, { ax: 0, ay: 0, flap: false, dive: true, aimPitch: 0.5 }, 0, DT, new World(), 0, []);
    expect(ev.some((e) => e.type === 'diveStart')).toBe(true);
  });

  it('a dive that starts under the net never touches it', () => {
    const d = up();
    const w = new World();
    const s = newFlightState(0, -16);
    s.mode = 'air';
    s.y = NET_ZONE.maxY - 0.3;
    s.vz = -tuning.flight.glideSpeed.value;
    let hits = 0;
    for (let i = 0; i < 120; i++) {
      stepFlight(s, { ax: 0, ay: 0, flap: false, dive: true, aimPitch: 0.5 }, 0, DT, w, i * DT, []);
      hits += d.update(DT, s, [], false).filter((e) => e.type === 'hit' && e.hit.kind === 'net').length;
      if ((s.mode as string) === 'ground') break;
    }
    expect(hits).toBe(0);
  });

  it('a dive from above the net is still caught (that is what the net is for)', () => {
    const d = up();
    const s = newFlightState(0, -16);
    s.mode = 'dive';
    s.y = NET_Y + 0.3;
    s.vy = -20;
    expect(d.update(DT, s, [], false).some((e) => e.type === 'hit' && e.hit.kind === 'net')).toBe(true);
  });
});
