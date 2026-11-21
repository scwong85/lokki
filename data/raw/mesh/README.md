# Reality mesh (photogrammetry) — to be downloaded by hand

Kept for a possible **photorealistic mode** later and for **sampling real wall colours** (M108 plan, layer 3). The game does not load it.

## What to download
- **Source:** City of Helsinki 3D download service, <https://kartta.hel.fi/3d/> (the "reality mesh" / *mesh-malli*, 2015 city-wide model; textured OBJ). Licence **CC BY 4.0**, © City of Helsinki.
- **Area:** the game's box around Kauppatori: centre 60.167 N, 24.955 E, 1.2 km square. In EPSG:3879 (ETRS-GK25):
  - E 25496901 … 25498101
  - N 6672079 … 6673279
  (`data/raw/fetch-meta.json` has the exact numbers.)
- **Format:** OBJ, **textured**.

## Where to put it
Unzip into `data/raw/mesh/` keeping the service's folder names, then add a line to `data/raw/SOURCES.md` (date, area, format, file count, total size).

## Git
The files are large (expect hundreds of MB). `.gitattributes` stores everything under `data/raw/mesh/` (except this README) in **Git LFS**:

```bash
git lfs install
```

```bash
git add data/raw/mesh && git commit -m "Reality mesh snapshot (Kauppatori box)"
```

Check your GitHub LFS storage and bandwidth quota first. If it is too big, keep the mesh outside git and commit only what we derive from it (per-building colours, a few kB).

## What is here now (2026-11-21)
One tile, `Tile-52-37-1-1` (OBJ + MTL + 2 textures, 376 MB in Git LFS), covering about 148 m × 148 m at E 25497080–25497228, N 6672497–6672645. In game metres that is x −422…−274, z 35…183: the south-west part of the map, 12 buildings, **not** the Market Square. Heights run 5.6–41.8 m (vertical datum not yet confirmed).

Every clone or LFS pull of this repo downloads these 376 MB. GitHub's free LFS plan allows 1 GB of storage and 1 GB of bandwidth a month, so the full box (about 81 tiles, roughly 30 GB) cannot live in LFS. For the rest of the area, keep the tiles outside git and commit only what we derive from them (per-building wall colours, a few kB), as planned above.
