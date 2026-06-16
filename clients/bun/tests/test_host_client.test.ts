import { describe, test, expect, afterEach } from 'bun:test';
import * as net from 'net';
import { Host } from '../src/framework/net/host';
import { Client } from '../src/framework/net/client';
import { MsgType } from '../src/framework/net/protocol';
import type { WireMsg } from '../src/framework/net/protocol';

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
  });
}

function waitFor(msgs: WireMsg[], type: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const check = () => { if (msgs.some(m => m.type === type)) resolve(true); };
    check();
    const orig = msgs.push.bind(msgs);
    (msgs as WireMsg[] & { push: (...args: WireMsg[]) => number }).push = (...args: WireMsg[]) => {
      const r = orig(...args);
      check();
      return r;
    };
    setTimeout(() => reject(new Error(`Timeout waiting for ${type}. Got: ${msgs.map(m => m.type).join(',')}`)), timeoutMs);
  });
}

describe('Host + Client', () => {
  const resources: { host?: Host; clients: Client[] } = { clients: [] };

  afterEach(() => {
    resources.host?.stop();
    resources.clients.forEach(c => { try { c.disconnect(); } catch (_) {} });
    resources.clients.length = 0;
    resources.host = undefined;
  });

  test('host starts and accepts client', async () => {
    const port = await freePort();
    const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
    resources.host = host;
    await host.start();

    const msgs: WireMsg[] = [];
    const client = new Client('127.0.0.1', port, 'alice', msg => msgs.push(msg));
    resources.clients.push(client);
    await client.connect();
    await waitFor(msgs, MsgType.PLAYER_LIST);

    expect(msgs.some(m => m.type === MsgType.PLAYER_LIST)).toBe(true);
  });

  test('two clients trigger game start', async () => {
    const port = await freePort();
    const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
    resources.host = host;
    await host.start();

    const aMsgs: WireMsg[] = [], bMsgs: WireMsg[] = [];
    const a = new Client('127.0.0.1', port, 'alice', m => aMsgs.push(m));
    const b = new Client('127.0.0.1', port, 'bob',   m => bMsgs.push(m));
    resources.clients.push(a, b);
    await a.connect();
    await b.connect();

    await waitFor(aMsgs, MsgType.GAME_START);
    await waitFor(bMsgs, MsgType.GAME_START);

    expect(aMsgs.some(m => m.type === MsgType.GAME_START)).toBe(true);
    expect(bMsgs.some(m => m.type === MsgType.GAME_START)).toBe(true);
  });

  test('chat is relayed to all clients', async () => {
    const port = await freePort();
    const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
    resources.host = host;
    await host.start();

    const aMsgs: WireMsg[] = [], bMsgs: WireMsg[] = [];
    const a = new Client('127.0.0.1', port, 'alice', m => aMsgs.push(m));
    const b = new Client('127.0.0.1', port, 'bob',   m => bMsgs.push(m));
    resources.clients.push(a, b);
    await a.connect();
    await b.connect();
    await waitFor(aMsgs, MsgType.GAME_START);

    b.send({ type: MsgType.CHAT, from: 'bob', text: 'hello' });
    await waitFor(aMsgs, MsgType.CHAT);

    expect(aMsgs.some(m => m.type === MsgType.CHAT && m.text === 'hello')).toBe(true);
  });
});
