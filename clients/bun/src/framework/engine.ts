import { MsgType } from './net/protocol';
import { loadGameClasses } from './lobby/session';
import { BOLD, RESET, DIM, GREEN } from './ui/terminal';
import { renderGameStr } from './ui/lobby_screen';
import { t } from './i18n';
import type { ChatLog } from './chat';
import type { BaseGame } from '../games/base';
import type { GamePanel } from './ui/panel';

interface EngineOptions {
  name: string;
  chatLog: ChatLog;
  panel: GamePanel;
}

export class GameEngine {
  name: string;
  chatLog: ChatLog;
  panel: GamePanel;
  sendMove: ((data: unknown) => void) | null = null;
  sendChat: ((text: string) => void) | null = null;
  gameObj: BaseGame | null = null;
  players: string[] = [];

  constructor({ name, chatLog, panel }: EngineOptions) {
    this.name = name;
    this.chatLog = chatLog;
    this.panel = panel;
  }

  onMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    if (type === MsgType.CHAT) {
      this.chatLog.add((msg.from as string) || '?', (msg.text as string) || '');
      this.panel.pushChat((msg.from as string) || '?', (msg.text as string) || '');
    } else if (type === MsgType.PLAYER_LIST) {
      const newPlayers = (msg.players as string[]) || [];
      if (this.gameObj && !this.gameObj._over && this.players.length > newPlayers.length) {
        const leaver = this.players.find(p => !newPlayers.includes(p));
        if (leaver) {
          this.gameObj._over = true;
          this.gameObj._winner = newPlayers[0] || null;
          (this.gameObj as any)._forfeitedBy = leaver;
        }
      }
      this.players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game as string;
      if (classes[gname]) {
        this.gameObj = new classes[gname]();
        this.gameObj!.start((msg.players as string[]) || []);
      }
    } else if (type === MsgType.STATE) {
      if (this.gameObj) {
        this.gameObj.loadState((msg.data as Record<string, unknown>) || {}, this.name);
        this.panel.setContent(renderGameStr(this.gameObj, this.players, this.chatLog.recent(3), this.name));
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = (msg.winner as string) || null;
      }
    }
  }

  async run(): Promise<void> {
    while (true) {
      const gameObj = this.gameObj;

      if (!gameObj) {
        this.panel.setContent('\n  Waiting for players...');
        const k = await this.panel.waitKey(500);
        if (k === 'q') { this.panel.destroy(); return; }
        continue;
      }

      this.panel.setContent(renderGameStr(gameObj, this.players, this.chatLog.recent(3), this.name));

      const [done, winner] = gameObj.isOver();
      if (done) {
        const forfeitedBy = (gameObj as any)._forfeitedBy as string | undefined;
        const endMsg = forfeitedBy
          ? `${forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`
          : winner ? t('game.winner', { winner }) : t('game.draw');
        this.panel.setContent(`\n  ${BOLD}Game Over${RESET}\n\n  ${endMsg}\n\n`);
        await this.panel.readInput('  Press Enter to exit... ', true);
        this.panel.destroy();
        return;
      }

      if (gameObj.currentTurn() === this.name) {
        const raw = await this.panel.readInput(t('game.move_prompt'));
        const cmd = raw.trim().toLowerCase();
        if (!cmd) continue;
        if (cmd === 'q') { this.panel.destroy(); return; }
        if (cmd === '?') {
          const lines = ['', `  ${BOLD}? Help${RESET}`, '', ...gameObj.getHelp().map((l: string) => `  ${l}`), '',
            `  ${DIM}c = send chat   t = toggle chat panel   ? = help   q = quit${RESET}`, ''];
          this.panel.setContent(lines.join('\n'));
          await this.panel.readInput('  Press Enter to return... ', true);
          continue;
        }
        if (cmd === 'c') {
          const msg = await this.panel.readInput(t('game.chat_prompt'), true);
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await Bun.sleep(60);
          }
          continue;
        }
        const parsed = gameObj.parseInput(raw.trim());
        if (!parsed) {
          this.panel.setPrompt(`  ${DIM}Unrecognized input — type ? for help${RESET}`);
          await Bun.sleep(1200);
          this.panel.setPrompt();
          continue;
        }
        if (this.sendMove) this.sendMove(parsed);
      } else {
        const k = await this.panel.waitKey(150);
        if (k === 'q') { this.panel.destroy(); return; }
        if (k === 'c') {
          const msg = await this.panel.readInput(t('game.chat_prompt'), true);
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await Bun.sleep(60);
          }
        } else if (k === '?') {
          const lines = ['', `  ${BOLD}? Help${RESET}`, '', ...gameObj.getHelp().map((l: string) => `  ${l}`), '',
            `  ${DIM}c = send chat   t = toggle chat panel   ? = help   q = quit${RESET}`, ''];
          this.panel.setContent(lines.join('\n'));
          await this.panel.readInput('  Press Enter to return... ', true);
        }
      }
    }
  }
}
