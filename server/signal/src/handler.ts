/**
 * Lokki room service: swaps the two connection codes of an online co-op game so players type a short room code
 * instead of pasting two long ones, and (optionally) hands out relay (TURN) credentials. It never sees game traffic.
 * Runs as a Cloudflare Worker (see ./index.ts and docs/online-setup.md); written against plain Request/Response so it is testable.
 */

/** The bit of Cloudflare KV we use. */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  ROOMS: KVLike;
  /** Optional: Cloudflare Realtime TURN key id and API token (secrets) for `/turn`. */
  TURN_KEY_ID?: string;
  TURN_API_TOKEN?: string;
  /** Optional: only answer pages from this origin (e.g. https://you.github.io). Default: any. */
  ALLOW_ORIGIN?: string;
}

/** No 0/O, 1/I/L: easy to read out loud. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
const TTL = 600; // a room lives 10 minutes (KV's minimum is 60)
const MAX_BODY = 8000;

interface Room {
  offer: string;
  answer: string | null;
}

export const newCode = (rand: () => number = Math.random): string => Array.from({ length: CODE_LEN }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
export const cleanCode = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const validCode = (c: string): boolean => c.length === CODE_LEN && [...c].every((ch) => ALPHABET.includes(ch));

export async function handle(req: Request, env: Env, rand: () => number = Math.random): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] === 'turn' && req.method === 'GET') return turn(env, json);
  if (parts[0] !== 'room') return json({ error: 'not found' }, 404);

  const readBody = async (): Promise<Record<string, unknown> | null> => {
    const text = await req.text();
    if (text.length > MAX_BODY) return null;
    try {
      const v = JSON.parse(text);
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  // POST /room {offer} -> {code}
  if (parts.length === 1 && req.method === 'POST') {
    const b = await readBody();
    if (!b || typeof b.offer !== 'string' || !b.offer) return json({ error: 'bad request' }, 400);
    for (let i = 0; i < 8; i++) {
      const code = newCode(rand);
      if (await env.ROOMS.get(`room:${code}`)) continue; // taken
      const room: Room = { offer: b.offer, answer: null };
      await env.ROOMS.put(`room:${code}`, JSON.stringify(room), { expirationTtl: TTL });
      return json({ code, ttl: TTL });
    }
    return json({ error: 'busy, try again' }, 503);
  }

  const code = cleanCode(parts[1] ?? '');
  if (!validCode(code)) return json({ error: 'That room code does not look right.' }, 400);
  const raw = await env.ROOMS.get(`room:${code}`);
  if (!raw) return json({ error: 'No such room. It may have expired (rooms last 10 minutes).' }, 404);
  const room = JSON.parse(raw) as Room;

  // GET /room/CODE -> {offer}
  if (parts.length === 2 && req.method === 'GET') return json({ offer: room.offer });
  // DELETE /room/CODE
  if (parts.length === 2 && req.method === 'DELETE') {
    await env.ROOMS.delete(`room:${code}`);
    return json({ ok: true });
  }
  if (parts[2] === 'answer') {
    // GET /room/CODE/answer -> {answer|null}
    if (req.method === 'GET') return json({ answer: room.answer });
    // POST /room/CODE/answer {answer}: the first answer wins, so a stranger cannot take over a room after the real guest joined
    if (req.method === 'POST') {
      const b = await readBody();
      if (!b || typeof b.answer !== 'string' || !b.answer) return json({ error: 'bad request' }, 400);
      if (room.answer) return json({ error: 'Someone has already joined this room.' }, 409);
      room.answer = b.answer;
      await env.ROOMS.put(`room:${code}`, JSON.stringify(room), { expirationTtl: TTL });
      return json({ ok: true });
    }
  }
  return json({ error: 'not found' }, 404);
}

/** Short-lived relay credentials from Cloudflare Realtime TURN. Without keys: an empty list (peer to peer only). */
async function turn(env: Env, json: (b: unknown, s?: number) => Response): Promise<Response> {
  if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) return json({ iceServers: [] });
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: 3600 }),
    });
    if (!r.ok) return json({ iceServers: [], error: `relay service said ${r.status}` });
    const data = (await r.json()) as { iceServers?: unknown };
    return json({ iceServers: Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [] });
  } catch {
    return json({ iceServers: [] });
  }
}
