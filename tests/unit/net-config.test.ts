import { describe, expect, it } from 'vitest';
import { cleanSignalUrl, loadNetConfig, parseIceServers, resolveIceServers, saveNetConfig } from '../../src/net/netConfig';
import { SignalClient, SignalError } from '../../src/net/signal';

describe('relay settings', () => {
  it('accepts one server or a list, with or without credentials', () => {
    expect(parseIceServers('').servers).toEqual([]);
    const one = parseIceServers('{"urls":"turn:relay.example.com:3478","username":"u","credential":"p"}');
    expect(one.servers).toEqual([{ urls: ['turn:relay.example.com:3478'], username: 'u', credential: 'p' }]);
    expect(parseIceServers('[{"urls":["stun:a.example","turns:b.example:443"]}]').servers.length).toBe(1);
  });
  it('explains what is wrong', () => {
    expect(parseIceServers('not json').error).toMatch(/JSON/);
    expect(parseIceServers('{"urls":"http://nope"}').error).toMatch(/turn:/);
    expect(parseIceServers('[{"username":"x"}]').error).toBeTruthy();
  });
  it('cleans the room service address', () => {
    expect(cleanSignalUrl(' https://lokki-rooms.me.workers.dev/ ')).toBe('https://lokki-rooms.me.workers.dev');
    expect(cleanSignalUrl('javascript:alert(1)')).toBe('');
    expect(cleanSignalUrl('lokki')).toBe('');
  });
  it('saves and loads; the baked address is the fallback', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadNetConfig(st, 'https://baked.example').signalUrl).toBe('https://baked.example');
    saveNetConfig({ signalUrl: 'https://mine.example/', relayJson: '[]' }, st);
    expect(loadNetConfig(st, 'https://baked.example')).toEqual({ signalUrl: 'https://mine.example', relayJson: '[]' });
    expect(loadNetConfig({ getItem: () => '{broken' }, '').signalUrl).toBe('');
  });
  it('lists public STUN, the player relay and the service relay; a failing service is ignored', async () => {
    const ok = (async () => new Response(JSON.stringify({ iceServers: [{ urls: ['turn:svc.example'], username: 'a', credential: 'b' }] }))) as typeof fetch;
    const r = await resolveIceServers({ signalUrl: 'https://s.example', relayJson: '{"urls":"turn:own.example"}' }, ok);
    expect(r.servers.length).toBe(3);
    const bad = (async () => { throw new Error('offline'); }) as typeof fetch;
    expect((await resolveIceServers({ signalUrl: 'https://s.example', relayJson: '' }, bad)).servers.length).toBe(1);
    expect((await resolveIceServers({ signalUrl: '', relayJson: '{' }, bad)).warning).toMatch(/JSON/);
  });
});

describe('room service client', () => {
  it('creates, joins and waits for the answer', async () => {
    const calls: string[] = [];
    let answer: string | null = null;
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://s.example', '')}`);
      if (url.endsWith('/room') && init?.method === 'POST') return new Response(JSON.stringify({ code: 'K7QX2M' }));
      if (url.endsWith('/answer') && init?.method === 'POST') {
        answer = JSON.parse(init.body as string).answer;
        return new Response('{"ok":true}');
      }
      if (url.endsWith('/answer')) return new Response(JSON.stringify({ answer }));
      return new Response(JSON.stringify({ offer: 'LK1.o' }));
    }) as typeof fetch;
    const c = new SignalClient('https://s.example', f);
    expect(await c.createRoom('LK1.o')).toBe('K7QX2M');
    expect(await c.getOffer('K7QX2M')).toBe('LK1.o');
    let n = 0;
    const got = c.waitForAnswer('K7QX2M', () => false, 1, async () => {
      if (++n === 3) await c.postAnswer('K7QX2M', 'LK1.a');
    });
    expect(await got).toBe('LK1.a');
  });
  it('stops waiting when told to, and turns errors into readable ones', async () => {
    const c = new SignalClient('https://s.example', (async () => new Response('{"error":"No such room. It may have expired."}', { status: 404 })) as typeof fetch);
    await expect(c.getOffer('AAAAAA')).rejects.toThrow(/No such room/);
    await expect(c.waitForAnswer('AAAAAA', () => false, 1)).rejects.toBeInstanceOf(SignalError);
    const down = new SignalClient('https://s.example', (async () => { throw new TypeError('x'); }) as typeof fetch);
    await expect(down.createRoom('o')).rejects.toThrow(/Could not reach/);
    expect(await down.waitForAnswer('AAAAAA', () => true)).toBeNull();
  });
});
