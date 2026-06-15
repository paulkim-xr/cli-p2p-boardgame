'use strict';
const { BaseGame } = require('./base');
const { t } = require('../framework/i18n');

const ROWS = 6;
const COLS = 7;

class ConnectFour extends BaseGame {
  constructor() {
    super();
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.players = [];
    this._turnIdx = 0;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    const col = moveData.col;
    return Number.isInteger(col) && col >= 0 && col < COLS && this.board[0][col] === null;
  }

  applyMove(playerId, moveData) {
    const col = moveData.col;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.board[row][col] === null) {
        this.board[row][col] = playerId;
        break;
      }
    }
    if (this._checkWin(playerId)) {
      this._over = true;
      this._winner = playerId;
    } else if (this.board[0].every(c => c !== null)) {
      this._over = true;
      this._winner = null;
    } else {
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  _checkWin(pid) {
    const b = this.board;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== pid) continue;
        for (const [dr, dc] of dirs) {
          let win = true;
          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== pid) {
              win = false; break;
            }
          }
          if (win) return true;
        }
      }
    }
    return false;
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const syms = { null: '.' };
    if (this.players[0]) syms[this.players[0]] = 'X';
    if (this.players[1]) syms[this.players[1]] = 'O';
    const lines = [t('connect4.title')];
    for (const row of this.board) {
      lines.push('  ' + row.map(c => syms[c] || '?').join(' '));
    }
    lines.push('  ' + Array.from({ length: COLS }, (_, i) => i).join(' '));
    return lines.join('\n');
  }

  getState(perspective) {
    return { board: this.board, turn: this.currentTurn(), players: this.players };
  }

  loadState(data) {
    if (!data) return;
    if (data.players) this.players = data.players;
    if (data.board) this.board = data.board.map(row => [...row]);
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const n = Number(trimmed.split(/\s+/)[0]);
    return isNaN(n) ? null : { col: n };
  }

  getHelp() {
    return [
      'Drop a piece into a column. First to connect 4 in a row wins.',
      'Move: <col>   e.g. "3"',
    ];
  }
}

module.exports = { ConnectFour };
