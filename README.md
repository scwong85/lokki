# Lokki

*Lokki* ("gull" in Finnish) is a browser-based 3D game: you are a seagull causing gentle slapstick havoc in downtown Helsinki. Low-poly, pastel, mouse + keyboard. See [`docs/PLAN.md`](docs/PLAN.md) for the full plan.

Status: **M1 – Flight feel (graybox)**, awaiting playtest / decision gate 1.

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
```

## Controls (M1)

| Key | Action |
|---|---|
| WASD | walk / steer (relative to camera) |
| Space | hop on the ground; flap in the air (hold to keep flapping, costs stamina) |
| Shift (hold) | committed dive along the camera aim (mouse up/down = steeper/shallower); release after the minimum time to swoop up |
| S (in the air) | flare / brake, for precise landings |
| Mouse | click canvas for mouse look (Esc releases) |
| R | reset gull |
| F3 | debug panel: live tuning, "Copy tuning as JSON" |

## Data credits

_Placeholder._ From M3: Helsinki 3D city model (CC BY 4.0, City of Helsinki), © OpenStreetMap contributors (ODbL). CC0 audio/art credits from M2/M9.

## Licence

MIT, see [LICENSE](LICENSE).
