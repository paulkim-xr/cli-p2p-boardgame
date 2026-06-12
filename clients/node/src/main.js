#!/usr/bin/env node
'use strict';

const i18n = require('./i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./config');
const { Host } = require('./net/host');
const { Client } = require('./net/client');
const { MsgType } = require('./net/protocol');
const { Beacon, Listener } = require('./lobby/discovery');
const { loadGameClasses } = require('./lobby/session');
const { ChatLog } = require('./chat');
const { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } = require('./ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat, renderGame } = require('./ui/lobby_screen');

async function main() {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  if (langIdx !== -1 && args[langIdx + 1]) {
    setLocale(args[langIdx + 1]);
  }

  enableAnsiWindows();

  const port = loadPort(args);
  let playerName = null;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) {
    playerName = args[nameIdx + 1];
  }
  if (!playerName) {
    playerName = await question(t('prompt.name'));
    playerName = playerName.trim() || t('prompt.default_name');
  }

  const chatLog = new ChatLog();
  const listener = new Listener({ port });
  listener.start();

  let hostObj = null;
  let clientObj = null;
  let gameObj = null;
  let players = [];

  function onMessage(msg) {
    const type = msg.type;
    if (type === MsgType.CHAT) {
      chatLog.add(msg.from || '?', msg.text || '');
    } else if (type === MsgType.PLAYER_LIST) {
      const newPlayers = msg.players || [];
      if (gameObj && !gameObj._over && players.length > newPlayers.length) {
        const leaver = players.find(p => !newPlayers.includes(p));
        if (leaver) {
          gameObj._over = true;
          gameObj._winner = newPlayers[0] || null;
          gameObj._forfeitedBy = leaver;
        }
      }
      players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game;
      if (classes[gname]) {
        gameObj = new classes[gname]();
        gameObj.start(msg.players || []);
      }
    } else if (type === MsgType.STATE) {
      if (gameObj && typeof gameObj.loadState === 'function') {
        gameObj.loadState(msg.data || {}, playerName);
      }
    } else if (type === MsgType.GAME_OVER) {
      if (gameObj) {
        gameObj._over = true;
        gameObj._winner = msg.winner || null;
      }
    }
  }

  function sendChat(text) {
    if (clientObj) clientObj.send({ type: MsgType.CHAT, from: playerName, text });
  }

  function sendMove(data) {
    if (clientObj) clientObj.send({ type: MsgType.MOVE, from: playerName, data });
  }

  // --host <game>: skip lobby, auto-start hosting the named game (maxPlayers=2)
  const hostFlagIdx = args.indexOf('--host');
  if (hostFlagIdx !== -1 && args[hostFlagIdx + 1]) {
    const gameName = args[hostFlagIdx + 1];
    if (!loadGameClasses()[gameName]) {
      console.error(`Unknown game: ${gameName}. Available: ${Object.keys(loadGameClasses()).join(', ')}`);
      process.exit(1);
    }
    hostObj = new Host({ port, gameName, maxPlayers: 2 });
    await hostObj.start();
    const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers: 2 });
    beacon.start();
    clientObj = new Client('127.0.0.1', port, playerName, onMessage);
    await clientObj.connect();
    await new Promise(r => setTimeout(r, 200));
    await gameLoop(playerName, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);
    process.exit(0);
  }

  // --join <port>: skip lobby, connect directly to 127.0.0.1:<port>
  const joinFlagIdx = args.indexOf('--join');
  if (joinFlagIdx !== -1 && args[joinFlagIdx + 1]) {
    const joinPort = parseInt(args[joinFlagIdx + 1], 10);
    if (isNaN(joinPort)) {
      console.error(`Invalid port: ${args[joinFlagIdx + 1]}`);
      process.exit(1);
    }
    clientObj = new Client('127.0.0.1', joinPort, playerName, onMessage);
    await clientObj.connect();
    await new Promise(r => setTimeout(r, 300));
    await gameLoop(playerName, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);
    process.exit(0);
  }

  let running = true;
  while (running) {
    clear();
    const sessions = listener.getSessions();
    showLobby(sessions, playerName, chatLog.recent(5));

    const ch = await getch();

    if (ch === 't') {
      const msg = await promptChat(playerName, { question });
      if (msg) sendChat(msg);

    } else if (ch === 'h') {
      const [gameName, maxPlayers] = await promptHost(playerName, { question });
      if (!gameName) continue;
      hostObj = new Host({ port, gameName, maxPlayers });
      await hostObj.start();
      const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers });
      beacon.start();
      clientObj = new Client('127.0.0.1', port, playerName, onMessage);
      await clientObj.connect();
      await new Promise(r => setTimeout(r, 200));
      await gameLoop(playerName, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);

    } else if (ch === 'j') {
      const session = await promptJoin(sessions, { question });
      if (!session) continue;
      clientObj = new Client(session.hostIp || session.host, session.port, playerName, onMessage);
      await clientObj.connect();
      await new Promise(r => setTimeout(r, 200));
      await gameLoop(playerName, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);

    } else if (ch === 'q' || ch === '\x03') {
      running = false;
    }
  }

  process.exit(0);
}

async function gameLoop(name, clientObj, getGame, players, chatLog, sendMove, sendChat) {
  let lastSnap = null;
  let gameName = null;

  // Snapshot of everything that should trigger a re-render.
  // Only clear+render when this changes — prevents flickering on the waiting player.
  function snap() {
    const g = getGame();
    if (!g) return '__waiting__';
    const chats = chatLog.recent(3).map(e => `${e.from}:${e.text}`).join('|');
    return JSON.stringify(g.getState(name)) + '|' + chats;
  }

  while (true) {
    const gameObj = getGame();
    if (!gameObj) {
      const s = snap();
      if (s !== lastSnap) { clear(); header(t('game.waiting')); lastSnap = s; }
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    const s = snap();
    if (s !== lastSnap) {
      clear();
      renderGame(gameObj, players, chatLog.recent(3), name);
      lastSnap = s;
    }

    const [done, winner] = gameObj.isOver();
    if (done) {
      clear();
      header(t('game.over'));
      let endMsg;
      if (gameObj._forfeitedBy) {
        endMsg = `${gameObj._forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`;
      } else {
        endMsg = winner ? t('game.winner', { winner }) : t('game.draw');
      }
      console.log(`\n  ${BOLD}${endMsg}${RESET}\n`);
      await question('  ' + t('game.continue'));
      return;
    }

    if (gameObj.currentTurn() === name) {
      const raw = await question(t('game.move_prompt'));
      if (!raw.trim()) { lastSnap = null; continue; }

      const cmd = raw.trim().toLowerCase();
      if (cmd === 't') {
        const msg = await question(t('game.chat_prompt'));
        if (msg.trim()) {
          sendChat(msg.trim());
          await new Promise(r => setTimeout(r, 60)); // wait for loopback echo before re-render
        }
        lastSnap = null;
        continue;
      }
      if (cmd === '?') {
        showGameHelp(gameObj);
        await question(t('game.continue'));
        lastSnap = null;
        continue;
      }

      sendMove(parseMove(raw.trim()));
      lastSnap = null;
    } else {
      // Not our turn — still accept t (chat) and ? (help) via single-keypress
      const ch = await getchTimeout(150);
      if (ch === 't') {
        const msg = await question(t('game.chat_prompt'));
        if (msg.trim()) {
          sendChat(msg.trim());
          await new Promise(r => setTimeout(r, 60));
        }
        lastSnap = null;
      } else if (ch === '?') {
        showGameHelp(gameObj);
        await question(t('game.continue'));
        lastSnap = null;
      }
    }
  }
}

const GAME_HELP = {
  Nim:         ['Take ≥1 stone from exactly one pile each turn. Last to take wins.',
                'Move: {"pile":0,"count":2}   (take 2 from pile 0)'],
  Mastermind:  ['Guess the secret 4-digit code. B = right digit + right position.',
                'W = right digit but wrong position.',
                'Move: {"guess":[1,2,3,4]}'],
  ConnectFour: ['Drop a piece into a column. First to connect 4 in a row wins.',
                'Move: {"col":3}'],
  Othello:     ['Place a disc to flip opponent pieces between yours.',
                'Player with the most discs when the board is full wins.',
                'Move: {"row":3,"col":4}'],
  Checkers:    ['Jump over opponent pieces to capture them. Multi-jump if possible.',
                'Reach the far end to become a king (can move backwards).',
                'Move: {"from":[r,c],"to":[r,c]}'],
  Chess:       ['Standard chess. Castling, en passant, and promotion all supported.',
                'Move: {"from":"e2","to":"e4"}   castle: {"from":"e1","to":"g1"}'],
  Battleship:  ['Place ships secretly, then take turns calling coordinates to sink them.',
                'First to sink all opponent ships wins.',
                'Move: {"row":3,"col":4}'],
  Go:          ['Place stones to surround territory on a 9×9 board. Ko rule enforced.',
                'Higher score (territory + captures) wins.',
                'Move: {"row":3,"col":4}   or   {"pass":true}'],
  Hex:         ['Connect your two opposite sides of the 11×11 board.',
                'No draws — the board always fills before someone wins.',
                'Move: {"row":3,"col":4}'],
  Quoridor:    ['Race your pawn to the opposite side.',
                'Place walls to block opponents, but never seal off someone completely.',
                'Move pawn: {"row":5,"col":4}',
                'Place wall: {"wall":{"row":3,"col":2,"dir":"h"}}   dir = h or v'],
  Mancala:     ['Board shows  [0]:4  [1]:4  [2]:4  [3]:4  [4]:4  [5]:4  store=N',
                'Pick a pit index 0–5 to sow its seeds counter-clockwise.',
                'Land in your store → free turn.  Land in your own empty pit → capture opposite.',
                'Move: {"pit":2}'],
};

function showGameHelp(gameObj) {
  clear();
  header('? Help');
  const lines = GAME_HELP[gameObj.constructor.name] || ['No help available for this game.'];
  lines.forEach(l => console.log(`  ${l}`));
  console.log();
  console.log(`  ${DIM}t = chat   ? = this help   enter move as JSON above${RESET}`);
  console.log();
}

function parseMove(raw) {
  try { return JSON.parse(raw); } catch (_) { return { raw }; }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
