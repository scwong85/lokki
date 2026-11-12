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
- OpenStreetMap / Overpass was unreachable from the build sandbox, and the City's own layers cover roads, parks and coastline, so **OSM is not used** (no ODbL data in the repo).
- Hand-placed landmarks (`data/landmarks.json`) are original stylised props: no third-party data.
