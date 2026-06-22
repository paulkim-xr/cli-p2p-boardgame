'use strict';

const { MsgType } = require('./net/protocol');
const { loadGameClasses } = require('./lobby/session');
const { clear, header, question, getchTimeout, readLineWithRefresh, BOLD, RESET, DIM } = require('./ui/terminal');
const { renderGame } = require('./ui/lobby_screen');
const { t } = require('./i18n');

class GameEngine {
  constructor({ name, chatLog }) {
    this.name = name;
    this.chatLog = chatLog;
    this.sendMove = null;   // set by caller after construction
    this.sendChat = null;   // set by caller after construction
    this.gameObj = null;
    this.players = [];
    this._lastSnap = null;
  }

  // ── network callback ──────────────────────────────────────────────────

  onMessage(msg) {
    const type = msg.type;
    if (type === MsgType.CHAT) {
      this.chatLog.add(msg.from || '?', msg.text || '');
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
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = msg.winner || null;
      }
    }
  }

  // ── main loop ─────────────────────────────────────────────────────────

  async run() {
    this._lastSnap = null;
    while (true) {
      const gameObj = this.gameObj;
      if (!gameObj) {
        const s = this._snap();
        if (s !== this._lastSnap) { clear(); header(t('game.waiting')); this._lastSnap = s; }
        await new Promise(r => setTimeout(r, 500));
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

      if (gameObj.currentTurn() === this.name) {
        const raw = await readLineWithRefresh(t('game.move_prompt'), () => {
          const s = this._snap();
          if (s !== this._lastSnap) {
            clear();
            renderGame(gameObj, this.players, this.chatLog.recent(3), this.name);
            this._lastSnap = s;
            return true;
          }
          return false;
        });
        if (!raw.trim()) { this._lastSnap = null; continue; }

        const cmd = raw.trim().toLowerCase();
        if (cmd === 'q') { return; }
        if (cmd === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await new Promise(r => setTimeout(r, 60));
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
          await new Promise(r => setTimeout(r, 1200));
          this._lastSnap = null;
          continue;
        }
        if (this.sendMove) this.sendMove(parsed);
        this._lastSnap = null;
      } else {
        const ch = await getchTimeout(150);
        if (ch === 'q') { return; }
        if (ch === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await new Promise(r => setTimeout(r, 60));
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

  // ── helpers ───────────────────────────────────────────────────────────

  _snap() {
    const g = this.gameObj;
    if (!g) return '__waiting__';
    const chats = this.chatLog.recent(3).map(e => `${e.from}:${e.text}`).join('|');
    return JSON.stringify(g.getState(this.name)) + '|' + chats;
  }

  _showHelp(gameObj) {
    clear();
    header('? Help');
    const lines = gameObj.getHelp();
    lines.forEach(l => console.log(`  ${l}`));
    console.log();
    console.log(`  ${DIM}t = chat   ? = this help${RESET}`);
    console.log();
  }
}

module.exports = { GameEngine };
