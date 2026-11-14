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

## Music (added in M9)

Public-domain / CC0 recordings from Wikimedia Commons, re-encoded to Ogg Vorbis (quality 2, metadata stripped) into `public/audio/music/`. Licence labels are those shown by the Commons file pages (read via the Commons API on 2026-11-14); the originals were downloaded by the project owner. Page URLs are `https://commons.wikimedia.org/wiki/File:<original file name>`.

| Game file | Piece / recording | Original Commons file | Licence on Commons | Edits |
|---|---|---|---|---|
| `calm-hebrides.ogg` | Mendelssohn, *The Hebrides* (Fingal's Cave) Overture, Musopen Symphony Orchestra | `Mendelssohn - Hebrides Overture Fingal's Cave.ogg` | Public Domain Mark (owner-released, from Musopen) | first 4:00 only, 8 s fade-out |
| `calm-gymnopedie.ogg` | Satie, *Gymnopédie* no. 1, Robin Alciatore (via Musopen) | `Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg` | Public domain | none |
| `playful-maple-leaf-rag.ogg` | Joplin, "Maple Leaf Rag", US Air Force Band "Strolling Strings" | `Maple Leaf Rag - Strolling Strings - United States Air Force Band.mp3` | Public domain (US federal government work) | none |
| `chaos-galop-infernal.ogg` | Offenbach, "Galop infernal" (*Orpheus in the Underworld*), by Gnissah | `Jacques Offenbach - Galop Infernal from Orpheus in the Underworld (Can Can) (1858).ogg` | Public domain (own work) | none |

The compositions are all long out of copyright. Known caveat: the Joplin recording's ID3 tag lists ASCAP/BMI (publishing metadata); Commons classifies it as a US government work.

## Character models (added in M10)

`public/models/people/*.glb` and `public/models/people/Textures/colormap.png`: **Kenney "Mini Characters" 2.0** (www.kenney.nl), licence **CC0** (http://creativecommons.org/publicdomain/zero/1.0/), downloaded 2026-11-14 from https://kenney.nl/assets/mini-characters-1. Files used unchanged (GLB format): character-male-a…g, character-female-a…f, character-worker. Rigged, with idle/walk/sprint/pick-up/emote/etc. animations.
