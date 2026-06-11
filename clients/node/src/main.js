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
const { clear, header, getch, question, enableAnsiWindows, BOLD, RESET } = require('./ui/terminal');
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
      players = msg.players || [];
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game;
      if (classes[gname]) {
        gameObj = new classes[gname]();
        gameObj.start(msg.players || []);
      }
    } else if (type === MsgType.STATE) {
      if (gameObj && typeof gameObj.loadState === 'function') {
        gameObj.loadState(msg.data || {});
      }
    }
  }

  function sendChat(text) {
    if (clientObj) clientObj.send({ type: MsgType.CHAT, from: playerName, text });
  }

  function sendMove(data) {
    if (clientObj) clientObj.send({ type: MsgType.MOVE, from: playerName, data });
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
  while (true) {
    const gameObj = getGame();
    if (!gameObj) {
      clear();
      header(t('game.waiting'));
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    clear();
    renderGame(gameObj, players, chatLog.recent(3));

    const [done, winner] = gameObj.isOver();
    if (done) {
      clear();
      header(t('game.over'));
      const msg = winner ? t('game.winner', { winner }) : t('game.draw');
      console.log(`\n  ${BOLD}${msg}${RESET}\n`);
      await question('  ' + t('game.continue'));
      return;
    }

    if (gameObj.currentTurn() === name) {
      const raw = await question(t('game.move_prompt'));
      if (!raw.trim()) continue;
      if (raw.trim().toLowerCase() === 't') {
        const msg = await question(t('game.chat_prompt'));
        if (msg.trim()) sendChat(msg.trim());
        continue;
      }
      sendMove(parseMove(raw.trim()));
    } else {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

function parseMove(raw) {
  try { return JSON.parse(raw); } catch (_) { return { raw }; }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
