export type MusicTier = 'calm' | 'playful' | 'chaos';

/** Public-domain / CC0 recordings (credits in README and data/raw/SOURCES.md). Files live in public/audio/music/. */
export const MUSIC: Record<MusicTier, { file: string; title: string }[]> = {
  calm: [
    { file: 'calm-hebrides.ogg', title: 'Mendelssohn: The Hebrides' },
    { file: 'calm-gymnopedie.ogg', title: 'Satie: Gymnopédie no. 1' },
  ],
  playful: [{ file: 'playful-maple-leaf-rag.ogg', title: 'Joplin: Maple Leaf Rag' }],
  chaos: [{ file: 'chaos-galop-infernal.ogg', title: 'Offenbach: Galop infernal' }],
};
