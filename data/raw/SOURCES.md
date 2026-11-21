# Raw data sources

All map data comes from the **City of Helsinki open data** (Helsingin kaupunki), via its public GeoServer WFS:

    https://kartta.hel.fi/ws/geoserver/avoindata/wfs   (WFS 2.0.0, GeoJSON, EPSG:3879 / ETRS-GK25)

Licence: **CC BY 4.0** — © City of Helsinki. Attribution is shown in the in-game credits (key `C`) and in the README.

Fetched on **2026-11-12** by `scripts/fetch-data.ts` (see `fetch-meta.json` for the exact bounding box). Area: a 1.2 km square (map half-size 560 m + 40 m margin) around Kauppatori (60.167 N, 24.955 E).

| File | WFS layer (`avoindata:`) | Used for |
|---|---|---|
| `buildings.geojson` | `Rakennukset_alue_rekisteritiedot` | building footprints; height derived from `i_kerrlkm` (floor count) |
| `streets.geojson` | `YLRE_Katualue_alue` | street / square areas |
| `parks.geojson` | `YLRE_Viheralue_alue` | parks and green areas |
| `land.geojson` | `Maavesi_manner` | mainland (water = everything else); clipped to the box |
| `islands.geojson` | `Maavesi_saaret` | islands; clipped to the box |

Changes made to the WFS responses (nothing else): properties not needed were dropped, coordinates rounded to 1 cm, and the very large land polygons clipped to the fetch box. To refetch: `npm run data:fetch` (behind a proxy: `NODE_USE_ENV_PROXY=1 npm run data:fetch`); then `npm run data:build`.

## Deviations from PLAN §4.6 (decided during M3)

- The planned `kartta.hel.fi/3d/citydb-wfs/wfs` endpoint returns 404, and `3d.hel.ninja/data/citygml/` only offers a Kalasatama tile, not Kauppatori. Building heights therefore come from **registry floor counts** (floors × 3.2 m + 0.8 m) instead of CityGML LoD1 heights.
- OpenStreetMap / Overpass was unreachable from the build sandbox, and the City's own layers cover roads, parks and coastline, so **OSM is not used** (no ODbL data in the repo). Confirmed in M108: no OSM for now, the option stays open.
- Hand-placed landmarks (`data/landmarks.json`) are original stylised props: no third-party data.

## Real-city snapshot (added in M108)

Fetched on **2026-11-21** by `scripts/fetch-real.ts` (`npm run data:fetch-real`), same 1.2 km box. All City of Helsinki open data, **CC BY 4.0**, © City of Helsinki. Plan: `docs/design/realistic-city-research.md`.

| File | Source | Used for |
|---|---|---|
| `register.json` | WFS layer `avoindata:Rakennukset_alue_rekisteritiedot` (the buildings layer above), properties only: `c_julkisivu` (facade material), `c_valmpvm` (completion date), `c_rakeaine` (frame material), `c_kayttark` (use), `c_lammtapa` (heating), keyed by building `id` | era and facade material per building → style kit (`src/world/buildingStyle.ts`) |
| `ortho/r{row}c{col}.jpg` + `ortho/ortho.json` | WMS `https://kartta.hel.fi/ws/geoserver/avoindata/wms`, layer `avoindata:Ortoilmakuva_2025_5cm` (2025 orthophoto), resampled to 0.3 m/pixel, 2 × 2 tiles of 2000 px, JPEG | kept for roof colours (layer 3) and a future photo mode; not used by the game yet (about 1.9 MB) |
| `citygml/` (when fetched) | City 3D WFS `https://kartta.hel.fi/3d/citydb-wfs/wfs`, `bldg:Building` (CityGML 2.0, LoD2) | real roof shapes (layer 2). On 2026-11-21 the service answered every GetFeature with "overloaded, retry later"; `npm run data:fetch-real -- citygml` retries and keeps the pages it gets. Alternative: the map-sheet CityGML download at `https://kartta.hel.fi/3d/` |
| `mesh/` (downloaded by the project owner, 2026-11-21) | Reality mesh (photogrammetry), textured OBJ, from `https://kartta.hel.fi/3d/`: **one tile, `Tile-52-37-1-1`** (672,589 vertices, 1,339,053 faces, 2 textures: `.obj` 348 MB, `.mtl`, two JPEGs of 15 MB and 13 MB), stored with Git LFS. Coordinates are EPSG:3879 metres (E, N, height). It covers E 25497080–25497228, N 6672497–6672645 (about 148 m square), which is x −422…−274, z 35…183 in game metres: about 360 m south-west of the market origin, holding 12 of the game's 397 buildings. **It does not cover the Market Square**; the full 1.2 km box would be about 81 tiles of this size. | see `mesh/README.md`; kept for sampling wall colours (R3) and a possible photo mode |

Facade codes (Finnish building register): 1 concrete, 2 brick, 3 metal sheet, 4 stone, 5 wood, 6 glass, 7 other (rendered plaster around the market). Our box: 163 other, 104 brick, 21 stone, 19 concrete, 9 metal, 6 glass, 5 wood, 194 without a code.

## Music (added in M9)

Public-domain / CC0 recordings from Wikimedia Commons, re-encoded to Ogg Vorbis (quality 2, metadata stripped) into `public/audio/music/`. Licence labels are those shown by the Commons file pages (read via the Commons API on 2026-11-14); the originals were downloaded by the project owner. Page URLs are `https://commons.wikimedia.org/wiki/File:<original file name>`.

| Game file | Piece / recording | Original Commons file | Licence on Commons | Edits |
|---|---|---|---|---|
| `calm-hebrides.ogg` | Mendelssohn, *The Hebrides* (Fingal's Cave) Overture, Musopen Symphony Orchestra | `Mendelssohn - Hebrides Overture Fingal's Cave.ogg` | Public Domain Mark (owner-released, from Musopen) | first 4:00 only, 8 s fade-out |
| `calm-gymnopedie.ogg` | Satie, *Gymnopédie* no. 1, Robin Alciatore (via Musopen) | `Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg` | Public domain | none |
| `playful-maple-leaf-rag.ogg` | Joplin, "Maple Leaf Rag", US Air Force Band "Strolling Strings" | `Maple Leaf Rag - Strolling Strings - United States Air Force Band.mp3` | Public domain (US federal government work) | none |
| `chaos-galop-infernal.ogg` | Offenbach, "Galop infernal" (*Orpheus in the Underworld*), by Gnissah | `Jacques Offenbach - Galop Infernal from Orpheus in the Underworld (Can Can) (1858).ogg` | Public domain (own work) | none |

The compositions are all long out of copyright. Known caveat: the Joplin recording's ID3 tag lists ASCAP/BMI (publishing metadata); Commons classifies it as a US government work.

## Character model (added in M10)

`public/models/people/human.fbx`: **"Animated Human" by Quaternius**, licence **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/), downloaded 2026-11-14 from OpenGameArt (https://opengameart.org/content/animated-human-low-poly, file `Animated Human by @Quaternius_0.zip`, FBX unchanged). Clips used: Idle, Walk, Run, Jump, Working. The game does not ship the pack's skin textures: each person's clothes are a tiny band texture generated in code, following the pack's texture layout (skin, eyes, hair, shirt, trousers).
