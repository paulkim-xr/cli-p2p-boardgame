#!/usr/bin/env node
'use strict';

const i18n = require('./framework/i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./framework/config');
const { Host } = require('./framework/net/host');
const { Client } = require('./framework/net/client');
const { MsgType } = require('./framework/net/protocol');
const { Beacon, Listener } = require('./framework/lobby/discovery');
const { loadGameClasses } = require('./framework/lobby/session');
const { ChatLog } = require('./framework/chat');
const { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } = require('./framework/ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat, renderGame } = require('./framework/ui/lobby_screen');

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

      const parsed = parseMove(raw.trim(), gameObj);
      if (!parsed) {
        console.log(`\n  ${DIM}Unrecognized input — type ? for help${RESET}\n`);
        await new Promise(r => setTimeout(r, 1200));
        lastSnap = null;
        continue;
      }
      sendMove(parsed);
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
                'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)'],
  Mastermind:  ['Guess the secret 4-digit code (digits 1–6).',
                'B = right digit + right position.  W = right digit, wrong position.',
                'Move: <d1> <d2> <d3> <d4>   e.g. "1 2 3 4"  or  "1234"'],
  ConnectFour: ['Drop a piece into a column. First to connect 4 in a row wins.',
                'Move: <col>   e.g. "3"'],
  Othello:     ['Place a disc to flip opponent pieces sandwiched between yours.',
                'Player with the most discs when the board is full wins.',
                'Move: <row> <col>   e.g. "3 4"   or   "pass"'],
  Checkers:    ['Jump over opponent pieces to capture them. Multi-jump if possible.',
                'Reach the far end to become a king (can move backwards).',
                'Move: <fromRow> <fromCol> <toRow> <toCol>   e.g. "2 3 4 5"'],
  Chess:       ['Standard chess. Castling, en passant, and promotion all supported.',
                'Move: <from> <to>   e.g. "e2 e4"   castle: "e1 g1"'],
  Battleship:  ['Place ships secretly, then take turns calling coordinates to sink them.',
                'Place ship: <row> <col> <h|v>   e.g. "3 4 h"  (or "3 4 v" for vertical)',
                'Shoot:      <row> <col>          e.g. "3 4"'],
  Go:          ['Place stones to surround territory on a 9×9 board. Ko rule enforced.',
                'Higher score (territory + captures) wins.',
                'Move: <row> <col>   e.g. "3 4"   or   "pass"'],
  Hex:         ['Connect your two opposite sides of the 11×11 board. No draws.',
                'Move: <row> <col>   e.g. "3 4"'],
  Quoridor:    ['Race your pawn to the opposite side of the 9×9 board.',
                'Place walls to block opponents, but never seal off someone completely.',
                'Move pawn: n / s / e / w   e.g. "s"',
                'Place wall: <row> <col> <h|v>   e.g. "3 2 h"  (or "3 2 v" for vertical)'],
  Mancala:     ['Board shows  [0]:4  [1]:4  [2]:4  [3]:4  [4]:4  [5]:4  store=N',
                'Pick a pit index 0–5 to sow its seeds counter-clockwise.',
                'Land in your store → free turn.  Land in your own empty pit → capture opposite.',
                'Move: <pit>   e.g. "2"'],
};

function showGameHelp(gameObj) {
  clear();
  header('? Help');
  const lines = GAME_HELP[gameObj.constructor.name] || ['No help available for this game.'];
  lines.forEach(l => console.log(`  ${l}`));
  console.log();
  console.log(`  ${DIM}t = chat   ? = this help${RESET}`);
  console.log();
}

function parseMove(raw, gameObj) {
  const trimmed = raw.trim();

  // Accept raw JSON only when it looks like an object/array literal
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj === 'object' && obj !== null) return obj;
    } catch (_) {}
  }

  const game = gameObj ? gameObj.constructor.name : '';
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  const allNums = parts.length > 0 && nums.every(n => !isNaN(n));

  switch (game) {
    case 'Mancala':
      if (parts.length === 1 && !isNaN(nums[0])) return { pit: nums[0] };
      break;
    case 'Nim':
      if (parts.length === 2 && allNums) return { pile: nums[0], count: nums[1] };
      break;
    case 'ConnectFour':
      if (parts.length === 1 && !isNaN(nums[0])) return { col: nums[0] };
      break;
    case 'Othello':
      if (trimmed.toLowerCase() === 'pass') return { pass: true };
      if (parts.length === 2 && allNums) return { row: nums[0], col: nums[1] };
      break;
    case 'Checkers':
      if (parts.length === 4 && allNums) return { from: [nums[0], nums[1]], to: [nums[2], nums[3]] };
      break;
    case 'Chess':
      if (parts.length === 2) return { from: parts[0], to: parts[1] };
      break;
    case 'Battleship':
      if (parts.length === 3 && !isNaN(nums[0]) && !isNaN(nums[1])) {
        return { place: { row: nums[0], col: nums[1], horiz: parts[2].toLowerCase() !== 'v' } };
      }
      if (parts.length === 2 && allNums) {
        if (gameObj._phase === 'place') return { place: { row: nums[0], col: nums[1], horiz: true } };
        return { shot: { row: nums[0], col: nums[1] } };
      }
      break;
    case 'Go':
      if (trimmed.toLowerCase() === 'pass') return { pass: true };
      if (parts.length === 2 && allNums) return { row: nums[0], col: nums[1] };
      break;
    case 'Hex':
      if (parts.length === 2 && allNums) return { row: nums[0], col: nums[1] };
      break;
    case 'Quoridor':
      if (parts.length === 1 && /^[nsew]$/i.test(parts[0])) return { move: parts[0].toUpperCase() };
      if (parts.length === 3 && !isNaN(nums[0]) && !isNaN(nums[1])) {
        return { wall: { row: nums[0], col: nums[1], horiz: parts[2].toLowerCase() === 'h' } };
      }
      break;
    case 'Mastermind': {
      let digits = [];
      if (parts.length === 4 && allNums) digits = nums;
      else if (parts.length === 1 && /^\d{4}$/.test(parts[0])) digits = parts[0].split('').map(Number);
      if (digits.length === 4) return gameObj._code === null ? { code: digits } : { guess: digits };
      break;
    }
  }

  return null;
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
