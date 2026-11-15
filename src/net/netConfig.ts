/**
 * Online co-op settings: the optional room service (short room codes) and relay servers (TURN). Kept in this browser's
 * localStorage; the room service address can also be baked into the build (`VITE_SIGNAL_URL`). Pure parts are tested.
 */
import { PUBLIC_STUN } from './peer';

export interface NetConfig {
  /** Address of the room service ("" = not set: copy-paste codes only). */
  signalUrl: string;
  /** Extra ICE servers as JSON text (a relay from a free provider), "" = none. */
  relayJson: string;
}

const KEY = 'lokki.net';

/** Accept `{urls, username, credential}` or a list of them; returns [] and an error message for anything else. */
export function parseIceServers(text: string): { servers: RTCIceServer[]; error?: string } {
  const t = text.trim();
  if (!t) return { servers: [] };
  let v: unknown;
  try {
    v = JSON.parse(t);
  } catch {
    return { servers: [], error: 'The relay settings are not valid JSON.' };
  }
  const list = Array.isArray(v) ? v : [v];
  const out: RTCIceServer[] = [];
  for (const s of list) {
    const o = s as { urls?: unknown; username?: unknown; credential?: unknown };
    const urls = typeof o?.urls === 'string' ? [o.urls] : Array.isArray(o?.urls) && o.urls.every((u) => typeof u === 'string') ? (o.urls as string[]) : null;
    if (!urls || !urls.length || !urls.every((u) => /^(stun|stuns|turn|turns):/.test(u))) return { servers: [], error: 'Each relay needs "urls" starting with turn: or turns: (or stun:).' };
    const e: RTCIceServer = { urls };
    if (typeof o.username === 'string') e.username = o.username;
    if (typeof o.credential === 'string') e.credential = o.credential;
    out.push(e);
  }
  return { servers: out };
}

/** The room service address cleaned up: no trailing slash, only http(s). "" if it is not usable. */
export function cleanSignalUrl(s: string): string {
  const t = s.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/.test(t) ? t : '';
}

export function loadNetConfig(storage: Pick<Storage, 'getItem'> | null = safeStorage(), baked = (import.meta.env?.VITE_SIGNAL_URL as string | undefined) ?? ''): NetConfig {
  let saved: Partial<NetConfig> = {};
  try {
    saved = JSON.parse(storage?.getItem(KEY) ?? '{}') as Partial<NetConfig>;
  } catch {
    /* storage blocked or junk: use the defaults */
  }
  return { signalUrl: cleanSignalUrl(saved.signalUrl ?? '') || cleanSignalUrl(baked), relayJson: typeof saved.relayJson === 'string' ? saved.relayJson : '' };
}

export function saveNetConfig(c: NetConfig, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage blocked: the setting lasts until the page closes */
  }
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Every ICE server to try: public STUN, the room service's relay (if it offers one), and the player's own relay. */
export async function resolveIceServers(cfg: NetConfig, fetchFn: typeof fetch = fetch): Promise<{ servers: RTCIceServer[]; warning?: string }> {
  const servers: RTCIceServer[] = [...PUBLIC_STUN];
  let warning: string | undefined;
  const own = parseIceServers(cfg.relayJson);
  if (own.error) warning = own.error;
  servers.push(...own.servers);
  if (cfg.signalUrl) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      const r = await fetchFn(`${cfg.signalUrl}/turn`, { signal: ctl.signal });
      clearTimeout(timer);
      const data = (await r.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(data.iceServers)) servers.push(...data.iceServers);
    } catch {
      /* no relay from the service: peer to peer only */
    }
  }
  return { servers, warning };
}
