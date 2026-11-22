import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { ARCS, STAGES_PER_ARC, previousStage, stageId, stagesOf, playgroundOf } from '../../src/data/arcs';
import { levelSetup, levelUnlocked, levelProgress, mergeRecord, blankRecord } from '../../src/gameplay/level';
import { QUESTS } from '../../src/data/quests';
import { TRIGGERS } from '../../src/data/triggers';
import { TOURIST_SPAWNS } from '../../src/data/npcs';
import { introducedAt, isUnlocked } from '../../src/gameplay/mechanics';
import { orderLevels, levelGroup, levelsOf, inPlayground, titleLevelRows } from '../../src/ui/menus';

const setup = (id: string, coop = false) => levelSetup(LEVELS.find((l) => l.id === id)!, QUESTS, TRIGGERS, TOURIST_SPAWNS, coop);

describe('arcs and stages', () => {
  it('four arcs of five stages', () => {
    expect(ARCS.length).toBe(4);
    expect(STAGES_PER_ARC).toBe(5);
    expect(stageId(1, 3)).toBe('a1s3');
  });
  it('a stage is opened by the one before; an act opens after the finale of the act before', () => {
    expect(previousStage(1, 1)).toBeNull();
    expect(previousStage(1, 4)).toEqual({ arc: 1, stage: 3 });
    expect(previousStage(2, 1)).toEqual({ arc: 1, stage: 5 });
  });
  it('stages come first in the list, then the Playground', () => {
    const ids = LEVELS.map((l) => l.id);
    const staged = stagesOf(LEVELS);
    expect(staged.length).toBeGreaterThan(0);
    expect(ids.slice(0, staged.length)).toEqual(staged.map((l) => l.id));
    expect(playgroundOf(LEVELS).length + staged.length).toBe(LEVELS.length);
  });
  it('stage 1 is open at the start and the next stage waits for it', () => {
    const first = LEVELS.find((l) => l.id === 'a1s1')!;
    expect(levelUnlocked(first, {})).toBe(true);
    const second = { ...first, id: 'a1s2', requires: 'a1s1' };
    expect(levelUnlocked(second, {})).toBe(false);
    expect(levelUnlocked(second, { a1s1: mergeRecord(blankRecord(), [true, false, false], 100) })).toBe(true);
  });
  it('stage 1 has only flying, snatching and carrying', () => {
    expect(introducedAt({ arc: 1, stage: 1 })).toEqual([]);
    expect(isUnlocked('poop', { arc: 1, stage: 1 })).toBe(false);
  });
  it('solo play skips the co-op objectives; two gulls must finish them too', () => {
    const solo = setup('a1s1');
    const duo = setup('a1s1', true);
    expect(solo.main).toEqual(['picnic', 'picnicGong']);
    expect([...solo.side]).toEqual(['map']);
    expect(duo.main).toEqual(['picnic', 'picnicGong', 'handoverCoop', 'twoBirds']);
    const won = (ids: string[]) => ids.map((id) => ({ id, status: 'won' }));
    const def = LEVELS.find((l) => l.id === 'a1s1')!;
    expect(levelProgress(def, duo, won(['picnic', 'picnicGong'])).cleared).toBe(false);
    expect(levelProgress(def, duo, won(duo.main)).cleared).toBe(true);
    expect(levelProgress(def, solo, won(solo.main)).cleared).toBe(true);
  });
  it('every chain objective names a trigger or event source that exists', () => {
    const s = setup('a1s1', true);
    const have = new Set(s.triggers.map((t) => ('event' in t ? t.event : '')));
    expect(have.has('bunAtDock') && have.has('mapInSea')).toBe(true);
  });
  it('the level list groups stages under their act and the rest under the Playground', () => {
    const rows = orderLevels([
      { id: 'x', name: 'x', blurb: '', stars: 0, current: false, district: 'kauppatori' },
      { id: 'a1s2', name: 'b', blurb: '', stars: 0, current: false, arc: 1, stage: 2 },
      { id: 'a1s1', name: 'a', blurb: '', stars: 0, current: false, arc: 1, stage: 1 },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a1s1', 'a1s2', 'x']);
    expect(levelGroup(rows[0])).toContain('Act 1');
    expect(levelGroup(rows[2])).toContain('Playground');
  });
});

describe('the level list keeps the old levels behind one button', () => {
  const all = [
    { id: 'old', name: 'Old', blurb: '', stars: 1, current: false, district: 'kauppatori' },
    { id: 'a1s1', name: 'First', blurb: '', stars: 0, current: false, arc: 1, stage: 1 },
    { id: 'free', name: 'Free', blurb: '', stars: 0, current: false, sandbox: true },
  ];
  it('main: the stages and free play; playground: the rest', () => {
    expect(levelsOf(all, 'main').map((l) => l.id)).toEqual(['a1s1', 'free']);
    expect(levelsOf(all, 'playground').map((l) => l.id)).toEqual(['old']);
    expect(inPlayground(all[0])).toBe(true);
  });
  it('the main list has one Playground button with the cleared count, and the playground has a way back', () => {
    const main = titleLevelRows(all);
    expect(main).not.toContain('data-level="old"');
    expect(main).toContain('data-playground="playground"');
    expect(main).toContain('1/1');
    const pg = titleLevelRows(all, 'playground');
    expect(pg).toContain('data-level="old"');
    expect(pg).toContain('data-playground="main"');
  });
});

describe('stage 1.2 The Gull Picnic', () => {
  it('a collection, the raid and the gong clear it; the old chains are side orders; poop, toss and honk are unlocked, tug is not', () => {
    const solo = setup('a1s2');
    const duo = setup('a1s2', true);
    expect(solo.main).toEqual(['picnic', 'raid', 'picnicGong']);
    expect([...solo.side]).toEqual(['freak', 'honkchain', 'bottleService']);
    expect([...solo.secret]).toEqual(['grannyScarf', 'oldBoot']);
    expect(duo.main).toEqual(['picnic', 'raid', 'picnicGong', 'passVendace', 'twoSeats']);
    expect(isUnlocked('honk', { arc: 1, stage: 2 })).toBe(true);
    expect(isUnlocked('tug', { arc: 1, stage: 2 })).toBe(false);
    expect(introducedAt({ arc: 1, stage: 2 }).map((m) => m.id).sort()).toEqual(['honk', 'poop', 'toss']);
  });
  it('is opened by stage 1.1', () => {
    expect(LEVELS.find((l) => l.id === 'a1s2')!.requires).toBe('a1s1');
  });
  it('every side order is a chain of at least two steps', () => {
    const s = setup('a1s2');
    for (const q of s.quests.filter((x) => s.side.has(x.id))) {
      expect(q.chain).toBe(true);
      expect(q.objectives.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('the old Fish Market stays playable in the Playground with the same mechanics', () => {
    const old = LEVELS.find((l) => l.id === 'fish-market')!;
    expect(old.arc).toBeUndefined();
    expect(old.gate).toEqual({ arc: 1, stage: 2 });
    expect(setup('fish-market').main).toEqual(['freak', 'bottleService', 'honkchain']);
  });
});

describe('stages 1.3 and 1.4', () => {
  it('1.3 Strings Attached: three chains, a hidden bonus, heat and lines, tug and hiding unlocked', () => {
    const solo = setup('a1s3');
    const duo = setup('a1s3', true);
    expect(solo.main).toEqual(['tugchain', 'spray', 'booschain']);
    expect(solo.secret.has('buttonchain')).toBe(true);
    expect(duo.main).toEqual(['tugchain', 'spray', 'booschain', 'teamTug', 'duoSpray']);
    expect(solo.defense).toBe(true);
    const g = { arc: 1, stage: 3 };
    expect(['tug', 'hide', 'peck'].every((m) => isUnlocked(m as never, g))).toBe(true);
    expect(isUnlocked('taunt', g)).toBe(false);
    expect(LEVELS.find((l) => l.id === 'a1s3')!.requires).toBe('a1s2');
  });
  it('1.4 Mood Swings: three chains; taunt, slip and the jukebox unlocked, contagion not yet', () => {
    const duo = setup('a1s4', true);
    expect(duo.main).toEqual(['mapcone', 'wetfloor', 'jukechain', 'decoyThief', 'duet']);
    const g = { arc: 1, stage: 4 };
    expect(['taunt', 'slip', 'jukebox'].every((m) => isUnlocked(m as never, g))).toBe(true);
    expect(isUnlocked('contagion', g)).toBe(false);
    expect(LEVELS.find((l) => l.id === 'a1s4')!.requires).toBe('a1s3');
  });
  it('every stage chain has at least two steps', () => {
    for (const id of ['a1s3', 'a1s4']) for (const q of setup(id).quests) expect(q.objectives.length).toBeGreaterThanOrEqual(2);
  });
});

describe('stage 1.5 The Warden (arc finale)', () => {
  it('three chains, the Warden deployed, co-op pincer and volley; everything of act 1 is unlocked', () => {
    const duo = setup('a1s5', true);
    expect(duo.main).toEqual(['rushchain', 'strikechain', 'nemesis', 'pincer', 'volley']);
    expect(duo.defense).toBe(true);
    const def = LEVELS.find((l) => l.id === 'a1s5')!;
    expect(def.deploy).toEqual(['warden']);
    expect(def.requires).toBe('a1s4');
    const g = { arc: 1, stage: 5 };
    for (const m of ['poop', 'toss', 'honk', 'tug', 'hide', 'peck', 'taunt', 'slip', 'jukebox', 'cloth', 'domino', 'contagion', 'slam']) expect(isUnlocked(m as never, g)).toBe(true);
    expect(isUnlocked('gust', g)).toBe(false);
  });
  it('the Strike line stands away from the Warden bench and the queue', () => {
    const t = setup('a1s5').tourists.filter((x) => x.role === 'bowler');
    expect(t.length).toBe(6);
    expect(Math.min(...t.map((x) => x.x))).toBeGreaterThan(10);
  });
  it('all five stages of act 1 are in order at the front of the list', () => {
    expect(LEVELS.slice(0, 5).map((l) => l.id)).toEqual(['a1s1', 'a1s2', 'a1s3', 'a1s4', 'a1s5']);
    expect(LEVELS.slice(0, 5).map((l) => l.stage)).toEqual([1, 2, 3, 4, 5]);
  });
  it('the five stage rewards are the five skills of act 1', () => {
    expect(LEVELS.slice(0, 5).map((l) => l.reward)).toEqual(['flight', 'fatbird', 'hawkeye', 'mimic', 'quickpoop']);
  });
});

describe('stage quests can be finished: every world trigger they wait for is in the stage', () => {
  const triggerEvents = (t: (typeof TRIGGERS)[number]): string[] => ('events' in t ? t.events : [t.event]);
  const worldEvents = new Set(TRIGGERS.flatMap(triggerEvents));
  for (const def of stagesOf(LEVELS)) {
    it(`${def.id}: objectives that need a world trigger have it`, () => {
      const s = levelSetup(def, QUESTS, TRIGGERS, TOURIST_SPAWNS, true);
      const have = new Set(s.triggers.flatMap(triggerEvents));
      for (const q of s.quests) for (const o of q.objectives) if (o.kind === 'event' && o.event && worldEvents.has(o.event)) expect(have.has(o.event), `${q.id}/${o.id} waits for "${o.event}"`).toBe(true);
    });
  }
});

describe('Act 2 stages 2.1 and 2.2', () => {
  it('2.1 Steps: three chains in the Senate district, opened by the end of Act 1', () => {
    const def = LEVELS.find((l) => l.id === 'a2s1')!;
    expect(def.district).toBe('senaatintori');
    expect(def.requires).toBe('a1s5');
    const duo = setup('a2s1', true);
    expect(duo.main).toEqual(['cheese', 'peel', 'hotdog', 'duoCheese', 'stairRelay']);
    expect(duo.quests.filter((q) => q.chain).length).toBe(3);
    expect(isUnlocked('pose', { arc: 2, stage: 1 })).toBe(false);
  });
  it('2.2 Say Pigeon!: pose is introduced here; three chains and the co-op pair', () => {
    const duo = setup('a2s2', true);
    expect(duo.main).toEqual(['photos', 'caps', 'shutterbug', 'duoPigeon', 'duoPose']);
    expect(introducedAt({ arc: 2, stage: 2 }).map((m) => m.id)).toEqual(['pose']);
    expect(isUnlocked('pose', { arc: 2, stage: 2 })).toBe(true);
    expect(introducedAt({ arc: 2, stage: 4 }).map((m) => m.id)).toEqual(['disguise']);
  });
  it('the three photos need three different poses (the second and third wait for "new")', () => {
    const photos = setup('a2s2').quests.find((q) => q.id === 'photos')!;
    expect(photos.objectives.map((o) => o.event)).toEqual(['pose:any', 'pose:new', 'pose:new']);
  });
  it('the vendor storms off and the quay trap uses a slippery fish on the walker\'s route', () => {
    const s = setup('a2s1');
    expect(s.triggers.some((t) => 'event' in t && t.event === 'fishTrap')).toBe(true);
    expect(s.props.some((p) => p.tag === 'slippery')).toBe(true);
    expect(s.tourists.find((t) => t.role === 'walker')?.patrol?.length).toBe(2);
  });
});

describe('playtest fixes for 2.1 and 2.2', () => {
  it('the cheese counts at the foot of any lane, and the fish is far from the sausages', () => {
    const s = setup('a2s1');
    const t = s.triggers.find((x) => 'event' in x && x.event === 'cheeseCart') as { zone: { minX: number; maxX: number } };
    expect(t.zone.maxX - t.zone.minX).toBeGreaterThan(15);
    const fish = s.props.find((p) => p.tag === 'slippery')!;
    const dog = s.props.find((p) => p.tag === 'cartDog')!;
    expect(Math.hypot(fish.x - dog.x, fish.z - dog.z)).toBeGreaterThan(10);
  });
  it('taking the cap counts however it is picked up (grab:cap)', () => {
    const caps = setup('a2s2').quests.find((q) => q.id === 'caps')!;
    expect(caps.objectives[0].event).toBe('grab:cap');
  });
  it('the photographers stand within a fright of each other', () => {
    const p = setup('a2s2').tourists.filter((t) => t.role === 'selfie');
    expect(p.length).toBe(3);
    for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z)).toBeLessThan(3.4);
  });
});

describe('Act 2 stages 2.3 and 2.4', () => {
  it('2.3 Ding Dong: bell and tram; three chains; flock call as the reward', () => {
    const def = LEVELS.find((l) => l.id === 'a2s3')!;
    expect(def.bells).toBeTruthy();
    expect(def.tram).toBeTruthy();
    expect(def.reward).toBe('flock');
    expect(def.requires).toBe('a2s2');
    expect(setup('a2s3', true).main).toEqual(['bell', 'lunch', 'bellsplat', 'duoDing', 'bellBombers']);
    const bell = setup('a2s3').quests.find((q) => q.id === 'bell')!;
    expect(bell.objectives.map((o) => o.event)).toEqual(['bell', 'bellSnatch', 'bellSnatch']);
  });
  it('2.4 Turf War: pigeons and the captain\'s cap, disguise as the reward, the cap puzzle moved onto the square', () => {
    const def = LEVELS.find((l) => l.id === 'a2s4')!;
    expect(def.pigeons).toBeTruthy();
    expect(def.reward).toBe('disguise');
    expect(def.switches?.[0].effect).toBe('disguise');
    expect(def.switches![0].x).toBeGreaterThan(-200);
    expect(setup('a2s4', true).main).toEqual(['forgive', 'wardrobe', 'captainchain', 'duoTurf', 'dressing']);
    expect(isUnlocked('disguise', { arc: 2, stage: 3 })).toBe(false);
    expect(isUnlocked('disguise', { arc: 2, stage: 4 })).toBe(true);
  });
  it('all four Act 2 stages follow Act 1 in order', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.slice(0, 9)).toEqual(['a1s1', 'a1s2', 'a1s3', 'a1s4', 'a1s5', 'a2s1', 'a2s2', 'a2s3', 'a2s4']);
  });
});

describe('Act 2 stage 2.5 The Key to the City (the end of Senaatintori)', () => {
  it('three big chains, the co-op pair, everything in play, and Pigeon Diplomacy as the reward', () => {
    const def = LEVELS.find((l) => l.id === 'a2s5')!;
    expect(def.requires).toBe('a2s4');
    expect(def.reward).toBe('pigeons');
    expect(def.tram && def.pigeons && def.bells && def.quiet && def.quietBreaks).toBeTruthy();
    expect(setup('a2s5', true).main).toEqual(['ceremony', 'shhh', 'screen', 'ceremonyPincer', 'duoConcert']);
    const ceremony = setup('a2s5').quests.find((q) => q.id === 'ceremony')!;
    expect(ceremony.objectives.map((o) => o.event)).toEqual(['pigeonsFriends', 'pose:any', 'bell', 'grab:key', 'keyNest']);
    expect(setup('a2s5').triggers.some((t) => 'event' in t && t.event === 'keyNest')).toBe(true);
  });
  it('the next act opens after this stage', () => {
    expect(previousStage(3, 1)).toEqual({ arc: 2, stage: 5 });
    expect(LEVELS.slice(0, 10).map((l) => l.id)).toEqual(['a1s1', 'a1s2', 'a1s3', 'a1s4', 'a1s5', 'a2s1', 'a2s2', 'a2s3', 'a2s4', 'a2s5']);
  });
  it('Pigeon Diplomacy is a skill the stage gives', async () => {
    const { skillById } = await import('../../src/data/skills');
    expect(skillById('pigeons')?.name).toBe('Pigeon Diplomacy');
  });
});
