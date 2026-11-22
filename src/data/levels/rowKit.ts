import type { QuestDef } from '../quests';
import type { PropSpawn } from '../../gameplay/props';
import { BLANKET, GONG_QUEST, HALL_AT, PICNIC } from './picnic';

/**
 * Pieces the ten-minute stages share (docs/design/act1-v2.md): a row of the collection, the trigger that serves it onto the roof, the hall and
 * blanket decor, and the gong that ends the collection. Stage 1.2 and 1.1 predate this and have their own copies.
 */
export const at = (x: number, z: number) => ({ x, z });
export const GONG = { x: PICNIC.x + 4.4, z: PICNIC.z - 2.4 };
export { PICNIC, BLANKET, HALL_AT };

export const row = (id: string, item: string, owner: string, place: { x: number; z: number }, text: string, course: number, tag: string, o: Omit<QuestDef['objectives'][number], 'id' | 'kind' | 'event' | 'row'>) => ({
  id,
  kind: 'event' as const,
  event: `picnic:${id}`,
  row: { reveal: { ...place, r: 8, text }, item, owner, course, tag },
  ...o,
});

export const served = (id: string, propType: PropSpawn['type'], tag: string) => ({ id: `served:${id}`, kind: 'propInZone' as const, event: `picnic:${id}`, propType, tag, zone: BLANKET });

export const homeDecor = [
  { kind: 'hall' as const, x: HALL_AT.x, z: HALL_AT.z },
  { kind: 'blanket' as const, x: PICNIC.x, z: PICNIC.z, y: PICNIC.y },
];

export const gongSwitch = (label: string) => ({ id: 'gong', x: GONG.x, z: GONG.z, y: PICNIC.y, label, effect: 'summon' as const, free: true, cooldown: 3 });

/** The gong that ends a collection stage once its rows are on the blanket. */
export const gongQuest = (title: string, lockedText: string, outcome: string): QuestDef => ({
  ...GONG_QUEST,
  title,
  lockedText,
  requires: ['picnic'],
  objectives: GONG_QUEST.objectives.map((o) => ({ ...o, outcome, markers: [{ ...GONG, r: 1.6, y: PICNIC.y, label: 'Gong' }] })),
});

/** A crowd stepping off the ferry when a course is served: a new wave of people in the square. */
export const crowd = (n: number, at0: { x: number; z: number }, colours = [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8, 0xc7b5e0, 0xf2a35e]) =>
  Array.from({ length: n }, (_, i) => ({ x: at0.x + (i - n / 2) * 1.3, z: at0.z, heading: 0, role: 'passenger', wander: 30, color: colours[i % colours.length] }));
