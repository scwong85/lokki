import { describe, expect, it } from 'vitest';
import { LEVELS, SANDBOX, SNACK_ATTACK, levelById } from '../../src/data/levels';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { levelProgress, levelSetup, levelStars, mergeRecord, starCount } from '../../src/gameplay/level';
import { sanitize } from '../../src/core/save';
import { QuestLog } from '../../src/gameplay/quest';

const build = (id: string) => levelSetup(levelById(id), QUESTS, TRIGGERS, TOURIST_SPAWNS);

describe('level definitions', () => {
  it('every level builds: known quests and triggers, unique ids', () => {
    for (const l of LEVELS) {
      const s = levelSetup(l, QUESTS, TRIGGERS, TOURIST_SPAWNS);
      expect(new Set(s.quests.map((q) => q.id)).size).toBe(s.quests.length);
      expect(s.main.length + s.secret.size).toBe(s.quests.length);
      for (const id of s.secret) expect(s.quests.some((q) => q.id === id)).toBe(true);
      if (!l.sandbox) {
        expect(l.parTime).toBeGreaterThan(0);
        expect(s.main.length).toBeGreaterThanOrEqual(1);
        expect(s.main.length + s.secret.size).toBeLessThanOrEqual(4); // about 5 minutes
      }
    }
    expect(levelById('nope')).toBe(SANDBOX);
  });

  it('the sandbox is today\'s full game; the stub picks a small cast and a calm city', () => {
    const sb = build('sandbox');
    expect(sb.quests.map((q) => q.id)).toEqual(QUESTS.map((q) => q.id));
    expect(sb.tourists).toHaveLength(TOURIST_SPAWNS.length);
    expect(sb.defense).toBe(true);
    const st = build(SNACK_ATTACK.id);
    expect(st.defense).toBe(false);
    expect(st.tourists.filter((t) => t.role === 'selfie')).toHaveLength(1);
    expect(st.tourists.every((t) => t.ice)).toBe(true);
    expect(st.triggers.map((t) => t.id)).toEqual(['feast']);
    expect(st.quests.map((q) => q.id)).toEqual(['snack', 'feast', 'photobomb']);
  });

  it('unknown ids in a level fail loudly', () => {
    expect(() => levelSetup({ ...SNACK_ATTACK, quests: ['nope'] }, QUESTS, TRIGGERS, TOURIST_SPAWNS)).toThrow(/unknown quest/);
  });
});

describe('clearing and stars', () => {
  it('clears on the main to-dos; the secret one adds the second star; par time the third', () => {
    const s = build(SNACK_ATTACK.id);
    const q = new QuestLog(s.quests);
    const st = () => q.quests.map((x) => ({ id: x.id, status: x.status }));
    expect(levelProgress(SNACK_ATTACK, s, st()).cleared).toBe(false);
    for (const x of q.quests) if (s.main.includes(x.id)) x.status = 'won';
    const p = levelProgress(SNACK_ATTACK, s, st());
    expect(p).toEqual({ cleared: true, allDone: false });
    expect(levelStars(SNACK_ATTACK, p, 100)).toEqual([true, false, true]);
    expect(levelStars(SNACK_ATTACK, p, 999)).toEqual([true, false, false]);
    q.quests.find((x) => x.id === 'photobomb')!.status = 'won';
    expect(levelProgress(SNACK_ATTACK, s, st()).allDone).toBe(true);
    expect(levelProgress(SANDBOX, build('sandbox'), st()).cleared).toBe(false); // free play never "clears"
  });

  it('records keep the best stars and time', () => {
    let r = mergeRecord(undefined, [true, false, false], 200);
    r = mergeRecord(r, [true, true, false], 260);
    expect(r).toEqual({ stars: [true, true, false], best: 200, clears: 2 });
    r = mergeRecord(r, [false, false, false], 50);
    expect(r.best).toBe(200);
    expect(starCount(r)).toBe(2);
  });

  it('per-level saves are sanitised', () => {
    const d = sanitize({ levels: { 'snack-attack': { stars: [true, 'x', true], best: -1, clears: 2.9 }, junk: 5 }, level: 'snack-attack' });
    expect(d.levels).toEqual({ 'snack-attack': { stars: [true, false, true], best: null, clears: 2 } });
    expect(d.level).toBe('snack-attack');
    expect(sanitize({}).levels).toEqual({});
  });
});

describe('level 1 selfie routine', () => {
  it('cycles idle -> 3, 2, 1 -> open, and the open window is the end of the countdown', async () => {
    const { selfieState, inFrame } = await import('../../src/gameplay/selfie');
    const { tuning } = await import('../../src/core/tuning');
    const idle = tuning.selfie.idle.value, count = tuning.selfie.count.value, open = tuning.selfie.open.value;
    expect(selfieState(0).phase).toBe('idle');
    expect(selfieState(idle - 0.01).phase).toBe('idle');
    const seen: number[] = [];
    for (let t = idle; t < idle + count; t += 0.05) {
      const st = selfieState(t);
      expect(st.phase).toBe('count');
      if (seen[seen.length - 1] !== st.count) seen.push(st.count);
    }
    expect(seen).toEqual([3, 2, 1]);
    expect(selfieState(idle + count + 0.01).phase).toBe('open');
    expect(selfieState(idle + count + open - 0.01).phase).toBe('open');
    expect(selfieState(idle + count + open + 0.01).phase).toBe('idle'); // the next cycle
    expect(selfieState(-0.5).phase).toBe('open'); // negative offsets wrap
    // she faces +z (heading pi): the frame is the cone in front of her
    const npc = { x: 0, z: 0 };
    expect(inFrame(npc, Math.PI, { x: 0, y: 1, z: 3 })).toBe(true);
    expect(inFrame(npc, Math.PI, { x: 0, y: 1, z: -3 })).toBe(false); // behind her
    expect(inFrame(npc, Math.PI, { x: 0, y: 1, z: 20 })).toBe(false); // too far
    expect(inFrame(npc, Math.PI, { x: 0, y: 30, z: 3 })).toBe(false); // far overhead
  });

  it('levels unlock when their prerequisite is cleared', async () => {
    const { levelUnlocked } = await import('../../src/gameplay/level');
    const lvl2 = { ...SNACK_ATTACK, id: 'two', requires: 'snack-attack' };
    expect(levelUnlocked(SNACK_ATTACK, {})).toBe(true);
    expect(levelUnlocked(lvl2, {})).toBe(false);
    expect(levelUnlocked(lvl2, { 'snack-attack': { stars: [false, false, false], best: null, clears: 0 } })).toBe(false);
    expect(levelUnlocked(lvl2, { 'snack-attack': { stars: [true, false, false], best: 100, clears: 1 } })).toBe(true);
  });
});

describe('level 3: noise, sight and the double snatch', () => {
  it('unseen snatches: a calm tourist who does not see the gull; not one who is shielding or watching', async () => {
    const { default: RAPIER } = await import('@dimforge/rapier3d-compat');
    await RAPIER.init();
    const THREE = await import('three');
    const { PhysicsWorld } = await import('../../src/physics/physics');
    const { PropManager } = await import('../../src/gameplay/props');
    const { NpcManager } = await import('../../src/gameplay/npcs');
    const { World } = await import('../../src/world/collision');
    const setup = () => {
      const phys = new PhysicsWorld(RAPIER);
      const g = new THREE.Group();
      const props = new PropManager(phys, g);
      const npcs = new NpcManager(new World(), props, g, () => true, 5);
      npcs.spawn({ x: 0, z: 0, heading: 0, ice: true, stationary: true, color: 0 });
      return { npcs, props };
    };
    const a = setup();
    a.npcs.npcs[0].seesGull = false;
    a.npcs.onSnatched(a.npcs.npcs[0].holding!);
    expect(a.npcs.update(1 / 60, { x: 500, y: 20, z: 500, diving: false }).some((e) => e.type === 'snatchUnseen')).toBe(true);
    const b = setup();
    b.npcs.npcs[0].seesGull = true;
    b.npcs.onSnatched(b.npcs.npcs[0].holding!);
    expect(b.npcs.update(1 / 60, { x: 500, y: 20, z: 500, diving: false }).some((e) => e.type === 'snatchUnseen')).toBe(false);
  });
});

describe('level 2 fixes', () => {
  it('stealing his fish after the sign counts, whether or not he is still scrubbing', () => {
    const s = build('bombs-away');
    const q = new QuestLog(s.quests);
    q.onEvent('snatch:fish'); // too early: the sign has not been splatted
    expect(q.quests.find((x) => x.id === 'freak')!.status).toBe('active');
    q.onEvent('signSplat');
    q.onEvent('snatch:fish');
    expect(q.quests.find((x) => x.id === 'freak')!.status).toBe('won');
  });

  it('the poop aim assist steers a drop onto the buoy (and the sign) even with a crosswind', async () => {
    const { spawnPoopAssisted, stepPoop } = await import('../../src/gameplay/poop');
    const { World } = await import('../../src/world/collision');
    const { tuning } = await import('../../src/core/tuning');
    const { PROPS } = await import('../../src/data/props');
    tuning.wind.strength.value = 3;
    const world = new World();
    const buoy = { x: 0, y: 0.3, z: 0, r: PROPS.buoy.radius };
    const land = (targets: (typeof buoy)[]) => {
      const p = spawnPoopAssisted({ x: 3.5, y: 9, z: 1 }, { x: 0, y: 0, z: 0 }, 0, world, [buoy], targets);
      for (let i = 0; i < 600; i++) {
        const hit = stepPoop(p, 1 / 60, i / 60, world, [buoy]);
        if (hit) return hit.prop !== null;
      }
      return false;
    };
    expect(land([buoy])).toBe(true); // assisted
    expect(land([])).toBe(false); // unassisted: the drop misses a drop this far off
    tuning.wind.strength.value = 3;
  });
});
