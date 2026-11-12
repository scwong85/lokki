/**
 * Fetch raw map data for the Kauppatori area from the City of Helsinki open data WFS and store a snapshot in data/raw/.
 * Run once (needs network):  npm run data:fetch      (behind a proxy: NODE_USE_ENV_PROXY=1 npm run data:fetch)
 * The rest of the pipeline works from the committed snapshot alone.
 *
 * Snapshot = WFS GeoJSON responses (EPSG:3879) with unneeded properties dropped, coordinates rounded to 1 cm and the
 * huge land polygons clipped to the map box. Nothing else is changed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import proj4 from 'proj4';
import { EPSG_3879, clipRing, openRing, round, type Ring } from './lib/geo.ts';
import { FETCH_MARGIN, LAYERS, MAP_HALF, ORIGIN_LONLAT, WFS, type LayerName } from './lib/config.ts';

const [E0, N0] = proj4('EPSG:4326', EPSG_3879, [ORIGIN_LONLAT.lon, ORIGIN_LONLAT.lat]);
const h = MAP_HALF + FETCH_MARGIN;
const box = { minX: E0 - h, minZ: N0 - h, maxX: E0 + h, maxZ: N0 + h }; // here "Z" = northing
const bbox = `${box.minX},${box.minZ},${box.maxX},${box.maxZ},EPSG:3879`;

interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

mkdirSync('data/raw', { recursive: true });
const meta: Record<string, unknown> = {};

for (const [name, cfg] of Object.entries(LAYERS) as [LayerName, (typeof LAYERS)[LayerName]][]) {
  const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=avoindata:${cfg.type}&outputFormat=application/json&bbox=${bbox}`;
  console.log(`fetching ${name} (${cfg.type}) ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const json = (await res.json()) as { features: Feature[] };

  const features: Feature[] = [];
  for (const f of json.features) {
    const props: Record<string, unknown> = {};
    for (const [out, src] of Object.entries(cfg.keep)) props[out] = f.properties[src];
    const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
    const outPolys: number[][][][] = [];
    for (const poly of polys) {
      const rings: number[][][] = [];
      for (const [i, ring] of poly.entries()) {
        let r: Ring = openRing(ring.map(([x, y]) => [x, y] as [number, number]));
        if (cfg.clip) r = clipRing(r, box);
        if (r.length < 3) {
          if (i === 0) break; // outer ring gone: drop polygon
          continue;
        }
        rings.push([...r, r[0]].map(([x, y]) => [round(x, 2), round(y, 2)]));
      }
      if (rings.length) outPolys.push(rings);
    }
    if (!outPolys.length) continue;
    features.push({
      type: 'Feature',
      properties: props,
      geometry: outPolys.length === 1 ? { type: 'Polygon', coordinates: outPolys[0] } : { type: 'MultiPolygon', coordinates: outPolys },
    });
  }
  writeFileSync(`data/raw/${name}.geojson`, JSON.stringify({ type: 'FeatureCollection', crs: 'EPSG:3879', features }));
  meta[name] = { layer: cfg.type, features: features.length };
  console.log(`  ${features.length} features`);
}

writeFileSync(
  'data/raw/fetch-meta.json',
  JSON.stringify({ fetchedAt: new Date().toISOString(), origin: { ...ORIGIN_LONLAT, E: E0, N: N0 }, half: MAP_HALF, margin: FETCH_MARGIN, bbox, layers: meta }, null, 2),
);
console.log('done');
