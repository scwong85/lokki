import { describe, expect, it } from 'vitest';
import { QuestLog } from '../../src/gameplay/quest';
import { QUESTS } from '../../src/data/quests';
import { TriggerSystem, type PropView, type TriggerCtx } from '../../src/gameplay/triggers';
import { TRIGGERS } from '../../src/data/triggers';
import { BUN_CHECKPOINTS, FERRY_CABIN_ROOFS, FERRY_DECK, STATUE } from '../../src/data/places';
import { tuning } from '../../src/core/tuning';
import { createRng } from '../../src/core/rng';
import { World } from '../../src/world/collision';
import { newNpc, startle, stepNpc, type GullInfo, type NpcCtx } from '../../src/gameplay/npc';

const DT = 1 / 60;
const tick = (q: QuestLog, secs: number) => {
  const out = [];
  for (let i = 0; i < Math.round(secs / DT); i++) out.push(...q.tick({ dt: DT, carryingStolen: false, nearestNpc: 5 }));
  return out;
};
const get = (q: QuestLog, id: string) => q.quests.find((x) => x.id === id)!;
const win = (q: QuestLog, events: string[]) => events.forEach((e) => q.onEvent(e));
const MAIN_WINS: Record<string, string[]> = {
  swap: ['snatch:candy', 'tookItem:salmiakki', 'yuck'],
  cap: ['grab:statueCap', 'capDelivered'],
  bun: ['grab:bun', 'bun1', 'bun2', 'bun3'],
  map: ['snatch:map', 'mapInSea', 'wrongFerry'],
  date: ['snatch:flowers', 'poopNpc:dater', 'dateOver'],
  toy: ['grab:toy', 'tookItem:toy'],
};

describe('the quest pack', () => {
  it('has the seven quests, the finale and the extras, each with its own objectives', () => {
    expect(QUESTS.map((q) => q.id)).toEqual(['icecream', 'swap', 'cap', 'bun', 'map', 'date', 'toy', 'finale', 'extras', 'bonus']);
    for (const q of QUESTS) expect(q.objectives.length).toBeGreaterThan(0);
  });
  it('the finale is locked until the seven main quests are won, then unlocks with a note', () => {
    const q = new QuestLog(QUESTS);
    expect(get(q, 'finale').status).toBe('locked');
    q.onEvent('finaleStart');
    expect(get(q, 'finale').status).toBe('locked'); // events are ignored while locked
    win(q, ['snatch:icecream', 'alert']);
    for (const t of tick(q, 0.1)) void t;
    q.onEvent('snatch:icecream');
    // finish ice cream: escape far away while carrying
    for (let i = 0; i < 400; i++) q.tick({ dt: DT, carryingStolen: true, nearestNpc: 99 });
    expect(get(q, 'icecream').status).toBe('won');
    for (const id of ['swap', 'cap', 'bun', 'date', 'toy']) win(q, MAIN_WINS[id]);
    expect(get(q, 'finale').status).toBe('locked');
    const notes = [...q.onEvent('snatch:map'), ...q.onEvent('mapInSea'), ...q.onEvent('wrongFerry')];
    expect(notes).toContainEqual({ type: 'unlocked', quest: 'finale' });
    expect(get(q, 'finale').status).toBe('idle'); // waits for the ferry horn
  });
  it('the finale starts on the horn and is won by its three objectives', () => {
    const q = new QuestLog(QUESTS);
    for (const e of ['alert', 'snatch:icecream']) q.onEvent(e);
    for (let i = 0; i < 400; i++) q.tick({ dt: DT, carryingStolen: true, nearestNpc: 99 });
    for (const id of ['swap', 'cap', 'bun', 'map', 'date', 'toy']) win(q, MAIN_WINS[id]);
    expect(q.onEvent('finaleStart')).toContainEqual({ type: 'started', quest: 'finale' });
    win(q, ['tipChair', 'tipChair']);
    expect(get(q, 'finale').objectives[0].done).toBe(false); // needs three chairs
    win(q, ['tipChair', 'grab:stallBun']);
    expect(q.onEvent('poopWarden')).toContainEqual({ type: 'won', quest: 'finale' });
  });
  it('quests with a start event stay idle until it happens, then start', () => {
    const q = new QuestLog(QUESTS);
    expect(get(q, 'cap').status).toBe('idle');
    expect(q.onEvent('grab:statueCap')).toContainEqual({ type: 'started', quest: 'cap' });
    expect(get(q, 'cap').timeLeft).toBe(tuning.quest.capTime.value);
  });
  it('each timed quest has its own time limit', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('grab:statueCap');
    tick(q, 10);
    expect(get(q, 'cap').timeLeft).toBeCloseTo(tuning.quest.capTime.value - 10, 0);
    expect(tuning.quest.finaleTime.value).toBeGreaterThan(tuning.quest.capTime.value);
  });
  it('a failed timed quest resets itself after a moment so you can try again', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('grab:statueCap');
    const lostNotes = tick(q, tuning.quest.capTime.value + 1);
    expect(get(q, 'cap').status === 'lost' || lostNotes.some((n) => n.type === 'retry')).toBe(true);
    const notes = tick(q, tuning.quest.retryDelay.value + 1);
    expect(notes.some((n) => n.type === 'retry' && n.quest === 'cap')).toBe(true);
    expect(get(q, 'cap').status).toBe('idle');
    expect(get(q, 'cap').objectives.every((o) => !o.done)).toBe(true);
  });
  it('objectives with "after" only count in order (bun checkpoints)', () => {
    const q = new QuestLog(QUESTS);
    q.onEvent('grab:bun');
    q.onEvent('bun2'); // out of order: ignored
    expect(get(q, 'bun').objectives[1].done).toBe(false);
    win(q, ['bun1', 'bun2']);
    expect(q.onEvent('bun3')).toContainEqual({ type: 'won', quest: 'bun' });
  });
  it('wanted() lists only events that could matter right now', () => {
    const q = new QuestLog(QUESTS);
    const w = q.wanted();
    expect(w.has('grab:statueCap')).toBe(true); // idle cap quest wants its start event
    expect(w.has('capDelivered')).toBe(false); // not started yet
    expect(w.has('finaleStart')).toBe(false); // locked
    expect(w.has('poopNpc')).toBe(true); // extras are active from the start
    q.onEvent('grab:statueCap');
    expect(q.wanted().has('capDelivered')).toBe(true);
  });
});

describe('world triggers', () => {
  const prop = (o: Partial<PropView>): PropView => ({ type: 'cap', x: 0, y: 0, z: 0, free: true, ...o });
  const ctx = (o: Partial<TriggerCtx> = {}): TriggerCtx => ({
    props: [], gull: { x: 0, y: 5, z: 0, grounded: false }, carried: null, isLand: (x) => x < 100, ...o,
  });
  const roofMid = { x: (FERRY_DECK.minX + FERRY_DECK.maxX) / 2, z: (FERRY_DECK.minZ + FERRY_DECK.maxZ) / 2 };

  it('the statue cap anywhere on the ferry fires capDelivered once, only when wanted', () => {
    const t = new TriggerSystem(TRIGGERS);
    const c = ctx({ props: [prop({ tag: 'statueCap', x: roofMid.x, y: 3.4, z: roofMid.z })] });
    expect(t.update(c, new Set())).toEqual([]); // nobody wants it yet: not consumed
    expect(t.update(c, new Set(['capDelivered']))).toEqual(['capDelivered']);
    expect(t.update(c, new Set(['capDelivered']))).toEqual([]); // once
    t.reset();
    expect(t.update(c, new Set(['capDelivered']))).toEqual(['capDelivered']);
  });
  it('the cap on the ground or in the beak does not count', () => {
    const t = new TriggerSystem(TRIGGERS);
    const w = new Set(['capDelivered']);
    expect(t.update(ctx({ props: [prop({ tag: 'statueCap', x: roofMid.x, y: 0.2, z: roofMid.z })] }), w)).toEqual([]);
    expect(t.update(ctx({ props: [prop({ tag: 'statueCap', x: roofMid.x, y: 3.4, z: roofMid.z, free: false })] }), w)).toEqual([]);
    expect(t.update(ctx({ props: [prop({ tag: 'other', x: roofMid.x, y: 3.4, z: roofMid.z })] }), w)).toEqual([]);
  });
  it('a map floating in the sea fires mapInSea, a map on land does not', () => {
    const w = new Set(['mapInSea']);
    expect(new TriggerSystem(TRIGGERS).update(ctx({ props: [prop({ type: 'map', x: 50, y: 0.1 })] }), w)).toEqual([]);
    expect(new TriggerSystem(TRIGGERS).update(ctx({ props: [prop({ type: 'map', x: 150, y: 0.1 })] }), w)).toEqual(['mapInSea']);
  });
  it('landing on the ferry cabin roof rings the horn (the finale), flying past does not', () => {
    const w = new Set(['finaleStart']);
    const at = { x: (FERRY_CABIN_ROOFS.minX + FERRY_CABIN_ROOFS.maxX) / 2, y: 9.6, z: (FERRY_CABIN_ROOFS.minZ + FERRY_CABIN_ROOFS.maxZ) / 2 };
    expect(new TriggerSystem(TRIGGERS).update(ctx({ gull: { ...at, grounded: false } }), w)).toEqual([]);
    expect(new TriggerSystem(TRIGGERS).update(ctx({ gull: { ...at, grounded: true } }), w)).toEqual(['finaleStart']);
  });
  it('a bun carried past the three vendors in order fires bun1, bun2, bun3', () => {
    const t = new TriggerSystem(TRIGGERS);
    const w = new Set(['bun1', 'bun2', 'bun3']);
    const bun = prop({ type: 'bun', free: false });
    const at = (i: number) => ctx({ carried: bun, gull: { x: BUN_CHECKPOINTS[i].x, y: 1, z: BUN_CHECKPOINTS[i].z, grounded: true } });
    expect(t.update(at(1), w)).toEqual([]); // second checkpoint first: not yet
    expect(t.update(at(0), w)).toEqual(['bun1']);
    expect(t.update(at(1), w)).toEqual(['bun2']);
    expect(t.update(at(2), w)).toEqual(['bun3']);
    expect(t.update(at(2), w)).toEqual([]);
  });
  it('without a bun in the beak the checkpoints do nothing', () => {
    const t = new TriggerSystem(TRIGGERS);
    const g = { x: BUN_CHECKPOINTS[0].x, y: 1, z: BUN_CHECKPOINTS[0].z, grounded: true };
    expect(t.update(ctx({ carried: null, gull: g }), new Set(['bun1']))).toEqual([]);
    expect(t.update(ctx({ carried: prop({ type: 'fish', free: false }), gull: g }), new Set(['bun1']))).toEqual([]);
  });
  it('the statue is somewhere on the map and the ferry deck is above the water', () => {
    expect(Number.isFinite(STATUE.x + STATUE.z)).toBe(true);
    expect(FERRY_DECK.minY).toBeGreaterThan(2);
    expect(FERRY_CABIN_ROOFS.minY).toBeGreaterThan(FERRY_DECK.minY);
  });
});

describe('tourist items, goals and the yuck reaction', () => {
  const open: NpcCtx = { world: new World(), walkable: () => true, rng: createRng(3) };
  const far: GullInfo = { x: 500, y: 20, z: 500, diving: false };
  const run = (n: ReturnType<typeof newNpc>, secs: number) => {
    const ev = [];
    for (let i = 0; i < Math.round(secs / DT); i++) ev.push(...stepNpc(n, far, [], DT, open));
    return ev;
  };
  it('a tourist sent to a goal walks there and reports arrival once', () => {
    const n = newNpc(1, { x: 0, z: 0, heading: 0, color: 0 });
    n.goal = { x: 0, z: -20, name: 'ferry' };
    n.mode = 'walk';
    let arrivals = 0;
    let at = { x: 0, z: 0 };
    for (let i = 0; i < 60 * 40; i++) {
      for (const e of stepNpc(n, far, [], DT, open)) {
        if (e.type === 'arrived') {
          arrivals++;
          at = { x: n.x, z: n.z };
          expect(e.goal).toBe('ferry');
        }
      }
    }
    expect(arrivals).toBe(1);
    expect(Math.hypot(at.x, at.z + 20)).toBeLessThan(2.5); // it was at the goal when it reported arrival
    expect(n.goal).toBeNull();
  });
  it('yuck: flails for a few seconds, then sulks and goes back to normal', () => {
    const n = newNpc(1, { x: 0, z: 0, heading: 0, color: 0, wants: ['candy', 'salmiakki'] });
    expect(n.wants).toEqual(['candy', 'salmiakki']);
    const ev = startle(n, 'yuck');
    expect(ev[0].type).toBe('yuck');
    expect(n.mode).toBe('yuck');
    run(n, 3.2);
    expect(n.mode).toBe('recover');
    run(n, tuning.npc.recoverTime.value + 0.5);
    expect(n.mode).not.toBe('recover');
  });
});
