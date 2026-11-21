/**
 * Debug picture for the roof colours (M110): every building footprint filled with its sampled median colour, 1 pixel per metre, on the
 * photo (darkened) so that a misaligned footprint shows at once. Writes tmp PNGs; not part of the build.
 *   node scripts/debug-roofs.ts <out-dir>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import proj4 from 'proj4';
import { EPSG_3879, pointInRings } from './lib/geo.ts';
import { MAP_HALF, ORIGIN_LONLAT } from './lib/config.ts';
import { loadOrtho } from './lib/orthophoto.ts';
import { medianColour, roofPixels, type RGB } from './lib/roofSample.ts';

const out = process.argv[2] ?? '/tmp/roofs';
mkdirSync(out, { recursive: true });
const [E, N] = proj4('EPSG:4326', EPSG_3879, [ORIGIN_LONLAT.lon, ORIGIN_LONLAT.lat]);
const { at } = loadOrtho({ E, N });
const city = JSON.parse(readFileSync('data/generated/kauppatori.json', 'utf8')) as { buildings: { id: number; rings: number[][] }[] };

function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const S = 2 * MAP_HALF; // 1120 px, 1 px per metre
const bg = new Uint8Array(S * S * 3), fg = new Uint8Array(S * S * 3);
for (let py = 0; py < S; py++) {
  for (let px = 0; px < S; px++) {
    const c = at(px - MAP_HALF + 0.5, py - MAP_HALF + 0.5) ?? [0, 0, 0];
    const i = (py * S + px) * 3;
    bg[i] = fg[i] = c[0] >> 1;
    bg[i + 1] = fg[i + 1] = c[1] >> 1;
    bg[i + 2] = fg[i + 2] = c[2] >> 1;
  }
}
const medians = new Map<number, RGB>();
for (const b of city.buildings) {
  const m = medianColour(roofPixels(b.rings, at));
  if (!m) continue;
  medians.set(b.id, m);
  const o = b.rings[0];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); }
  for (let px = Math.max(0, Math.floor(x0 + MAP_HALF)); px < Math.min(S, Math.ceil(x1 + MAP_HALF)); px++) {
    for (let pz = Math.max(0, Math.floor(z0 + MAP_HALF)); pz < Math.min(S, Math.ceil(z1 + MAP_HALF)); pz++) {
      if (!pointInRings(b.rings, px - MAP_HALF + 0.5, pz - MAP_HALF + 0.5)) continue;
      const i = (pz * S + px) * 3;
      fg[i] = m[0]; fg[i + 1] = m[1]; fg[i + 2] = m[2];
    }
  }
}
writeFileSync(`${out}/photo.png`, png(S, S, bg));
writeFileSync(`${out}/medians.png`, png(S, S, fg));
writeFileSync(`${out}/medians.json`, JSON.stringify([...medians].map(([id, c]) => ({ id, c }))));
console.log(`${medians.size} of ${city.buildings.length} buildings sampled`);
