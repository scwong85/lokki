/** Minimal asset cache. Everything is bundled/static; no third-party runtime requests. */
const cache = new Map<string, Promise<unknown>>();

export function loadOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) cache.set(key, (p = loader()));
  return p;
}

export const loadJSON = <T>(url: string): Promise<T> =>
  loadOnce(url, () => fetch(url).then((r) => r.json() as Promise<T>));
