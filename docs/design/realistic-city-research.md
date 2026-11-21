# A more realistic Helsinki: what real-world data can rebuild

Status: **R1 built in M108, roof colours (part of R3) in M110** (`docs/milestones/M108.md`); the data snapshot for R2 to R4 is saved or scripted. Decisions (2026-11-21): **keep the pastel look for now, keep a photorealistic mode possible later** (so the source data goes into the repo); **the user downloads the reality mesh**; **no OpenStreetMap for now**, option kept open. Question: now that we use open map data, can we generate buildings and their exteriors that match the real Kauppatori, for example from Google Earth or street-level photos?

## Short answer

**Yes, from Helsinki's own open data. Not from Google.**

- **Google is out.** Google's Photorealistic 3D Tiles (what Google Earth shows) and Street View may not be cached, extracted or used offline. That rules them out for a static, offline game, both legally and under PLAN §4.3.
- **Helsinki publishes almost everything we would want, under CC BY 4.0** (the licence we already credit):
  - roof-shape building models (CityGML LoD2, some with photo textures);
  - a city-wide textured photogrammetry mesh (a "reality mesh", the same kind of thing Google Earth shows);
  - aerial photos;
  - a building register with **facade material and year of completion** for every building.
- **The game should take the real shape and keep its own look.** A photoreal mesh would clash with the pastel low-poly style (PLAN §4.5) and blow the draw-call budget. The better route is to measure the real city (roof shapes, heights, facade material, age, colours, window rows) and feed those numbers into our procedural builders. The Market Square would then be recognisable building by building, and still pastel.

## 1. What we use today

Our data comes from `data/raw/SOURCES.md`, fetched in M3:
- footprints and **floor counts** from the City's building register (`Rakennukset_alue_rekisteritiedot`);
- streets, parks and coastline from City layers.

On top of that the procedural builders add:
- building height (floors × 3.2 m), mansard and pitched roofs **by rule**;
- window grids, ground floors, awnings, balconies and turrets **by rule**;
- facade colours from a seeded palette.

So every building has the right footprint and height, but its roof, colour, style and windows are invented.

In M3 two sources failed: the CityGML 3D service returned 404, and Overpass (OpenStreetMap) was unreachable.

## 2. Sources checked (November 2026)

| Source | What it gives | Licence / terms | Usable for Lokki? | Checked from here |
|---|---|---|---|---|
| **Helsinki building register** (`Rakennukset_alue_rekisteritiedot`, the layer we already use) | Per building: floors, **facade material** (`c_julkisivu`), **completion date** (`c_valmpvm`), structural material, use, flats and shops, address | CC BY 4.0 | **Yes, today.** We fetch the layer but drop these fields. | The layer answers. Of our 521 buildings, 327 have a facade code and 395 have a date, mostly 1860s to 1930s. |
| **Helsinki 3D city model, CityGML LoD2** (WFS `kartta.hel.fi/3d/citydb-wfs/wfs`, and map-sheet downloads at `kartta.hel.fi/3d`) | Real roof shapes (gable, hip, mansard, flat, domes as polygons), wall and roof surfaces, real heights; a **textured** LoD2 variant | CC BY 4.0 (the 3D models dataset page) | **Yes**, and it replaces our roof rules with the real roofs. | The WFS is **back up** (GetCapabilities OK, feature type `bldg:Building`). GetFeature replied "overloaded, retry later" twice, so not fetched yet. The file listing `3d.hel.ninja/data/citygml/` still only has Kalasatama. |
| **Helsinki reality mesh** (city-wide photogrammetric mesh from 2015, textured, OBJ, chosen by area at `kartta.hel.fi/3d`; Kalasatama 2017 also in 3D Tiles / FBX / DAE) | What Google Earth shows: real facades and roofs as a photo-textured mesh | CC BY 4.0 | **As a measuring source, at build time only** (colours, heights, eaves lines, dome outlines). Not shipped: too heavy, wrong look. | Not downloaded. It is a large manual download per area. |
| **Helsinki orthophotos** (aerial images, WMS on `kartta.hel.fi`) | Top-down photos: roof colours, pavement, trees, kiosks, parked boats | CC BY 4.0 (Helsinki map data) | **Yes, at build time:** sample one roof colour per building, plus tree and kiosk positions | Not fetched |
| **OpenStreetMap** (Overpass) | `building:colour`, `roof:colour`, `roof:shape`, `building:levels`, `building:material`, shop names, benches, lamps, trees, bollards | ODbL (attribution, share-alike on the database) | **Partly:** tags are patchy and ODbL adds obligations. Use it only to fill gaps, or not at all. | Overpass still unreachable from this sandbox |
| **Mapillary** (street-level photos) | Ground-level facade photos | Images CC BY-SA 4.0; deriving data is only specially allowed for contributions to OSM | **Reference only** (looking at photos while modelling landmarks). Extracted textures would be share-alike. | Not fetched |
| **Google Photorealistic 3D Tiles / Google Earth / Street View** | The best-looking mesh and photos | Map Tiles API policy: no unauthorised caching, data extraction or offline use; the Maps Platform terms forbid bulk download outside the service | **No.** It needs an API key at runtime, cannot be stored, and cannot be turned into game assets. Breaks PLAN §4.3 and §4.8. | n/a |
| **Research: facade parsing from photos** (window detection with Mask R-CNN, inverse procedural facades, LoD3 reconstruction) | Window positions, sizes and types from images | Papers; some code (for example an LoD3 model repo from ISPRS 2025) | **Not worth it here.** The reality mesh and simple rules get us most of the way, and the photos it would need have the licence problems above. | n/a |

The register's facade codes, from the Finnish building register code list (to confirm against the City's field documentation before building):
- 1 concrete
- 2 brick
- 3 metal sheet
- 4 stone
- 5 wood
- 6 glass
- 7 other (around Kauppatori almost always rendered plaster)

In our area there are 163 "other", 104 brick, 21 stone, 19 concrete and 9 metal, plus a few glass and wood. 194 buildings have no code.

## 3. What "real" can mean in a pastel low-poly game

The test is to recognise the Market Square **from the air, at a glance**: the right skyline, the right roofs, the right colour families, the landmarks in the right places. Real photo textures are not the goal. Three layers, from cheapest to richest:

1. **Real shape:** LoD2 roofs and heights replace our roof rules. City Hall's flat top, the Presidential Palace's hipped roof, the Old Market Hall's long pitched roof, and the domes and onion towers come out right.
2. **Real character:** facade material plus completion date pick a **style kit** per building:

| Era | Style | Kit |
|---|---|---|
| before 1870 | Empire | pale yellow render, pilasters, tall regular windows, low hipped roof |
| 1880s–1890s | Neo-Renaissance | cornices, window pediments |
| 1900s–1910s | Jugend (Art Nouveau) | stone base, arched windows, towers |
| 1920s | Nordic classicism | |
| 1930s onwards | Functionalism | strip windows, flat roof |
| 1950s onwards | Modernism | |

   Facade material picks the surface (render, brick, stone, concrete, glass) and so the colour family. This extends our M29/M34 procedural facades (district palettes, ground floors, balconies, turrets) rather than replacing them.
3. **Real colour:** sample each building's wall colour (from the reality mesh or the textured LoD2) and roof colour (from the orthophoto) **at build time**. Then **snap each sample to the nearest colour in our pastel palette** and keep a small per-building tint. The yellow Empire block reads yellow, the red-brick one reads red-brick, and everything stays pastel.

Optional **layer 4, measured windows:** cast rays through the reality mesh's facade texture at each floor to estimate the number of window bays and the floor height, then feed those into the existing window texture generator (M15). It is the most work and the least visible from the air, so do it last, if ever.

## 4. Proposed pipeline (all at build time, all from a committed snapshot)

```
fetch (once, by the user if the sandbox is blocked)          → data/raw/
  register fields: c_julkisivu, c_valmpvm, c_rakeaine, c_kayttark   (WFS, already reachable)
  CityGML LoD2 for the Kauppatori map sheet(s)                (WFS when not overloaded, or the kartta.hel.fi/3d download)
  orthophoto crop of the 1.2 km box                           (WMS, one PNG)
  reality-mesh tiles for the box                              (kartta.hel.fi/3d, OBJ + textures; kept out of git if large, see below)
build (scripts/build-world.ts)                               → data/generated/
  roofs: LoD2 roof polygons → simplified low-poly roof per building (merge, cap triangle count, keep the ridge lines)
  style: era + material → style kit id per building
  colour: sample walls (mesh texture) and roof (orthophoto) → snap to palette → tint
  (later) window bays per facade
game: unchanged loading path; the builders read the new per-building fields
```

**The license stays simple:** all inputs are CC BY 4.0 © City of Helsinki, already credited in the README and the in-game credits. Nothing ODbL or share-alike is needed. Google is never touched.

**Size:**
- The reality mesh for 1.2 km² is probably hundreds of MB of OBJ and JPEG. Do not commit it.
- Commit the **derived** per-building numbers (a colour, a style id, maybe bay counts: a few kB) plus a small script that rebuilds them from a local copy. Record the download date and area in `SOURCES.md`.
- The LoD2 CityGML for the box and the orthophoto crop are a few MB each and can be committed. PLAN §6.8 asks for a note when committing large files.

**Performance:**
- LoD2 roofs add triangles, not draw calls (they merge into the existing per-chunk building mesh).
- Cap them with simplification so the M28 render-budget test still passes.

## 5. Suggested milestones (not started)

| # | Name | Content | Size |
|---|---|---|---|
| R1 | **Character from the register** | Fetch the dropped register fields; era and material → style kit and colour family per building; credits unchanged | S–M |
| R2 | **Real roofs** | LoD2 CityGML for the Kauppatori sheets; roof extraction and simplification in `build-world.ts`; real heights; landmark roofs checked against the hand-built landmarks | M–L |
| R3 | **Real colours** | Orthophoto roof colours; wall colours from the reality mesh, sampled locally by the user's download, snapped to the palette | M |
| R4 | **Measured windows** (optional) | Window bays and floor heights from the mesh textures | M |

R1 works with what is reachable now and probably gives the biggest change per hour. Before and after screenshots from the same spots (as in M10) are the check.

## 6. Open questions

1. **Ambition:** keep the pastel look and use real data only for shape, style and colour (recommended)? Or try an optional "photo" graphics mode with the real mesh? The latter is heavy, off-style, and the license is fine, but the performance is not.
2. **Downloads:** are you willing to download the reality-mesh tiles for the 1.2 km box yourself if the sandbox cannot (R3)? R1 and R2 need nothing from you unless the LoD2 service stays overloaded.
3. **OpenStreetMap:** stay OSM-free (current state, no ODbL), or allow OSM for gaps such as shop names and street furniture positions?

## Sources

- City of Helsinki: [Helsinki 3D](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d) and [3D models of Helsinki (avoindata.fi)](https://avoindata.fi/data/en/dataset/helsingin-3d-kaupunkimalli): LoD1/LoD2 CityGML, a textured LoD2 variant, the reality mesh, the download service, CC BY 4.0.
- [The reality mesh model of Kalasatama (2017), formats](https://hri.fi/data/en/dataset/helsingin-3d-kaupunkimalli/resource/c5f9e149-7dc3-413c-b3c8-b71cc9d6dbfc); [New generation city information models for Helsinki](https://hri.fi/en_gb/new-generation-city-information-models-for-helsinki); [Helsinki surface model](https://hri.fi/data/en_GB/dataset/helsingin-pintamalli).
- [Aalto: Photorealistic 3D mesh model dataset (Helsinki)](https://research.aalto.fi/en/datasets/photorealistic-3d-mesh-model-dataset-helsinki/); [hki-3d-ue (Helsinki data in Unreal)](https://github.com/kinotus/hki-3d-ue).
- Google: [Map Tiles API policies](https://developers.google.com/maps/documentation/tile/policies) (no unauthorised caching, extraction or offline use); [Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles); [Cesium forum on saving Google tiles](https://community.cesium.com/t/saving-google-map-data/31228) and [offline use](https://community.cesium.com/t/how-can-i-download-photorealistic-3d-tiles-for-cesium-js-react-offline-self-hosted/26293).
- Mapillary: [CC BY-SA licence](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data); [OSM wiki on Mapillary](https://wiki.openstreetmap.org/wiki/Mapillary).
- Procedural OSM buildings for reference: [Streets GL (MIT, unmaintained)](https://github.com/strandedkitty/streets-gl), [OSM wiki: Streets GL](https://wiki.openstreetmap.org/wiki/Streets_GL), [osm2threejs](https://pypi.org/project/osm2threejs/).
- Facade parsing research: [Window detection in facade imagery (Mask R-CNN)](https://ar5iv.labs.arxiv.org/html/2107.10006); [Inverse procedural facade modeling](https://ar5iv.labs.arxiv.org/html/2201.08977); [WinSyn (CVPR 2024)](https://openaccess.thecvf.com/content/CVPR2024/papers/Kelly_WinSyn__A_High_Resolution_Testbed_for_Synthetic_Data_CVPR_2024_paper.pdf); [LoD3 from images (ISPRS 2025)](https://isprs-annals.copernicus.org/articles/X-4-W6-2025/225/2025/isprs-annals-X-4-W6-2025-225-2025.pdf).
- Checked from this sandbox on 2026-11-21:
  - the register's `DescribeFeatureType` (field list) and a property-only fetch of our 1.2 km box;
  - the CityGML WFS `GetCapabilities` (OK) and `GetFeature` ("overloaded, retry later");
  - the `3d.hel.ninja` listing (Kalasatama only);
  - Overpass (unreachable).
