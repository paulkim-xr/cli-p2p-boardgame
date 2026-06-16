import { MsgType } from './net/protocol';
import { loadGameClasses } from './lobby/session';
import { clear, header, question, getchTimeout, BOLD, RESET, DIM } from './ui/terminal';
import { renderGame } from './ui/lobby_screen';
import { t } from './i18n';
import type { ChatLog } from './chat';
import type { BaseGame } from '../games/base';

interface EngineOptions {
  name: string;
  chatLog: ChatLog;
}

export class GameEngine {
  name: string;
  chatLog: ChatLog;
  sendMove: ((data: unknown) => void) | null = null;
  sendChat: ((text: string) => void) | null = null;
  gameObj: BaseGame | null = null;
  players: string[] = [];
  private _lastSnap: string | null = null;

  constructor({ name, chatLog }: EngineOptions) {
    this.name = name;
    this.chatLog = chatLog;
  }

  onMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    if (type === MsgType.CHAT) {
      this.chatLog.add((msg.from as string) || '?', (msg.text as string) || '');
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
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = (msg.winner as string) || null;
      }
    }
  }

  async run(): Promise<void> {
    this._lastSnap = null;
    while (true) {
      const gameObj = this.gameObj;
      if (!gameObj) {
        const s = this._snap();
        if (s !== this._lastSnap) { clear(); header(t('game.waiting')); this._lastSnap = s; }
        await Bun.sleep(500);
        continue;
      }

      const s = this._snap();
      if (s !== this._lastSnap) {
        clear();
        renderGame(gameObj, this.players, this.chatLog.recent(3), this.name);
        this._lastSnap = s;
      }

      const [done, winner] = gameObj.isOver();
      if (done) {
        clear();
        header(t('game.over'));
        const forfeitedBy = (gameObj as any)._forfeitedBy as string | undefined;
        const endMsg = forfeitedBy
          ? `${forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`
          : winner ? t('game.winner', { winner }) : t('game.draw');
        console.log(`\n  ${BOLD}${endMsg}${RESET}\n`);
        await question('  ' + t('game.continue'));
        return;
      }

      if (gameObj.currentTurn() === this.name) {
        const raw = await question(t('game.move_prompt'));
        if (!raw.trim()) { this._lastSnap = null; continue; }

        const cmd = raw.trim().toLowerCase();
        if (cmd === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await Bun.sleep(60);
          }
          this._lastSnap = null;
          continue;
        }
        if (cmd === '?') {
          this._showHelp(gameObj);
          await question(t('game.continue'));
          this._lastSnap = null;
          continue;
        }

        const parsed = gameObj.parseInput(raw.trim());
        if (!parsed) {
          console.log(`\n  ${DIM}Unrecognized input — type ? for help${RESET}\n`);
          await Bun.sleep(1200);
          this._lastSnap = null;
          continue;
        }
        if (this.sendMove) this.sendMove(parsed);
        this._lastSnap = null;
      } else {
        const ch = await getchTimeout(150);
        if (ch === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await Bun.sleep(60);
          }
          this._lastSnap = null;
        } else if (ch === '?') {
          this._showHelp(gameObj);
          await question(t('game.continue'));
          this._lastSnap = null;
        }
      }
    }
  }

  private _snap(): string {
    const g = this.gameObj;
    if (!g) return '__waiting__';
    const chats = this.chatLog.recent(3).map((e: any) => `${e.from}:${e.text}`).join('|');
    return JSON.stringify(g.getState(this.name)) + '|' + chats;
  }

  private _showHelp(gameObj: BaseGame): void {
    clear();
    header('? Help');
    gameObj.getHelp().forEach(l => console.log(`  ${l}`));
    console.log();
    console.log(`  ${DIM}t = chat   ? = this help${RESET}`);
    console.log();
  }
}
