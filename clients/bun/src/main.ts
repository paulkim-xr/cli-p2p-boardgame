#!/usr/bin/env bun
import { t, setLocale } from './framework/i18n';
import { loadPort } from './framework/config';
import { Host } from './framework/net/host';
import { Client } from './framework/net/client';
import { MsgType } from './framework/net/protocol';
import { Beacon, Listener } from './framework/lobby/discovery';
import { ChatLog } from './framework/chat';
import { clear, header, getch, question, enableAnsiWindows } from './framework/ui/terminal';
import { showLobby, promptHost, promptJoin } from './framework/ui/lobby_screen';
import { GameEngine } from './framework/engine';
import { createGamePanel } from './framework/ui/panel';

async function runGame(ip: string, port: number, name: string, chatLog: ChatLog): Promise<void> {
  const panel = createGamePanel();
  const engine = new GameEngine({ name, chatLog, panel });
  const clientObj = new Client(ip, port, name, (msg: any) => engine.onMessage(msg));
  engine.sendMove = (data: unknown) => clientObj.send({ type: MsgType.MOVE, from: name, data });
  engine.sendChat = (text: string) => clientObj.send({ type: MsgType.CHAT, from: name, text });
  await clientObj.connect();
  await Bun.sleep(200);
  await engine.run();
  clear();
}

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

  let running = true;
  while (running) {
    clear();
    const sessions = listener.getSessions();
    showLobby(sessions, playerName, chatLog.recent(5));
    const ch = await getch();

    if (ch === 'h') {
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
      await runGame((session as any).hostIp || (session as any).host, (session as any).port, playerName, chatLog);

    } else if (ch === 'q' || ch === '\x03') {
      running = false;
    }
  }

  process.exit(0);
}

main().catch(err => { console.error((err as Error).message); process.exit(1); });
