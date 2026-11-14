export type TutorialEvent = 'move' | 'hop' | 'flap' | 'dive' | 'grab' | 'poop';

export interface TutorialStep {
  /** Done when this happens. */
  on: TutorialEvent;
  text: string;
  /** Small second line / keys. */
  keys: string;
}

/** The first-flight tips: one at a time, each ticks off when you do it. */
export const TUTORIAL: TutorialStep[] = [
  { on: 'move', text: 'Waddle around, you magnificent bird', keys: 'W A S D' },
  { on: 'flap', text: 'Take off: tap or hold Space to flap', keys: 'Space' },
  { on: 'dive', text: 'Hold Shift to dive (mouse aims it), let go to swoop up', keys: 'Shift' },
  { on: 'grab', text: 'Grab something with your beak', keys: 'E' },
  { on: 'poop', text: 'Drop a little message from above', keys: 'F' },
];
