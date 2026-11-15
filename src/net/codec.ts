/**
 * Invite codes for connecting two browsers without a server: the WebRTC connection description (SDP) is packed into
 * a short-ish text the players can copy and paste to each other. Pure apart from the browser's compression stream.
 */

const PREFIX = 'LK1.';

const toB64Url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (text: string): Uint8Array => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export interface Description {
  type: 'offer' | 'answer';
  sdp: string;
}

/** Description -> "LK1.<text>" (deflate-compressed when the browser can, which roughly halves it). */
export async function encodeCode(d: Description): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify([d.type === 'offer' ? 'o' : 'a', d.sdp]));
  const packed = typeof CompressionStream !== 'undefined' ? await pipe(raw, new CompressionStream('deflate-raw')) : raw;
  return `${PREFIX}${typeof CompressionStream !== 'undefined' ? 'z' : 'r'}${toB64Url(packed)}`;
}

/** "LK1.<text>" -> Description. Throws a readable error for anything that is not a code. */
export async function decodeCode(code: string): Promise<Description> {
  const t = code.trim().replace(/\s+/g, '');
  if (!t.startsWith(PREFIX)) throw new Error('That is not a Lokki invite code.');
  const kind = t[PREFIX.length];
  try {
    const packed = fromB64Url(t.slice(PREFIX.length + 1));
    const raw = kind === 'z' ? await pipe(packed, new DecompressionStream('deflate-raw')) : packed;
    const [type, sdp] = JSON.parse(new TextDecoder().decode(raw)) as [string, string];
    if ((type !== 'o' && type !== 'a') || typeof sdp !== 'string') throw new Error('bad');
    return { type: type === 'o' ? 'offer' : 'answer', sdp };
  } catch {
    throw new Error('The code looks damaged. Copy it again, all of it.');
  }
}
