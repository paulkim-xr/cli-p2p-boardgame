#!/usr/bin/env node
'use strict';

const i18n = require('./framework/i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./framework/config');
const { Host } = require('./framework/net/host');
const { Client } = require('./framework/net/client');
const { MsgType } = require('./framework/net/protocol');
const { Beacon, Listener } = require('./framework/lobby/discovery');
const { ChatLog } = require('./framework/chat');
const { clear, header, getch, question, enableAnsiWindows } = require('./framework/ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat } = require('./framework/ui/lobby_screen');
const { GameEngine } = require('./framework/engine');
const { createGamePanel } = require('./framework/ui/panel');

async function runGame(ip, port, name, chatLog) {
  const panel = createGamePanel();
  const engine = new GameEngine({ name, chatLog, panel });
  const clientObj = new Client(ip, port, name, msg => engine.onMessage(msg));
  engine.sendMove = data => clientObj.send({ type: MsgType.MOVE, from: name, data });
  engine.sendChat = text => clientObj.send({ type: MsgType.CHAT, from: name, text });
  await clientObj.connect();
  await new Promise(r => setTimeout(r, 200));
  await engine.run();
  clientObj.disconnect();
  clear();
}

async function main() {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  if (langIdx !== -1 && args[langIdx + 1]) setLocale(args[langIdx + 1]);

  enableAnsiWindows();

  const port = loadPort(args);
  let playerName = null;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) playerName = args[nameIdx + 1];
  if (!playerName) {
    playerName = await question(t('prompt.name'));
    playerName = playerName.trim() || t('prompt.default_name');
  }

  const chatLog = new ChatLog();
  const listener = new Listener({ port });
  listener.start();

  // --host / --join fast-path flags
  const hostFlagIdx = args.indexOf('--host');
  if (hostFlagIdx !== -1 && args[hostFlagIdx + 1]) {
    const gameName = args[hostFlagIdx + 1];
    const hostObj = new Host({ port, gameName, maxPlayers: 2 });
    await hostObj.start();
    const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers: 2 });
    beacon.start();
    await runGame('127.0.0.1', port, playerName, chatLog);
    process.exit(0);
  }

  const joinFlagIdx = args.indexOf('--join');
  if (joinFlagIdx !== -1 && args[joinFlagIdx + 1]) {
    const joinPort = parseInt(args[joinFlagIdx + 1], 10);
    await runGame('127.0.0.1', joinPort, playerName, chatLog);
    process.exit(0);
  }

  // lobby loop
  let running = true;
  while (running) {
    clear();
    const sessions = listener.getSessions();
    showLobby(sessions, playerName, chatLog.recent(5));
    const ch = await getch();

    if (ch === 't') {
      const msg = await promptChat(playerName, { question });
      // lobby chat: no client yet; skip

    } else if (ch === 'h') {
      const [gameName, maxPlayers] = await promptHost(playerName, { question });
      if (!gameName) continue;
      const hostObj = new Host({ port, gameName, maxPlayers });
      await hostObj.start();
      const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers });
      beacon.start();
      await runGame('127.0.0.1', port, playerName, chatLog);

    } else if (ch === 'j') {
      const session = await promptJoin(sessions, { question });
      if (!session) continue;
      await runGame(session.hostIp || session.host, session.port, playerName, chatLog);

    } else if (ch === 'q' || ch === '\x03') {
      running = false;
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
