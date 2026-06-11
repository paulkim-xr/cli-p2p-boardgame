'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { Host } = require('../src/net/host');
const { Client } = require('../src/net/client');
const { MsgType } = require('../src/net/protocol');

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitFor(msgs, type, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (msgs.some(m => m.type === type)) return resolve(true);
    };
    check();
    const orig = msgs.push.bind(msgs);
    msgs.push = (...args) => {
      const r = orig(...args);
      check();
      return r;
    };
    setTimeout(() => reject(new Error(`Timeout waiting for ${type}. Got: ${msgs.map(m => m.type).join(',')}`)), timeoutMs);
  });
}

test('host starts and accepts client', async () => {
  const port = await freePort();
  const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
  await host.start();

  const msgs = [];
  const client = new Client('127.0.0.1', port, 'alice', msg => msgs.push(msg));
  await client.connect();
  await waitFor(msgs, MsgType.PLAYER_LIST);

  assert.ok(msgs.some(m => m.type === MsgType.PLAYER_LIST));
  client.disconnect();
  host.stop();
});

test('two clients trigger game start', async () => {
  const port = await freePort();
  const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
  await host.start();

  const a_msgs = [], b_msgs = [];
  const a = new Client('127.0.0.1', port, 'alice', m => a_msgs.push(m));
  const b = new Client('127.0.0.1', port, 'bob',   m => b_msgs.push(m));
  await a.connect();
  await b.connect();

  await waitFor(a_msgs, MsgType.GAME_START);
  await waitFor(b_msgs, MsgType.GAME_START);

  assert.ok(a_msgs.some(m => m.type === MsgType.GAME_START));
  assert.ok(b_msgs.some(m => m.type === MsgType.GAME_START));

  a.disconnect();
  b.disconnect();
  host.stop();
});

test('chat is relayed to all clients', async () => {
  const port = await freePort();
  const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
  await host.start();

  const a_msgs = [], b_msgs = [];
  const a = new Client('127.0.0.1', port, 'alice', m => a_msgs.push(m));
  const b = new Client('127.0.0.1', port, 'bob',   m => b_msgs.push(m));
  await a.connect();
  await b.connect();

  await waitFor(a_msgs, MsgType.GAME_START);

  b.send({ type: MsgType.CHAT, from: 'bob', text: 'hello' });
  await waitFor(a_msgs, MsgType.CHAT);

  assert.ok(a_msgs.some(m => m.type === MsgType.CHAT && m.text === 'hello'));

  a.disconnect();
  b.disconnect();
  host.stop();
});
