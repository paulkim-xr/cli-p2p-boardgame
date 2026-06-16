'use strict';
/**
 * Cross-client interop helper: Node.js Bob client.
 * Bob plays moves 2 (pile 1, count 5) and 4 (pile 2, count 1 — last stone, wins).
 * Alice is expected to be hosting separately (any client implementation).
 *
 * Usage: node node_bob_join.js <PORT>
 * Output: lines beginning with PASS: or FAIL:
 */
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');
const { Client }  = require(path.join(REPO, 'clients', 'node', 'src', 'framework', 'net', 'client'));
const { MsgType } = require(path.join(REPO, 'clients', 'node', 'src', 'framework', 'net', 'protocol'));

const PORT = parseInt(process.argv[2], 10);
const received = [];
const bob = new Client('127.0.0.1', PORT, 'bob', msg => received.push(msg));

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
  await bob.connect();

  await waitForCount(MsgType.GAME_START, 1);
  process.stdout.write('PASS: got GAME_START\n');

  // wait for alice's first move STATE, then play move 2
  await waitForCount(MsgType.STATE, 1);
  bob.send({ type: MsgType.MOVE, from: 'bob', data: { pile: 1, count: 5 } });

  // wait for alice's second move STATE (STATE count 3), then take last stone
  await waitForCount(MsgType.STATE, 3);
  bob.send({ type: MsgType.MOVE, from: 'bob', data: { pile: 2, count: 1 } });

  await waitForCount(MsgType.GAME_OVER, 1, 10000);
  const go = received.find(m => m.type === MsgType.GAME_OVER);
  if (go && go.winner === 'bob') {
    process.stdout.write(`PASS: GAME_OVER winner=bob\n`);
  } else {
    process.stdout.write(`FAIL: unexpected GAME_OVER: ${JSON.stringify(go)}\n`);
    process.exit(1);
  }

  bob.disconnect();
  process.stdout.write('JOIN done\n');
}

main().catch(err => {
  process.stdout.write(`FAIL: ${err.message}\n`);
  process.exit(1);
});
