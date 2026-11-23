/**
 * Who looks like a woman and who like a man (M119: the one person model made everyone look male, Granny included). A spawn can say so
 * (`look`), the roles the text calls "she" are women, the crowd (tourists, queues, passengers, strollers) is a seeded mix, and the rest
 * (vendors, the Warden, the dockhand, the captain ...) follow their role's text.
 */
export type Look = 'f' | 'm';

/** Roles the levels write as "she". */
export const FEMALE_ROLES = new Set(['granny', 'baker', 'selfie', 'bride', 'blogger', 'librarian', 'florist', 'berryW', 'sunbather', 'photographer']);
/** Roles that are just somebody in the crowd: a seeded mix. */
export const CROWD_ROLES = new Set(['tourist', 'queuer', 'partygoer', 'passenger', 'customer', 'lunch', 'walker', 'bystander', 'peeker', 'dancer', 'picnic', 'guest', 'student', 'graduate', 'bored', 'tour', 'swimmer', 'stroller', 'bowler']);

/** Roles drawn as older people: grey hair, a bun. */
export const OLD_ROLES = new Set(['granny']);

const hash = (seed: number): number => {
  let x = (seed * 2654435761 + 97) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  return (x ^ (x >>> 13)) >>> 0;
};

export function lookFor(sp: { look?: Look; role?: string }, seed: number): Look {
  if (sp.look) return sp.look;
  if (sp.role && FEMALE_ROLES.has(sp.role)) return 'f';
  if (!sp.role || CROWD_ROLES.has(sp.role)) return hash(seed) % 100 < 48 ? 'f' : 'm';
  return 'm';
}
