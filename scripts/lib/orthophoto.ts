/** Read the saved orthophoto tiles (data/raw/ortho, M108) as a PixelSource in local metres. Needs `jpeg-js` (dev dependency). */
import { readFileSync } from 'node:fs';
import jpeg from 'jpeg-js';
import type { PixelSource, RGB } from './roofSample.ts';

interface TileMeta { file: string; minE: number; minN: number; maxE: number; maxN: number; px: number }
interface Tile extends TileMeta { w: number; h: number; data: Uint8Array }

export function loadOrtho(origin: { E: number; N: number }): { at: PixelSource; metresPerPixel: number } {
  const meta = JSON.parse(readFileSync('data/raw/ortho/ortho.json', 'utf8')) as { metresPerPixel: number; tiles: TileMeta[] };
  const tiles: Tile[] = meta.tiles.map((t) => {
    const img = jpeg.decode(readFileSync(`data/raw/ortho/${t.file}`), { useTArray: true });
    return { ...t, w: img.width, h: img.height, data: img.data as unknown as Uint8Array };
  });
  const at: PixelSource = (x, z) => {
    const E = x + origin.E, N = origin.N - z; // north = -z
    for (const t of tiles) {
      if (E < t.minE || E >= t.maxE || N <= t.minN || N > t.maxN) continue;
      const px = Math.min(t.w - 1, Math.floor(((E - t.minE) / (t.maxE - t.minE)) * t.w));
      const py = Math.min(t.h - 1, Math.floor(((t.maxN - N) / (t.maxN - t.minN)) * t.h));
      const i = (py * t.w + px) * 4;
      return [t.data[i], t.data[i + 1], t.data[i + 2]] as RGB;
    }
    return null;
  };
  return { at, metresPerPixel: meta.metresPerPixel };
}
