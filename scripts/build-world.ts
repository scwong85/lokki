/**
 * Build the game world from the committed raw snapshot in data/raw/ (no network).
 *   npm run data:build   ->  data/generated/kauppatori.json
 * Stylises the data: local metres (north = -Z), simplified footprints, heights from floor counts, pastel colour index.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import proj4 from 'proj4';
import {
  EPSG_3879, extendBoundary, hashId, heightFromFloors, openRing, ringCentroid, round, signedArea, simplifyRing, toLocal,
  pointInRings, type Bounds, type Pt, type Ring,
} from './lib/geo.ts';
import { FETCH_MARGIN, MAP_HALF, ORIGIN_LONLAT } from './lib/config.ts';
import { eraCode, eraOf, facadeCode, facadeOf, yearOf } from '../src/world/buildingStyle.ts';
import { existsSync } from 'node:fs';

interface Feature {
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}
const readLayer = (name: string): Feature[] => JSON.parse(readFileSync(`data/raw/${name}.geojson`, 'utf8')).features;

const [E, N] = proj4('EPSG:4326', EPSG_3879, [ORIGIN_LONLAT.lon, ORIGIN_LONLAT.lat]);
const origin = { E, N };
const H = MAP_HALF;
const inMap = (p: Pt, m = 0) => Math.abs(p[0]) <= H + m && Math.abs(p[1]) <= H + m;
const clipBounds: Bounds = { minX: -(H + FETCH_MARGIN), maxX: H + FETCH_MARGIN, minZ: -(H + FETCH_MARGIN), maxZ: H + FETCH_MARGIN };

function polygons(f: Feature): number[][][][] {
  return (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
}
const flat = (r: Ring): number[] => r.flatMap(([x, z]) => [round(x, 1), round(z, 1)]);

/** Convert a raw polygon (outer + holes, EPSG:3879) to local, simplified rings. */
function localRings(poly: number[][][], tol: number): Ring[] {
  const rings: Ring[] = [];
  for (const raw of poly) {
    let r: Ring = openRing(raw.map(([x, y]) => toLocal(x, y, origin)));
    r = simplifyRing(r, tol);
    if (r.length >= 3 && Math.abs(signedArea(r)) > 0.5) rings.push(r);
    else if (rings.length === 0) return [];
  }
  return rings;
}

// ---- buildings ----
const PASTELS = 4; // cream, peach, mint, lilac (palette indices resolved at runtime)
// the register's facade material and completion year (M108, data/raw/register.json from `npm run data:fetch-real`): era and facade codes
const register: Record<string, { facade?: string; built?: string }> = existsSync('data/raw/register.json') ? JSON.parse(readFileSync('data/raw/register.json', 'utf8')).buildings : {};
const buildings = [];
for (const f of readLayer('buildings')) {
  for (const poly of polygons(f)) {
    const rings = localRings(poly, 0.25);
    if (!rings.length) continue;
    if (!inMap(ringCentroid(rings[0]))) continue;
    if (Math.abs(signedArea(rings[0])) < 8) continue; // sheds and kiosks
    const p = f.properties;
    const reg = register[String(p.id)];
    const e = reg ? eraCode(eraOf(yearOf(reg.built))) : 0;
    const fc = reg ? facadeCode(facadeOf(reg.facade)) : 0;
    buildings.push({
      id: p.id as number,
      h: heightFromFloors(p.floors as number | null),
      c: hashId(p.id as number) % PASTELS,
      ...(e ? { e } : {}),
      ...(fc ? { f: fc } : {}),
      rings: rings.map(flat),
    });
  }
}

// ---- ground layers ----
function groundPolys(name: string, tol: number, extend = 0) {
  const out = [];
  for (const f of readLayer(name)) {
    for (const poly of polygons(f)) {
      let rings = localRings(poly, tol);
      if (!rings.length) continue;
      if (!inMap(ringCentroid(rings[0]), FETCH_MARGIN)) continue;
      if (extend) rings = rings.map((r) => extendBoundary(r, clipBounds, extend));
      out.push({ rings: rings.map(flat), name: (f.properties.name as string | undefined) ?? undefined });
    }
  }
  return out;
}
const land = [...groundPolys('land', 1, 700), ...groundPolys('islands', 0.5, 700)];
const streets = groundPolys('streets', 0.3);
const parks = groundPolys('parks', 0.3);

// ---- landmarks (hand-authored: lon/lat or local metres) ----
const landmarkSrc = JSON.parse(readFileSync('data/landmarks.json', 'utf8')) as {
  landmarks: { id: string; type: string; lon?: number; lat?: number; x?: number; z?: number; height?: number; [k: string]: unknown }[];
};
const landmarks = landmarkSrc.landmarks.map(({ lon, lat, ...rest }) => {
  if (lon !== undefined && lat !== undefined) {
    const [e, n] = proj4('EPSG:4326', EPSG_3879, [lon, lat]);
    const [x, z] = toLocal(e, n, origin);
    return { ...rest, x, z };
  }
  return rest as typeof rest & { x: number; z: number };
});

// A `restyle` landmark dresses up the registry building under it (or the nearest one within 30 m):
// brick market hall, City Hall, Uspenski Cathedral. The runtime adds the matching details.
for (const l of landmarks) {
  if (l.type !== 'restyle') continue;
  let b = buildings.find((bd) => pointInRings(bd.rings, l.x, l.z));
  if (!b) {
    let best = 30;
    for (const bd of buildings) {
      const r = bd.rings[0];
      let cx = 0, cz = 0;
      for (let i = 0; i < r.length; i += 2) {
        cx += r[i];
        cz += r[i + 1];
      }
      const d = Math.hypot(cx / (r.length / 2) - l.x, cz / (r.length / 2) - l.z);
      if (d < best) {
        best = d;
        b = bd;
      }
    }
  }
  if (b) {
    (b as { style?: unknown }).style = (l as { style?: string }).style;
    if (l.height) b.h = l.height as number;
  } else console.warn(`landmark ${l.id}: no building near it`);
}

// A landmark with a `height` re-extrudes the building under it (e.g. the cathedral body) in white.
for (const l of landmarks) {
  if (!l.height || l.type === 'restyle') continue;
  const b = buildings.find((bd) => pointInRings(bd.rings, l.x, l.z));
  if (b) {
    b.h = l.height;
    b.c = 4;
  } else console.warn(`landmark ${l.id}: no building under it`);
}

mkdirSync('data/generated', { recursive: true });
const out = { version: 1, origin: { ...ORIGIN_LONLAT, ...origin }, half: H, buildings, land, streets, parks, landmarks };
writeFileSync('data/generated/kauppatori.json', JSON.stringify(out));
console.log(`buildings ${buildings.length}, land ${land.length}, streets ${streets.length}, parks ${parks.length}, landmarks ${landmarks.length}`);
console.log(`generated ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
