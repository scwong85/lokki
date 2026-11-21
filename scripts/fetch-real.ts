/**
 * Fetch the "real city" snapshot (M108, docs/design/realistic-city-research.md) for the Kauppatori box into data/raw/.
 * All City of Helsinki open data, CC BY 4.0. Run once (needs network):
 *   npm run data:fetch-real                 (everything)
 *   npm run data:fetch-real -- register     (just one part: register | ortho | citygml)
 * Behind a proxy: NODE_USE_ENV_PROXY=1 npm run data:fetch-real
 *
 *  register  data/raw/register.json        per building id: facade material, completion date, frame material, use (the
 *                                           register layer we already use for footprints; these fields were dropped before)
 *  ortho     data/raw/ortho/r{row}c{col}.jpg  the 2025 orthophoto of the box, 2 x 2 tiles at 0.3 m per pixel (+ ortho.json)
 *  citygml   data/raw/citygml/page-*.gml   LoD2 buildings (real roof shapes) from the City's 3D WFS, paged; it is often
 *                                           "overloaded": the script retries, and keeps the pages it got
 *
 * The photogrammetric reality mesh is not fetched here (a manual download, see data/raw/mesh/README.md).
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import proj4 from 'proj4';
import { EPSG_3879 } from './lib/geo.ts';
import { FETCH_MARGIN, MAP_HALF, ORIGIN_LONLAT, WFS } from './lib/config.ts';

const [E0, N0] = proj4('EPSG:4326', EPSG_3879, [ORIGIN_LONLAT.lon, ORIGIN_LONLAT.lat]);
const h = MAP_HALF + FETCH_MARGIN;
const box = { minE: E0 - h, minN: N0 - h, maxE: E0 + h, maxN: N0 + h };
const parts = new Set(process.argv.slice(2).filter((a) => !a.startsWith('-')));
const want = (p: string) => parts.size === 0 || parts.has(p);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync('data/raw', { recursive: true });

/** Register fields kept, output name -> source field (codes as in the Finnish building register; see SOURCES.md). */
export const REGISTER_FIELDS = { facade: 'c_julkisivu', built: 'c_valmpvm', frame: 'c_rakeaine', use: 'c_kayttark', heating: 'c_lammtapa' } as const;

if (want('register')) {
  console.log('register: fetching facade material, completion date ...');
  const props = ['id', ...Object.values(REGISTER_FIELDS)].join(',');
  const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=avoindata:Rakennukset_alue_rekisteritiedot&outputFormat=application/json&propertyName=${props}&bbox=${box.minE},${box.minN},${box.maxE},${box.maxN},EPSG:3879`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`register: HTTP ${res.status}`);
  const json = (await res.json()) as { features: { properties: Record<string, unknown> }[] };
  const out: Record<string, Record<string, unknown>> = {};
  for (const f of json.features) {
    const p = f.properties;
    const row: Record<string, unknown> = {};
    for (const [k, src] of Object.entries(REGISTER_FIELDS)) if (p[src] !== null && p[src] !== undefined) row[k] = p[src];
    out[String(p.id)] = row;
  }
  writeFileSync('data/raw/register.json', JSON.stringify({ fetchedAt: new Date().toISOString(), layer: 'Rakennukset_alue_rekisteritiedot', fields: REGISTER_FIELDS, buildings: out }));
  console.log(`  ${Object.keys(out).length} buildings`);
}

if (want('ortho')) {
  const layer = 'avoindata:Ortoilmakuva_2025_5cm';
  const m = 0.3; // metres per pixel
  const n = 2; // tiles per side
  const size = (2 * h) / n; // metres per tile
  const px = Math.round(size / m);
  mkdirSync('data/raw/ortho', { recursive: true });
  const tiles = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    // row 0 is the north edge
    const minE = box.minE + c * size, maxE = minE + size, maxN = box.maxN - r * size, minN = maxN - size;
    const url = `https://kartta.hel.fi/ws/geoserver/avoindata/wms?service=WMS&version=1.3.0&request=GetMap&layers=${layer}&styles=&crs=EPSG:3879&bbox=${minN},${minE},${maxN},${maxE}&width=${px}&height=${px}&format=image/jpeg`;
    console.log(`ortho: tile r${r}c${c} (${px} px) ...`);
    const res = await fetch(url);
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`ortho r${r}c${c}: HTTP ${res.status} ${type} ${type.includes('xml') ? (await res.text()).slice(0, 300) : ''}`);
    writeFileSync(`data/raw/ortho/r${r}c${c}.jpg`, Buffer.from(await res.arrayBuffer()));
    tiles.push({ file: `r${r}c${c}.jpg`, minE, minN, maxE, maxN, px });
  }
  writeFileSync('data/raw/ortho/ortho.json', JSON.stringify({ fetchedAt: new Date().toISOString(), layer, crs: 'EPSG:3879', metresPerPixel: m, tiles }, null, 2));
}

if (want('citygml')) {
  // the City's 3D WFS (CityGML 2.0, LoD2 roofs); paged with count/startIndex, each page retried with a growing pause
  const base = 'https://kartta.hel.fi/3d/citydb-wfs/wfs';
  const page = 40;
  mkdirSync('data/raw/citygml', { recursive: true });
  const have = new Set(readdirSync('data/raw/citygml').filter((f) => f.endsWith('.gml')));
  let got = 0;
  for (let i = 0; i < 100; i++) {
    const file = `page-${String(i).padStart(3, '0')}.gml`;
    if (have.has(file)) {
      got++;
      continue;
    }
    const url = `${base}?service=WFS&version=2.0.0&request=GetFeature&typeNames=bldg:Building&count=${page}&startIndex=${i * page}&bbox=${box.minE},${box.minN},${box.maxE},${box.maxN},urn:ogc:def:crs:EPSG::3879`;
    let text = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(url).catch(() => null);
      text = res ? await res.text() : '';
      if (res?.ok && !text.includes('ExceptionReport')) break;
      console.log(`citygml page ${i}: ${res?.status ?? 'no answer'}${text.includes('overloaded') ? ' (overloaded)' : ''}, retrying`);
      text = '';
      await sleep(5000 * 2 ** attempt);
    }
    if (!text) {
      console.log(`citygml: page ${i} could not be fetched; ${got} pages kept. Run again later (pages already saved are skipped).`);
      break;
    }
    const n = (text.match(/<bldg:Building\b/g) ?? []).length;
    if (n === 0) {
      console.log(`citygml: done, ${got} pages`);
      break;
    }
    writeFileSync(`data/raw/citygml/${file}`, text);
    got++;
    console.log(`citygml: page ${i}, ${n} buildings`);
    if (n < page) break;
  }
  writeFileSync('data/raw/citygml/citygml.json', JSON.stringify({ fetchedAt: new Date().toISOString(), service: base, typeName: 'bldg:Building', pages: got, complete: existsSync(`data/raw/citygml/page-${String(got).padStart(3, '0')}.gml`) ? false : undefined }, null, 2));
}
console.log('done');
