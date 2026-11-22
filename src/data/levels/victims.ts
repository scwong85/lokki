import type { LevelDef } from './types';

/**
 * Who each campaign chain is on (M105, docs/design/hooky-objectives-research.md): the person whose pride, routine or lunch the
 * joke lands on. It drives the punchline photo (M104: framed on them) and the joke-first checks. A quest maps to one role, or step
 * by step. The Warden and the pigeons are not people of the crowd, so their steps have no victim here.
 */
export const STAGE_VICTIMS: Record<string, Record<string, string | Record<string, string>>> = {
  a1s1: { map: 'tourist' }, // the breakfast rows carry their own
  'first-light-v1': { breakfast: 'selfie', map: 'tourist', neighbours: { mess: 'dockhand', lunch: 'dockhand' } },
  a1s2: { freak: 'cleaner', bottleService: 'tourist', honkchain: 'tourist' }, // the side orders (the picnic rows carry their own)
  'gull-picnic-v1': { freak: 'cleaner', bottleService: 'tourist', honkchain: 'tourist' },
  'fish-market': { freak: 'cleaner', bottleService: 'tourist', honkchain: 'tourist' },
  a1s3: {}, // the heist rows carry their own
  'strings-attached-v1': { tugchain: { soup: 'soupman', balloon: 'balloonman', bun: 'bunman' }, spray: 'rich', booschain: 'peeker', buttonchain: 'queuer' },
  a1s4: {},
  a1s5: {},
  'mood-swings-v1': { mapcone: 'mapper', wetfloor: 'inspector', jukechain: 'partygoer' },
  'the-warden-v1': { rushchain: 'queuer', strikechain: 'bowler' },
  a2s1: { peel: 'walker', hotdog: 'hotdog' },
  a2s2: { photos: 'selfie', caps: 'graduate', shutterbug: 'selfie' },
  a2s3: { bell: 'picnic', lunch: 'driver', bellsplat: 'granny' },
  a2s4: { wardrobe: 'hardhat', captainchain: 'guard' },
  a2s5: { ceremony: { photo: 'mayor', key: 'mayor', nest: 'mayor' }, shhh: { snacks: 'student', hushed: 'librarian', splat: 'librarian' }, screen: 'conductor' },
};

/** Put the victims on the stage chains (copies of the objectives, so a Playground level that shares a quest is not touched). */
export function applyVictims(levels: LevelDef[]): void {
  for (const l of levels) {
    const map = STAGE_VICTIMS[l.id];
    if (!map || !l.extraQuests) continue;
    l.extraQuests = l.extraQuests.map((q) => {
      const v = map[q.id];
      if (!v) return q;
      return { ...q, objectives: q.objectives.map((o) => ({ ...o, victim: o.victim ?? (typeof v === 'string' ? (o.kind === 'escape' ? undefined : v) : v[o.id]) })) };
    });
  }
}
