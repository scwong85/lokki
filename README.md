# Lokki

*Lokki* ("gull" in Finnish) is a browser-based 3D game: you are a seagull causing gentle slapstick havoc in downtown Helsinki. Low-poly, pastel, mouse + keyboard. See [`docs/PLAN.md`](docs/PLAN.md) for the full plan.

Status: **M8 – Skills and saving** done. M9 (portfolio polish) next. M0–M8 done.

## Run

Requires Node >= 22.

```bash
npm install
npm run dev        # dev server
npm run build      # static build in dist/
npm run preview    # serve dist/ locally
npm run lint
npm test           # unit tests (Vitest)
npm run test:smoke # Playwright smoke test (needs Chromium)
npm run data:build # regenerate data/generated/kauppatori.json from data/raw/ (Node >= 22.18)
npm run data:fetch # re-download the raw snapshot from Helsinki open data (needs network)
```

`?greybox` in the URL (e.g. `http://localhost:5173/?greybox`) loads the M1 test course instead of the city.

## Controls (M1)

| Key | Action |
|---|---|
| WASD | walk / steer (relative to camera) |
| Space | hop on the ground; flap in the air (hold to keep flapping, costs stamina) |
| Shift (hold) | committed dive along the camera aim (mouse up/down = steeper/shallower); release after the minimum time to swoop up |
| S (in the air) | flare / brake, for precise landings |
| Mouse | click canvas for mouse look (Esc releases) |
| E | grab (with the beak) / drop; prompt shows what is in reach |
| Q | toss what you carry |
| F or left click | poop (click only while the mouse is captured); ring shows where it will land |
| H | hawk-eye: briefly reveals the city's lines and nets |
| R | reset everything (gull, props, tourists, heat, deterrents) |
| V / G / B | skills: crow call (Mimic), flock call, pigeon disguise (once earned) |
| K | skills panel |
| X / Z | extra objectives on/off, start a speedrun (after clearing the finale) |
| M | mute / unmute (sound and music) |
| C | credits |
| F3 | debug panel: live tuning, "Copy tuning as JSON" |

## Audio

Sound effects are synthesised at runtime with WebAudio. Music is public-domain / CC0 classical and ragtime recordings (see credits below and `data/raw/SOURCES.md`).

## Data credits

- **Buildings, streets, parks, coastline:** City of Helsinki open data (Helsingin kaupunki), licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), © City of Helsinki. Layers and processing are recorded in [`data/raw/SOURCES.md`](data/raw/SOURCES.md).
- **Sound effects:** synthesised at runtime, no sample files.
- **Music** (public domain / CC0 recordings from Wikimedia Commons; details in [`data/raw/SOURCES.md`](data/raw/SOURCES.md)): Mendelssohn, *The Hebrides* Overture (Musopen Symphony Orchestra); Satie, *Gymnopédie* no. 1 (Robin Alciatore); Joplin, "Maple Leaf Rag" (US Air Force Band Strolling Strings); Offenbach, "Galop infernal" (Gnissah).
- Landmarks (cathedral, tents, ferry, statue) are original stylised props.

## Licence

MIT, see [LICENSE](LICENSE).
