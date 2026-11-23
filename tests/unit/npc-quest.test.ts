import { beforeEach, describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { World, type Box } from '../../src/world/collision';
import { bearing, canSee, guardState, handPos, newNpc, snatchState, snatchable, startle, stepNpc, type GullInfo, type Npc, type NpcCtx } from '../../src/gameplay/npc';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { tuning } from '../../src/core/tuning';
import { npcPose } from '../../src/gameplay/npcPose';

const DT = 1 / 60;
const open: NpcCtx = { world: new World(), walkable: () => true, rng: createRng(1) };
const far: GullInfo = { x: 500, y: 20, z: 500, diving: false };

/** Tourist at the origin facing -Z (heading 0) with an ice cream. */
function tourist(ice = true): Npc {
  const n = newNpc(1, { x: 0, z: 0, heading: 0, ice, color: 0 });
  if (ice) n.holding = 42;
  return n;
}
function run(n: Npc, g: GullInfo, secs: number, ctx: NpcCtx = open, noises: { x: number; z: number; loud: number }[] = []) {
  const evs = [];
  for (let i = 0; i < Math.round(secs / DT); i++) evs.push(...stepNpc(n, g, i === 0 ? noises : [], DT, ctx));
  return evs;
}

describe('rng', () => {
  it('is deterministic per seed and in [0,1)', () => {
    const a = createRng(5), b = createRng(5);
    for (let i = 0; i < 20; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(createRng(5).next()).not.toBe(createRng(6).next());
  });
});

describe('tourist senses', () => {
  const ahead: GullInfo = { x: 0, y: 1.5, z: -8, diving: false }; // 8 m in front
  it('sees a gull in front, not behind, not beyond range', () => {
    const n = tourist();
    expect(canSee(n, ahead, open.world)).toBe(true);
    expect(canSee(n, { ...ahead, z: 8 }, open.world)).toBe(false);
    expect(canSee(n, { ...ahead, z: -40 }, open.world)).toBe(false);
  });
  it('has a blind spot straight overhead', () => {
    const n = tourist();
    expect(canSee(n, { x: 0, y: 14, z: -4, diving: false }, open.world)).toBe(false); // steep angle
    expect(canSee(n, { x: 0, y: 8, z: -8, diving: false }, open.world)).toBe(true);
  });
  it('is distracted while eating (shorter sight range)', () => {
    const n = tourist();
    const g = { ...ahead, z: -9 };
    expect(canSee(n, g, open.world)).toBe(true);
    n.mode = 'eat';
    expect(canSee(n, g, open.world)).toBe(false);
  });
  it('walls block sight', () => {
    const wall: Box = { min: [-5, 0, -5], max: [5, 10, -4], kind: 'building', color: 0 };
    expect(canSee(tourist(), ahead, new World([wall]))).toBe(false);
  });
});

describe('tourist brain', () => {
  const ahead: GullInfo = { x: 0, y: 1.5, z: -7, diving: false };
  beforeEach(() => {
    tuning.npc.noticeTime.value = 0.4;
  });
  it('notices the gull, then shields the ice cream', () => {
    const n = tourist();
    const ev = run(n, ahead, 3);
    expect(ev.some((e) => e.type === 'noticed')).toBe(true);
    expect(ev.some((e) => e.type === 'shield')).toBe(true);
    expect(n.mode).toBe('shield');
  });
  it('without an ice cream it just watches, no shielding', () => {
    const n = tourist(false);
    const ev = run(n, ahead, 3);
    expect(ev.some((e) => e.type === 'shield')).toBe(false);
    expect(n.mode).not.toBe('shield');
  });
  it('the body blocks a snatch from the gull side but not from the far side', () => {
    const n = tourist();
    run(n, ahead, 3); // shielding: gull is in front (-Z), hand swings behind (+Z)
    const hand = handPos(n);
    expect(hand.z).toBeGreaterThan(0.3);
    const front = { x: 0, y: 1.2, z: -0.7 }; // gull side
    const back = { x: 0, y: 1.2, z: 1.3 }; // behind the tourist, next to the hand
    expect(snatchable(n, front)).toBe(false);
    expect(snatchable(n, back)).toBe(true);
  });
  it('a diving beak reaches further and only the core of the body blocks it (M119)', () => {
    const n = tourist();
    const h = handPos(n);
    const far = { x: h.x, y: h.y + 1.7, z: h.z }; // 1.7 m above the hand: out of reach on foot
    expect(snatchable(n, far)).toBe(false);
    expect(snatchable(n, far, true)).toBe(true);
    run(n, ahead, 3); // shielding: the gull side is blocked on foot
    const front = { x: 0, y: 1.2, z: -0.7 };
    expect(snatchable(n, front)).toBe(false);
    expect(snatchState(n, { x: 0, y: 1.2, z: -2.6 }, true)).not.toBe('ok'); // far beyond the reach of any beak
  });
  it('a vendor scrubbing his sign leaves the plate open from the gull side too', () => {
    const n = tourist();
    run(n, ahead, 3);
    const front = { x: 0, y: 1.2, z: -0.7 };
    expect(snatchable(n, front)).toBe(false);
    n.role = 'cleaner';
    n.cleanT = 4;
    expect(snatchable(n, { x: 0, y: 1.2, z: handPos(n).z - 0.8 })).toBe(true);
    n.cleanT = 0;
    expect(snatchable(n, front)).toBe(false);
  });
  it('a noise turns the body away and the hand stays: the other side opens up (distraction)', () => {
    const n = tourist();
    run(n, ahead, 3);
    const handBefore = handPos(n);
    run(n, ahead, 1, open, [{ x: 20, z: 0, loud: 1 }]); // clang off to the right (+X side)... body turns
    expect(n.distractT).toBeGreaterThan(0);
    // the body has turned toward the noise (towards +X: bearing -pi/2) and the hand has not swung round
    expect(Math.abs(n.heading - bearing(20, 0))).toBeLessThan(0.5);
    const handAfter = handPos(n);
    expect(Math.hypot(handAfter.x - handBefore.x, handAfter.z - handBefore.z)).toBeLessThan(0.3);
    // gull in front is now no longer "the front": hand at +Z side is reachable from the south
    expect(snatchable(n, { x: 0, y: 1.2, z: 1.2 })).toBe(true);
  });
  it('seeing the gull is not noticing it: a short glimpse builds suspicion that fades, a long stare notices', () => {
    const n = tourist();
    const glimpse = run(n, ahead, 0.7);
    expect(glimpse.some((e) => e.type === 'noticed')).toBe(false);
    expect(n.suspicion).toBeGreaterThan(0.2);
    run(n, far, 3); // out of sight: it fades
    expect(n.suspicion).toBe(0);
    expect(run(n, ahead, 3).some((e) => e.type === 'noticed')).toBe(true);
  });
  it('a diving gull is noticed twice as fast', () => {
    const slow = tourist(), quick = tourist();
    run(slow, ahead, 0.6);
    run(quick, { ...ahead, diving: true }, 0.6);
    expect(quick.suspicion).toBeGreaterThan(slow.suspicion * 1.7);
  });
  it('nothing happens to a calm tourist when the gull is far away', () => {
    const n = tourist();
    const ev = run(n, far, 5);
    expect(ev.some((e) => e.type === 'noticed')).toBe(false);
  });
  it('snatched: chases, then recovers and goes back to idle', () => {
    const n = tourist();
    const ev = startle(n, 'snatched');
    expect(ev.some((e) => e.type === 'chase')).toBe(true);
    expect(n.mood).toBe('angry'); // and says so
    expect(n.holding).toBeNull();
    run(n, { x: 0, y: 1, z: -10, diving: false }, tuning.npc.chaseTime.value + 0.5);
    expect(n.mode).toBe('recover');
    run(n, far, tuning.npc.recoverTime.value + 0.5);
    expect(n.mode).not.toBe('recover');
  });
  it('pooped on: panics and runs away from the gull', () => {
    const n = tourist();
    startle(n, 'pooped');
    expect(n.mode).toBe('panic');
    run(n, { x: 0, y: 5, z: -3, diving: false }, 1);
    expect(n.z).toBeGreaterThan(1); // ran away (+Z)
  });
  it('wanders within its home area on walkable ground only', () => {
    const n = tourist(false);
    n.homeX = 10;
    n.homeZ = 10;
    n.x = 10;
    n.z = 10;
    const ctx = { ...open, walkable: (x: number, z: number) => Math.hypot(x - 10, z - 10) < 12 };
    run(n, far, 60, ctx);
    expect(Math.hypot(n.x - 10, n.z - 10)).toBeLessThan(12);
  });
});

describe('quest log', () => {
  const tick = (q: QuestLog, secs: number, carrying: boolean, dist: number) => {
    const notes = [];
    for (let i = 0; i < Math.round(secs / DT); i++) notes.push(...q.tick({ dt: DT, carryingStolen: carrying, nearestNpc: dist }));
    return notes;
  };
  const ice = (q: QuestLog) => q.quests.find((x) => x.id === 'icecream')!;

  it('starts idle; the timed quest starts on the first alert and counts down', () => {
    const q = new QuestLog(QUESTS);
    expect(ice(q).status).toBe('idle');
    tick(q, 5, false, 5);
    expect(ice(q).timeLeft).toBe(tuning.quest.timeLimit.value); // not running yet
    expect(q.onEvent('alert')).toContainEqual({ type: 'started', quest: 'icecream' });
    tick(q, 10, false, 5);
    expect(ice(q).timeLeft).toBeCloseTo(tuning.quest.timeLimit.value - 10, 0);
  });
  it('wins after snatch then escaping far away long enough', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('alert');
    expect(q.onEvent('snatch:icecream')).toContainEqual({ type: 'objective', quest: 'icecream', objective: 'snatch' });
    tick(q, 2, true, 10); // too close
    expect(ice(q).objectives[1].done).toBe(false);
    const notes = tick(q, tuning.quest.escapeTime.value + 0.5, true, tuning.quest.escapeDistance.value + 5);
    expect(notes).toContainEqual({ type: 'won', quest: 'icecream' });
    expect(ice(q).status).toBe('won');
  });
  it('escape progress resets when you drop the ice cream or get close again', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('snatch:icecream');
    tick(q, 2, true, 40);
    expect(ice(q).objectives[1].progress).toBeGreaterThan(1);
    tick(q, 0.1, false, 40);
    expect(ice(q).objectives[1].progress).toBe(0);
  });
  it('escape does not count before the snatch', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('alert');
    tick(q, 10, true, 100);
    expect(ice(q).objectives[1].done).toBe(false);
  });
  it('loses when the timer runs out', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('alert');
    const notes = tick(q, tuning.quest.timeLimit.value + 1, false, 5);
    expect(notes).toContainEqual({ type: 'lost', quest: 'icecream' });
    expect(ice(q).status).toBe('lost');
  });
  it('untimed extras tick off from events, in any order, and finish', () => {
    const q = new QuestLog(QUESTS);
    const ex = () => q.quests.find((x) => x.id === 'extras')!;
    expect(ex().status).toBe('active');
    q.onEvent('tipBin');
    q.onEvent('poopNpc');
    q.onEvent('breakBottle');
    expect(ex().status).toBe('active'); // still the Warden to go
    expect(q.onEvent('poopWarden')).toContainEqual({ type: 'won', quest: 'extras' });
  });
  it('reset restores everything', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('snatch:icecream');
    q.reset();
    expect(ice(q).status).toBe('idle');
    expect(ice(q).objectives.every((o) => !o.done)).toBe(true);
  });
});

describe('readable feedback rules', () => {
  const ahead: GullInfo = { x: 0, y: 1.5, z: -7, diving: false };
  it('snatchState explains why: far, blocked by the body, ok', () => {
    const n = tourist();
    run(n, ahead, 2); // shielding, hand behind
    expect(snatchState(n, { x: 0, y: 1.2, z: -6 })).toBe('far');
    expect(snatchState(n, { x: 0, y: 1.2, z: -0.7 })).toBe('blocked');
    expect(snatchState(n, { x: 0, y: 1.2, z: 1.3 })).toBe('ok');
    expect(snatchState(tourist(false), { x: 0, y: 1.2, z: 0.5 })).toBe('none');
    expect(snatchable(n, { x: 0, y: 1.2, z: 1.3 })).toBe(true);
  });
  it('guardState: unaware = open, shielding and attentive = guarded, distracted = open again', () => {
    const n = tourist();
    expect(guardState(n)).toBe('open');
    run(n, ahead, 2);
    expect(n.mode).toBe('shield');
    expect(guardState(n)).toBe('guarded');
    run(n, ahead, 0.2, open, [{ x: 20, z: 0, loud: 1 }]);
    expect(guardState(n)).toBe('open');
    expect(guardState(tourist(false))).toBe('none');
  });
  it('a distracted tourist with an ice cream shows a "?" instead of "!"', () => {
    const base = { mode: 'shield' as const, moving: false, walkPhase: 0, t: 1, time: 0, holding: true };
    expect(npcPose({ ...base }).indicator).toBe('alarm');
    expect(npcPose({ ...base, distracted: true }).indicator).toBe('distracted');
    expect(npcPose({ ...base, holding: false, distracted: true }).indicator).toBe('alarm');
  });
  it('every quest objective that needs explaining has a hint', () => {
    const snatch = QUESTS.find((q) => q.id === 'icecream')!.objectives;
    expect(snatch.every((o) => !!o.hint)).toBe(true);
  });
  it('the snatch timer defaults to 60 s', () => {
    expect(tuning.quest.timeLimit.value).toBe(60);
  });
});
