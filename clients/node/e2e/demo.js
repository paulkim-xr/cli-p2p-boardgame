'use strict';
/**
 * E2E demo — two Node.js clients communicating through a Host.
 * Plays a full game of Nim (4 moves) with a mid-game chat exchange.
 *
 * Run: node clients/node/e2e/demo.js
 */
const net    = require('net');
const { Host }    = require('../src/net/host');
const { Client }  = require('../src/net/client');
const { MsgType } = require('../src/net/protocol');

// ─── terminal colours ────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  magenta: '\x1b[35m',
  red:     '\x1b[31m',
  blue:    '\x1b[34m',
};

let msgN = 0;

function ts() { return new Date().toISOString().slice(11, 23); }

function log(from, to, msg) {
  msgN++;
  const fc = from === 'HOST'  ? C.cyan
           : from === 'ALICE' ? C.green
                               : C.yellow;
  const tc = to   === 'HOST'  ? C.cyan
           : to   === 'ALICE' ? C.green
           : to   === 'BOB'   ? C.yellow
                               : C.blue;
  const { type, ...rest } = msg;
  const body = Object.keys(rest).length ? '  ' + JSON.stringify(rest) : '';
  process.stdout.write(
    `${C.dim}[${ts()}]${C.reset} ${String(msgN).padStart(2)}. ` +
    `${fc}${from.padEnd(5)}${C.reset}${C.dim}→${C.reset}${tc}${to.padEnd(5)}${C.reset}  ` +
    `${C.magenta}${type}${C.reset}${body}\n`
  );
}

function section(title) {
  process.stdout.write(`\n${C.bold}── ${title}${C.reset}\n`);
}

function freePort() {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(0, () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
}

// polling-based waiters — avoids overwriting msgs.push multiple times
function waitFor(arr, type, ms = 3000) {
  return new Promise((resolve, reject) => {
    if (arr.some(m => m.type === type)) return resolve();
    const end = Date.now() + ms;
    const id = setInterval(() => {
      if (arr.some(m => m.type === type)) { clearInterval(id); resolve(); }
      else if (Date.now() > end)          { clearInterval(id); reject(new Error(`Timeout waiting for ${type}. Got: [${[...new Set(arr.map(m => m.type))].join(',')}]`)); }
    }, 10);
  });
}

function waitForCount(arr, type, n, ms = 3000) {
  return new Promise((resolve, reject) => {
    if (arr.filter(m => m.type === type).length >= n) return resolve();
    const end = Date.now() + ms;
    const id = setInterval(() => {
      if (arr.filter(m => m.type === type).length >= n) { clearInterval(id); resolve(); }
      else if (Date.now() > end)                        { clearInterval(id); reject(new Error(`Timeout waiting for ${n}x ${type}`)); }
    }, 10);
  });
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const port = await freePort();
  process.stdout.write(
    `\n${C.bold}CLI P2P Board Game Hub — E2E Demo${C.reset}\n` +
    `${C.dim}Node.js ${process.version}  ·  game: nim  ·  2 players  ·  port: ${port}${C.reset}\n\n`
  );

  // ─── 1. Host ──────────────────────────────────────────────────────────────
  const host = new Host({ port, gameName: 'nim', maxPlayers: 2 });
  await host.start();
  process.stdout.write(`${C.cyan}HOST${C.reset} TCP server listening on :${port}\n`);

  // ─── 2. Create clients with logging callbacks ─────────────────────────────
  const aliceMsgs = [];
  const bobMsgs   = [];

  const alice = new Client('127.0.0.1', port, 'alice', msg => {
    log('HOST', 'ALICE', msg);
    aliceMsgs.push(msg);
  });
  const bob = new Client('127.0.0.1', port, 'bob', msg => {
    log('HOST', 'BOB', msg);
    bobMsgs.push(msg);
  });

  // Wrap send() so outgoing messages are also logged.
  // This captures the auto-JOIN sent inside connect() too, since
  // connect() calls this.send() which resolves to our wrapper.
  for (const [name, client] of [['ALICE', alice], ['BOB', bob]]) {
    const orig = client.send.bind(client);
    client.send = msg => { log(name, 'HOST', msg); orig(msg); };
  }

  // ─── 3. Connect ───────────────────────────────────────────────────────────
  section('Alice connects');
  await alice.connect();
  await waitFor(aliceMsgs, MsgType.PLAYER_LIST);

  section('Bob connects  →  maxPlayers=2 reached, game auto-starts');
  await bob.connect();
  await waitFor(aliceMsgs, MsgType.GAME_START);
  await waitFor(bobMsgs,   MsgType.GAME_START);

  // ─── 4. Chat (works at any time, even mid-game) ───────────────────────────
  section('Chat exchange');
  alice.send({ type: MsgType.CHAT, from: 'alice', text: 'gl hf bob!' });
  bob.send({   type: MsgType.CHAT, from: 'bob',   text: 'you too alice :)' });
  // Host relays each chat back to all clients, so both players end up with 2 CHAT msgs
  await waitForCount(aliceMsgs, MsgType.CHAT, 2);
  await waitForCount(bobMsgs,   MsgType.CHAT, 2);

  // ─── 5. Play Nim to completion ────────────────────────────────────────────
  // Initial piles: [3, 5, 7]  —  alice moves first
  // Strategy: clear all piles in 4 moves so bob takes the last stone (bob wins)

  section('Move 1  ALICE takes 3 from pile 0   [3,5,7] → [0,5,7]');
  alice.send({ type: MsgType.MOVE, from: 'alice', data: { pile: 0, count: 3 } });
  await waitForCount(aliceMsgs, MsgType.STATE, 1);

  section('Move 2  BOB   takes 5 from pile 1   [0,5,7] → [0,0,7]');
  bob.send({   type: MsgType.MOVE, from: 'bob',   data: { pile: 1, count: 5 } });
  await waitForCount(aliceMsgs, MsgType.STATE, 2);

  section('Move 3  ALICE takes 6 from pile 2   [0,0,7] → [0,0,1]');
  alice.send({ type: MsgType.MOVE, from: 'alice', data: { pile: 2, count: 6 } });
  await waitForCount(aliceMsgs, MsgType.STATE, 3);

  section('Move 4  BOB   takes 1 from pile 2   [0,0,1] → [0,0,0]  — last stone!');
  bob.send({   type: MsgType.MOVE, from: 'bob',   data: { pile: 2, count: 1 } });
  await waitFor(aliceMsgs, MsgType.GAME_OVER);
  await waitFor(bobMsgs,   MsgType.GAME_OVER);

  // ─── 6. Results & assertions ──────────────────────────────────────────────
  section('Results');
  const gameOver   = aliceMsgs.find(m => m.type === MsgType.GAME_OVER);
  const stateCount = aliceMsgs.filter(m => m.type === MsgType.STATE).length;
  const chatA      = aliceMsgs.filter(m => m.type === MsgType.CHAT).length;
  const chatB      = bobMsgs  .filter(m => m.type === MsgType.CHAT).length;

  process.stdout.write(
    `\n   winner              = ${C.bold}${gameOver.winner}${C.reset}\n` +
    `   STATE msgs (alice)  = ${stateCount}\n` +
    `   CHAT  msgs (alice)  = ${chatA}  (bob) = ${chatB}\n`
  );

  if (gameOver.winner !== 'bob') throw new Error(`Expected winner=bob, got ${gameOver.winner}`);
  if (stateCount !== 4)          throw new Error(`Expected 4 STATE msgs, got ${stateCount}`);
  if (chatA !== 2 || chatB !== 2) throw new Error(`Expected 2 CHAT msgs each, got alice=${chatA} bob=${chatB}`);

  // ─── 7. Cleanup ───────────────────────────────────────────────────────────
  alice.disconnect();
  bob.disconnect();
  host.stop();

  process.stdout.write(`\n${C.green}${C.bold}✓  ${msgN} messages exchanged  ·  all assertions passed${C.reset}\n\n`);
}

main().catch(err => {
  process.stderr.write(`\n${C.red}✗  FAIL: ${err.message}${C.reset}\n\n`);
  process.exit(1);
});
