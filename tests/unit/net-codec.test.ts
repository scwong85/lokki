import { describe, expect, it } from 'vitest';
import { decodeCode, encodeCode } from '../../src/net/codec';
import { PROTOCOL_VERSION, decodeMsg, encodeMsg, type Msg } from '../../src/net/protocol';

describe('invite codes', () => {
  const sdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\n' + 'a=candidate:1 1 udp 2113937151 192.168.1.20 54321 typ host generation 0\r\n'.repeat(12);

  it('round-trips offers and answers and survives pasting with spaces and newlines', async () => {
    const code = await encodeCode({ type: 'offer', sdp });
    expect(code.startsWith('LK1.')).toBe(true);
    expect(await decodeCode(code)).toEqual({ type: 'offer', sdp });
    const messy = ` ${code.slice(0, 20)}\n${code.slice(20, 60)} \r\n${code.slice(60)} `;
    expect((await decodeCode(messy)).sdp).toBe(sdp);
    expect((await decodeCode(await encodeCode({ type: 'answer', sdp }))).type).toBe('answer');
  });

  it('is compact (compressed) and rejects junk with readable errors', async () => {
    const code = await encodeCode({ type: 'offer', sdp });
    expect(code.length).toBeLessThan(sdp.length * 0.6);
    await expect(decodeCode('hello')).rejects.toThrow(/not a Lokki invite/);
    await expect(decodeCode('LK1.zNOTVALID!!')).rejects.toThrow(/damaged/);
    await expect(decodeCode(code.slice(0, 30))).rejects.toThrow(/damaged/);
  });
});

describe('protocol', () => {
  it('encodes and decodes every message shape; junk is ignored, never thrown', () => {
    const msgs: Msg[] = [
      { t: 'hello', v: PROTOCOL_VERSION, name: 'Guest', look: 'juvenile' },
      { t: 'welcome', v: PROTOCOL_VERSION, level: 'snack-attack', seed: 7, hostLook: 'herring' },
      { t: 'level', id: 'bombs-away', seed: 9 },
      { t: 'input', f: { n: 5, ax: 0.5, ay: -1, flap: true, dive: false, yaw: 1.2, pitch: 0.3, taps: ['KeyE'] } },
      { t: 'event', e: { k: 'toast', text: 'Snatched!' } },
      { t: 'bye', why: 'host left' },
      { t: 'ping', at: 1 },
    ];
    for (const m of msgs) expect(decodeMsg(encodeMsg(m))).toEqual(m);
    expect(decodeMsg('not json')).toBeNull();
    expect(decodeMsg('{"x":1}')).toBeNull();
    expect(decodeMsg('null')).toBeNull();
  });
});
