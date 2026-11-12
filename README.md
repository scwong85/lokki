# Lokki

*Lokki* ("gull" in Finnish) is a browser-based 3D game: you are a seagull causing gentle slapstick havoc in downtown Helsinki. Low-poly, pastel, mouse + keyboard. See [`docs/PLAN.md`](docs/PLAN.md) for the full plan.

Status: **M0 – Foundations** (capsule gull on a pastel plane).

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

## Controls (M0)

WASD move · click canvas for mouse look (Esc releases) · F3 debug/tuning panel · "Copy tuning as JSON" to export values.

## Data credits

_Placeholder._ From M3: Helsinki 3D city model (CC BY 4.0, City of Helsinki), © OpenStreetMap contributors (ODbL). CC0 audio/art credits from M2/M9.

## Licence

MIT, see [LICENSE](LICENSE).
