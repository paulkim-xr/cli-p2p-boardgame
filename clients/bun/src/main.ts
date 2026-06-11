#!/usr/bin/env bun
import { t, setLocale } from './i18n';
import { loadPort } from './config';
import { Host } from './net/host';
import { Client } from './net/client';
import { MsgType } from './net/protocol';
import type { WireMsg } from './net/protocol';
import { Beacon, Listener } from './lobby/discovery';
import { loadGameClasses } from './lobby/session';
import { ChatLog } from './chat';
import { clear, header, getch, question, enableAnsiWindows, BOLD, RESET } from './ui/terminal';
import { showLobby, promptHost, promptJoin, promptChat, renderGame } from './ui/lobby_screen';
import type { BaseGame } from './games/base';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  if (langIdx !== -1 && args[langIdx + 1]) setLocale(args[langIdx + 1]);

  enableAnsiWindows();

  const port = loadPort(args);
  let playerName: string | null = null;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) playerName = args[nameIdx + 1];
  if (!playerName) {
    playerName = await question(t('prompt.name'));
    playerName = playerName.trim() || t('prompt.default_name');
  }

  const chatLog = new ChatLog();
  const listener = new Listener({ port });
  listener.start();

  let gameObj: BaseGame | null = null;
  let players: string[] = [];
  let clientObj: Client | null = null;

  function onMessage(msg: WireMsg): void {
    if (msg.type === MsgType.CHAT) {
      chatLog.add(msg.from ?? '?', msg.text ?? '');
    } else if (msg.type === MsgType.PLAYER_LIST) {
      players = msg.players ?? [];
    } else if (msg.type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game!;
      if (classes[gname]) { gameObj = new classes[gname](); gameObj.start(msg.players ?? []); }
    } else if (msg.type === MsgType.STATE) {
      // state sync handled by server-side game object
    }
  }

  const sendChat = (text: string) => clientObj?.send({ type: MsgType.CHAT, from: playerName!, text });
  const sendMove = (data: Record<string, unknown>) => clientObj?.send({ type: MsgType.MOVE, from: playerName!, data });

  let running = true;
  while (running) {
    clear();
    showLobby(listener.getSessions(), playerName!, chatLog.recent(5));
    const ch = await getch();

    if (ch === 't') {
      const msg = await promptChat(playerName!, { question });
      if (msg) sendChat(msg);

    } else if (ch === 'h') {
      const [gameName, maxPlayers] = await promptHost(playerName!, { question });
      if (!gameName) continue;
      const host = new Host({ port, gameName, maxPlayers });
      await host.start();
      const beacon = new Beacon({ port, host: playerName!, game: gameName, players: [], maxPlayers });
      beacon.start();
      clientObj = new Client('127.0.0.1', port, playerName!, onMessage);
      await clientObj.connect();
      await new Promise(r => setTimeout(r, 200));
      await gameLoop(playerName!, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);

    } else if (ch === 'j') {
      const session = await promptJoin(listener.getSessions(), { question });
      if (!session) continue;
      clientObj = new Client(session.hostIp ?? session.host, session.port, playerName!, onMessage);
      await clientObj.connect();
      await new Promise(r => setTimeout(r, 200));
      await gameLoop(playerName!, clientObj, () => gameObj, players, chatLog, sendMove, sendChat);

    } else if (ch === 'q' || ch === '\x03') {
      running = false;
    }
  }

  process.exit(0);
}

async function gameLoop(
  name: string,
  _client: Client,
  getGame: () => BaseGame | null,
  players: string[],
  chatLog: ChatLog,
  sendMove: (data: Record<string, unknown>) => void,
  sendChat: (text: string) => void,
): Promise<void> {
  while (true) {
    const gameObj = getGame();
    if (!gameObj) {
      clear(); header(t('game.waiting'));
      await new Promise(r => setTimeout(r, 500));
      continue;
    }
    clear();
    renderGame(gameObj, players, chatLog.recent(3));
    const [done, winner] = gameObj.isOver();
    if (done) {
      clear(); header(t('game.over'));
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

function parseMove(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch (_) { return { raw }; }
}

main().catch(err => {
  console.error((err as Error).message);
  process.exit(1);
});
