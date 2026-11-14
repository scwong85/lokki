export type TutorialEvent = 'move' | 'hop' | 'flap' | 'dive' | 'grab' | 'poop';

export interface TutorialStep {
  /** Done when this happens. */
  on: TutorialEvent;
  text: string;
  /** Small second line / keys. */
  keys: string;
  /** The same tip for the on-screen controls. */
  touch: { text: string; keys: string };
}

/** The first-flight tips: one at a time, each ticks off when you do it. */
export const TUTORIAL: TutorialStep[] = [
  { on: 'move', text: 'Waddle around, you magnificent bird', keys: 'W A S D', touch: { text: 'Waddle around, you magnificent bird', keys: 'left thumb: drag' } },
  { on: 'flap', text: 'Take off: tap or hold Space to flap', keys: 'Space', touch: { text: 'Take off: tap or hold FLAP', keys: 'FLAP' } },
  { on: 'dive', text: 'Hold Shift to dive (mouse aims it), let go to swoop up', keys: 'Shift', touch: { text: 'Hold DIVE (slide up/down to aim), let go to swoop up', keys: 'DIVE' } },
  { on: 'grab', text: 'Grab something with your beak', keys: 'E', touch: { text: 'Grab something with your beak', keys: 'GRAB' } },
  { on: 'poop', text: 'Drop a little message from above', keys: 'F', touch: { text: 'Drop a little message from above', keys: 'POOP' } },
];
