'use strict';
/**
 * Cross-client interop helper: Node.js Host + Node.js Alice client.
 * Alice plays moves 1 (pile 0, count 3) and 3 (pile 2, count 6).
 * Bob is expected to join separately (any client implementation).
 *
 * Usage: node node_host_alice.js <PORT>
 * Output: lines beginning with PASS: or FAIL:
 */
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');
const { Host }    = require(path.join(REPO, 'clients', 'node', 'src', 'framework', 'net', 'host'));
const { Client }  = require(path.join(REPO, 'clients', 'node', 'src', 'framework', 'net', 'client'));
const { MsgType } = require(path.join(REPO, 'clients', 'node', 'src', 'framework', 'net', 'protocol'));

const PORT = parseInt(process.argv[2], 10);
const received = [];

function waitForCount(type, n, ms = 8000) {
  return new Promise((resolve, reject) => {
    if (received.filter(m => m.type === type).length >= n) return resolve();
    const end = Date.now() + ms;
    const id = setInterval(() => {
      if (received.filter(m => m.type === type).length >= n) { clearInterval(id); resolve(); }
      else if (Date.now() > end) { clearInterval(id); reject(new Error(`Timeout waiting ${n}x ${type}`)); }
    }, 40);
  });
}

async function main() {
  const host = new Host({ port: PORT, gameName: 'nim', maxPlayers: 2 });
  await host.start();

  const alice = new Client('127.0.0.1', PORT, 'alice', msg => received.push(msg));
  await alice.connect();

  // wait for bob to join and game to start
  await waitForCount(MsgType.GAME_START, 1);
  process.stdout.write('PASS: got GAME_START\n');

  await new Promise(r => setTimeout(r, 50));

  // move 1: take 3 from pile 0 → [0,5,7]
  alice.send({ type: MsgType.MOVE, from: 'alice', data: { pile: 0, count: 3 } });

  // wait for STATE 2 (alice's own move + bob's response)
  await waitForCount(MsgType.STATE, 2);

  await new Promise(r => setTimeout(r, 50));

  // move 3: take 6 from pile 2 → [0,0,1]
  alice.send({ type: MsgType.MOVE, from: 'alice', data: { pile: 2, count: 6 } });

  // wait for GAME_OVER (bob takes last stone)
  await waitForCount(MsgType.GAME_OVER, 1, 10000);

  const go = received.find(m => m.type === MsgType.GAME_OVER);
  if (go && go.winner === 'bob') {
    process.stdout.write(`PASS: GAME_OVER winner=bob\n`);
  } else {
    process.stdout.write(`FAIL: unexpected GAME_OVER: ${JSON.stringify(go)}\n`);
    process.exit(1);
  }

  alice.disconnect();
  host.stop();
  process.stdout.write('HOST done\n');
}

main().catch(err => {
  process.stdout.write(`FAIL: ${err.message}\n`);
  process.exit(1);
});
