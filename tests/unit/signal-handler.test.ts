import { describe, expect, it } from 'vitest';
import { cleanCode, handle, newCode, type Env, type KVLike } from '../../server/signal/src/handler';

class MemKV implements KVLike {
  m = new Map<string, string>();
  ttl = new Map<string, number | undefined>();
  async get(k: string) {
    return this.m.get(k) ?? null;
  }
  async put(k: string, v: string, o?: { expirationTtl?: number }) {
    this.m.set(k, v);
    this.ttl.set(k, o?.expirationTtl);
  }
  async delete(k: string) {
    this.m.delete(k);
  }
}
const call = (env: Env, method: string, path: string, body?: unknown) =>
  handle(new Request(`https://x.test${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }), env);

describe('room service', () => {
  it('a room goes offer -> code -> offer -> answer -> answer, once', async () => {
    const env: Env = { ROOMS: new MemKV() };
    const made = (await (await call(env, 'POST', '/room', { offer: 'LK1.offer' })).json()) as { code: string };
    expect(made.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(((await (await call(env, 'GET', `/room/${made.code}`)).json()) as { offer: string }).offer).toBe('LK1.offer');
    expect(((await (await call(env, 'GET', `/room/${made.code}/answer`)).json()) as { answer: null }).answer).toBeNull();
    expect((await call(env, 'POST', `/room/${made.code}/answer`, { answer: 'LK1.answer' })).status).toBe(200);
    expect(((await (await call(env, 'GET', `/room/${made.code}/answer`)).json()) as { answer: string }).answer).toBe('LK1.answer');
    // a second joiner is turned away
    expect((await call(env, 'POST', `/room/${made.code}/answer`, { answer: 'LK1.stranger' })).status).toBe(409);
    expect(((await (await call(env, 'GET', `/room/${made.code}/answer`)).json()) as { answer: string }).answer).toBe('LK1.answer');
  });
  it('typed codes are forgiven (lower case, dashes), wrong ones get a friendly error', async () => {
    const env: Env = { ROOMS: new MemKV() };
    const { code } = (await (await call(env, 'POST', '/room', { offer: 'o' })).json()) as { code: string };
    const typed = `${code.slice(0, 3).toLowerCase()}-${code.slice(3)}`;
    expect((await call(env, 'GET', `/room/${typed}`)).status).toBe(200);
    expect(cleanCode(typed)).toBe(code);
    expect((await call(env, 'GET', '/room/ABC')).status).toBe(400);
    expect((await call(env, 'GET', '/room/ZZZZZZ')).status).toBe(404);
  });
  it('rooms expire (ttl set), junk and oversized bodies are refused, a taken code is not reused', async () => {
    const kv = new MemKV();
    const env: Env = { ROOMS: kv };
    await call(env, 'POST', '/room', { offer: 'o' });
    expect([...kv.ttl.values()][0]).toBe(600);
    expect((await call(env, 'POST', '/room', { nope: 1 })).status).toBe(400);
    expect((await call(env, 'POST', '/room', { offer: 'x'.repeat(9000) })).status).toBe(400);
    const seq = [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const rand = () => seq[i++ % seq.length];
    const kv2 = new MemKV();
    const e2: Env = { ROOMS: kv2 };
    const a = (await (await handle(new Request('https://x.test/room', { method: 'POST', body: JSON.stringify({ offer: 'a' }) }), e2, rand)).json()) as { code: string };
    const b = (await (await handle(new Request('https://x.test/room', { method: 'POST', body: JSON.stringify({ offer: 'b' }) }), e2, rand)).json()) as { code: string };
    expect(a.code).not.toBe(b.code);
    expect(newCode(() => 0)).toBe('AAAAAA');
  });
  it('CORS preflight works, delete removes, /turn without keys is an empty list', async () => {
    const env: Env = { ROOMS: new MemKV() };
    expect((await call(env, 'OPTIONS', '/room')).status).toBe(204);
    const { code } = (await (await call(env, 'POST', '/room', { offer: 'o' })).json()) as { code: string };
    await call(env, 'DELETE', `/room/${code}`);
    expect((await call(env, 'GET', `/room/${code}`)).status).toBe(404);
    expect(((await (await call(env, 'GET', '/turn')).json()) as { iceServers: unknown[] }).iceServers).toEqual([]);
  });
});
