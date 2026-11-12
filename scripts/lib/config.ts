/** Shared pipeline configuration. Origin = Kauppatori (PLAN §4.6). */
export const ORIGIN_LONLAT = { lon: 24.955, lat: 60.167 };
/** Half-size of the square map area in metres around the origin (data is fetched with a bit of margin). */
export const MAP_HALF = 560;
export const FETCH_MARGIN = 40;

export const WFS = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs';

/** City of Helsinki open-data layers used. `keep` maps output property -> source property. */
export const LAYERS = {
  buildings: { type: 'Rakennukset_alue_rekisteritiedot', keep: { id: 'id', floors: 'i_kerrlkm', use: 'c_kayttark', kind: 'tyyppi_koodi', area: 'i_kokala' }, clip: false },
  streets: { type: 'YLRE_Katualue_alue', keep: { id: 'katualue_id', name: 'kadun_nimi', class: 'luokka', use: 'kayttotarkoitus' }, clip: false },
  parks: { type: 'YLRE_Viheralue_alue', keep: { id: 'viheralue_id', name: 'puiston_nimi', class: 'luokka' }, clip: false },
  land: { type: 'Maavesi_manner', keep: { type: 'tyyppi' }, clip: true },
  islands: { type: 'Maavesi_saaret', keep: { type: 'tyyppi' }, clip: true },
} as const;

export type LayerName = keyof typeof LAYERS;
