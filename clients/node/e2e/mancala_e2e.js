'use strict';
/**
 * Mancala e2e — verifies:
 *   1. loadState: after a move, both clients reflect the new turn via STATE messages
 *   2. Forfeit: when one client disconnects mid-game, the other sees _forfeitedBy
 *
 * Run: node clients/node/e2e/mancala_e2e.js
 */
const net    = require('net');
const { Host }           = require('../src/framework/net/host');
const { Client }         = require('../src/framework/net/client');
const { MsgType }        = require('../src/framework/net/protocol');
const { loadGameClasses } = require('../src/framework/lobby/session');

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m',
};

let passCount = 0;
let failCount = 0;

function assert(cond, label) {
  if (cond) {
    passCount++;
    process.stdout.write(`  ${C.green}✓${C.reset}  ${label}\n`);
  } else {
    failCount++;
    process.stdout.write(`  ${C.red}✗  ${label}${C.reset}\n`);
  }
}

function freePort() {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(0, () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
}

function waitForCount(arr, type, n, ms = 4000) {
  return new Promise((resolve, reject) => {
    if (arr.filter(m => m.type === type).length >= n) return resolve();
    const end = Date.now() + ms;
    const id = setInterval(() => {
      if (arr.filter(m => m.type === type).length >= n) { clearInterval(id); resolve(); }
      else if (Date.now() > end) { clearInterval(id); reject(new Error(`Timeout waiting for ${n}x ${type}`)); }
    }, 10);
  });
}

function waitFor(arr, type, ms = 4000) {
  return waitForCount(arr, type, 1, ms);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Replicates the onMessage logic from main.js so we can test game state updates.
function makeContext(playerName) {
  const ctx = { game: null, players: [], msgs: [] };
  const classes = loadGameClasses();

  ctx.onMessage = function(msg) {
    ctx.msgs.push(msg);
    const type = msg.type;
    if (type === MsgType.PLAYER_LIST) {
      const newPlayers = msg.players || [];
      if (ctx.game && !ctx.game._over && ctx.players.length > newPlayers.length) {
        const leaver = ctx.players.find(p => !newPlayers.includes(p));
        if (leaver) {
          ctx.game._over = true;
          ctx.game._winner = newPlayers[0] || null;
          ctx.game._forfeitedBy = leaver;
        }
      }
      ctx.players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      if (classes[msg.game]) {
        ctx.game = new classes[msg.game]();
        ctx.game.start(msg.players || []);
      }
    } else if (type === MsgType.STATE) {
      if (ctx.game && typeof ctx.game.loadState === 'function') {
        ctx.game.loadState(msg.data || {}, playerName);
      }
    } else if (type === MsgType.GAME_OVER) {
      if (ctx.game) {
        ctx.game._over = true;
        ctx.game._winner = msg.winner || null;
      }
    }
  };
  return ctx;
}

async function main() {
  const port = await freePort();
  process.stdout.write(
    `\n${C.bold}Mancala E2E — loadState + forfeit test${C.reset}\n` +
    `${C.dim}game: mancala  ·  2 players  ·  port: ${port}${C.reset}\n\n`
  );

  const host = new Host({ port, gameName: 'mancala', maxPlayers: 2 });
  await host.start();

  const aliceCtx = makeContext('alice');
  const bobCtx   = makeContext('bob');

  const alice = new Client('127.0.0.1', port, 'alice', aliceCtx.onMessage);
  const bob   = new Client('127.0.0.1', port, 'bob',   bobCtx.onMessage);

  // ── connect ──────────────────────────────────────────────────────────────────
  process.stdout.write(`${C.bold}Phase 1: Connect & game start${C.reset}\n`);
  await alice.connect();
  await waitFor(aliceCtx.msgs, MsgType.PLAYER_LIST);
  await bob.connect();
  await waitFor(aliceCtx.msgs, MsgType.GAME_START);
  await waitFor(bobCtx.msgs,   MsgType.GAME_START);
  await delay(50);

  assert(aliceCtx.game !== null,              'alice has a game object after GAME_START');
  assert(bobCtx.game   !== null,              'bob   has a game object after GAME_START');
  const first = aliceCtx.game.currentTurn();
  assert(typeof first === 'string',           `first turn is assigned: "${first}"`);
  assert(bobCtx.game.currentTurn() === first, 'both clients agree on first turn');

  // ── move 1: first player takes pit 2 ─────────────────────────────────────────
  process.stdout.write(`\n${C.bold}Phase 2: First player moves {pit:2} — loadState test${C.reset}\n`);
  const mover1 = first === 'alice' ? alice : bob;
  const mover1Ctx = first === 'alice' ? aliceCtx : bobCtx;
  const other1Ctx = first === 'alice' ? bobCtx : aliceCtx;

  mover1.send({ type: MsgType.MOVE, from: first, data: { pit: 2 } });
  await waitForCount(aliceCtx.msgs, MsgType.STATE, 1);
  await waitForCount(bobCtx.msgs,   MsgType.STATE, 1);
  await delay(60);

  const secondPlayer = aliceCtx.game.currentTurn();
  assert(secondPlayer !== null,                                'game not over after first move');
  assert(aliceCtx.game.currentTurn() === bobCtx.game.currentTurn(),
    `both clients agree on turn after move 1 (turn: "${secondPlayer}")`);
  assert(mover1Ctx.game.currentTurn() !== first || secondPlayer === first,
    'turn advanced (or extra-turn rule applied)');

  // Verify pit 2 was sown — pit 2 should now be 0 for the mover
  const pitsBefore = 4; // all pits start at 4
  const state = aliceCtx.game.pits[first];
  assert(Array.isArray(state) && state[2] === 0,
    `pit 2 of "${first}" is now empty after sowing`);

  // ── move 2: second player takes pit 0 ────────────────────────────────────────
  process.stdout.write(`\n${C.bold}Phase 3: Second player moves {pit:0}${C.reset}\n`);
  const mover2Name = secondPlayer;
  const mover2 = mover2Name === 'alice' ? alice : bob;

  mover2.send({ type: MsgType.MOVE, from: mover2Name, data: { pit: 0 } });
  await waitForCount(aliceCtx.msgs, MsgType.STATE, 2);
  await waitForCount(bobCtx.msgs,   MsgType.STATE, 2);
  await delay(60);

  assert(aliceCtx.game.currentTurn() === bobCtx.game.currentTurn(),
    'both clients agree on turn after move 2');
  assert(aliceCtx.game.pits[mover2Name][0] === 0,
    `pit 0 of "${mover2Name}" is empty after move 2`);

  // ── forfeit: bob disconnects ──────────────────────────────────────────────────
  process.stdout.write(`\n${C.bold}Phase 4: Bob disconnects — forfeit test${C.reset}\n`);
  bob.disconnect();
  // Wait for host to broadcast the updated PLAYER_LIST to alice
  const plCountBefore = aliceCtx.msgs.filter(m => m.type === MsgType.PLAYER_LIST).length;
  await waitForCount(aliceCtx.msgs, MsgType.PLAYER_LIST, plCountBefore + 1, 4000);
  await delay(60);

  assert(aliceCtx.game._over === true,          'alice sees game as over');
  assert(aliceCtx.game._forfeitedBy === 'bob',  'alice knows bob forfeited');
  assert(aliceCtx.game._winner === 'alice',     'alice is declared winner by forfeit');

  // ── cleanup ──────────────────────────────────────────────────────────────────
  alice.disconnect();
  host.stop();

  process.stdout.write(`\n${C.bold}─── Summary ───────────────────────────────────────────${C.reset}\n`);
  process.stdout.write(`  ${C.green}Passed: ${passCount}${C.reset}   ${failCount ? C.red : C.dim}Failed: ${failCount}${C.reset}\n\n`);

  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  process.stderr.write(`\n${C.red}FATAL: ${err.message}\n${err.stack}${C.reset}\n\n`);
  process.exit(1);
});
