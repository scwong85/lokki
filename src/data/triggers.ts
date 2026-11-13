import type { TriggerDef } from '../gameplay/triggers';
import { BUN_CHECKPOINTS, FERRY_CABIN_ROOFS, FERRY_DECK } from './places';

/** World triggers that feed the quests (see gameplay/triggers.ts). */
export const TRIGGERS: TriggerDef[] = [
  // cap heist: the statue's cap lies anywhere on the ferry
  { id: 'capDelivered', kind: 'propInZone', event: 'capDelivered', tag: 'statueCap', zone: FERRY_DECK },
  // map sabotage: the tourist's map floats in the harbour
  { id: 'mapInSea', kind: 'propInZone', event: 'mapInSea', propType: 'map', zone: 'sea' },
  // finale: land on the ferry's cabin roof to ring the horn
  { id: 'finaleStart', kind: 'gullInZone', event: 'finaleStart', zone: FERRY_CABIN_ROOFS, grounded: true },
  // bun ring: a bun past each of the three vendors, in order
  { id: 'bunRing', kind: 'carryCheckpoints', propType: 'bun', points: BUN_CHECKPOINTS, events: ['bun1', 'bun2', 'bun3'], maxY: 5 },
];
