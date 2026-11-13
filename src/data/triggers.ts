import type { TriggerDef } from '../gameplay/triggers';
import { BUN_CHECKPOINTS, FERRY_ROOF, FUNNEL_ZONE } from './places';

/** World triggers that feed the quests (see gameplay/triggers.ts). */
export const TRIGGERS: TriggerDef[] = [
  // cap heist: the statue's cap lies on the ferry roof
  { id: 'capDelivered', kind: 'propInZone', event: 'capDelivered', tag: 'statueCap', zone: FERRY_ROOF },
  // map sabotage: the tourist's map floats in the harbour
  { id: 'mapInSea', kind: 'propInZone', event: 'mapInSea', propType: 'map', zone: 'sea' },
  // finale: land on the ferry funnel to ring the horn
  { id: 'finaleStart', kind: 'gullInZone', event: 'finaleStart', zone: FUNNEL_ZONE, grounded: true },
  // bun ring: a bun past each of the three vendors, in order
  { id: 'bunRing', kind: 'carryCheckpoints', propType: 'bun', points: BUN_CHECKPOINTS, events: ['bun1', 'bun2', 'bun3'], maxY: 5 },
];
