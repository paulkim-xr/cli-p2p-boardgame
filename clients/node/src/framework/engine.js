'use strict';

const { MsgType } = require('./net/protocol');
const { loadGameClasses } = require('./lobby/session');
const { BOLD, RESET, DIM, GREEN } = require('./ui/terminal');
const { renderGameStr } = require('./ui/lobby_screen');
const { t } = require('./i18n');

class GameEngine {
  constructor({ name, chatLog, panel }) {
    this.name = name;
    this.chatLog = chatLog;
    this.panel = panel;
    this.sendMove = null;
    this.sendChat = null;
    this.gameObj = null;
    this.players = [];
  }

  onMessage(msg) {
    const type = msg.type;
    if (type === MsgType.CHAT) {
      this.chatLog.add(msg.from || '?', msg.text || '');
      this.panel.pushChat(msg.from || '?', msg.text || '');
    } else if (type === MsgType.PLAYER_LIST) {
      const newPlayers = msg.players || [];
      if (this.gameObj && !this.gameObj._over && this.players.length > newPlayers.length) {
        const leaver = this.players.find(p => !newPlayers.includes(p));
        if (leaver) {
          this.gameObj._over = true;
          this.gameObj._winner = newPlayers[0] || null;
          this.gameObj._forfeitedBy = leaver;
        }
      }
      this.players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game;
      if (classes[gname]) {
        this.gameObj = new classes[gname]();
        this.gameObj.start(msg.players || []);
      }
    } else if (type === MsgType.STATE) {
      if (this.gameObj && typeof this.gameObj.loadState === 'function') {
        this.gameObj.loadState(msg.data || {}, this.name);
        this.panel.setContent(renderGameStr(this.gameObj, this.players, this.chatLog.recent(3), this.name));
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = msg.winner || null;
      }
    }
  }

  async run() {
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
        const endMsg = gameObj._forfeitedBy
          ? `${gameObj._forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`
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
          const lines = ['', `  ${BOLD}? Help${RESET}`, '', ...gameObj.getHelp().map(l => `  ${l}`), '',
            `  ${DIM}c = send chat   t = toggle chat panel   ? = help   q = quit${RESET}`, ''];
          this.panel.setContent(lines.join('\n'));
          await this.panel.readInput('  Press Enter to return... ', true);
          continue;
        }
        if (cmd === 'c') {
          const msg = await this.panel.readInput(t('game.chat_prompt'), true);
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await new Promise(r => setTimeout(r, 60));
          }
          continue;
        }
        const parsed = gameObj.parseInput(raw.trim());
        if (!parsed) {
          this.panel.setPrompt(`  ${DIM}Unrecognized input — type ? for help${RESET}`);
          await new Promise(r => setTimeout(r, 1200));
          this.panel.setPrompt('');
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
            await new Promise(r => setTimeout(r, 60));
          }
        } else if (k === '?') {
          const lines = ['', `  ${BOLD}? Help${RESET}`, '', ...gameObj.getHelp().map(l => `  ${l}`), '',
            `  ${DIM}c = send chat   t = toggle chat panel   ? = help   q = quit${RESET}`, ''];
          this.panel.setContent(lines.join('\n'));
          await this.panel.readInput('  Press Enter to return... ', true);
        }
      }
    }
  }
}

module.exports = { GameEngine };
