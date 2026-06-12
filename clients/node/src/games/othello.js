'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

const SIZE = 8;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

class Othello extends BaseGame {
  constructor() {
    super();
    this.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    this.players = [];
    this._turnIdx = 0;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    this._turnIdx = 0;
    // Initialize with actual player IDs: players[0]=black, players[1]=white
    const mid = SIZE >> 1;
    this.board[mid-1][mid-1] = players[1];
    this.board[mid][mid]     = players[1];
    this.board[mid-1][mid]   = players[0];
    this.board[mid][mid-1]   = players[0];
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _opponent(pid) {
    return this.players[1 - this.players.indexOf(pid)];
  }

  _flips(pid, r, c) {
    if (this.board[r][c] !== null) return [];
    const opp = this._opponent(pid);
    const allFlips = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr; nc += dc;
      }
      if (line.length && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === pid) {
        allFlips.push(...line);
      }
    }
    return allFlips;
  }

  _hasMoves(pid) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this._flips(pid, r, c).length) return true;
      }
    }
    return false;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData.pass) return !this._hasMoves(playerId);
    const { row: r, col: c } = moveData;
    if (r == null || c == null) return false;
    return this._flips(playerId, r, c).length > 0;
  }

  applyMove(playerId, moveData) {
    if (!moveData.pass) {
      const { row: r, col: c } = moveData;
      const flips = this._flips(playerId, r, c);
      this.board[r][c] = playerId;
      for (const [fr, fc] of flips) this.board[fr][fc] = playerId;
    }
    this._turnIdx = 1 - this._turnIdx;
    const nxt = this.currentTurn();
    if (!this._hasMoves(nxt)) {
      this._turnIdx = 1 - this._turnIdx;
      if (!this._hasMoves(this.currentTurn())) {
        this._finish();
      }
    }
  }

  _finish() {
    this._over = true;
    const counts = {};
    for (const p of this.players) counts[p] = 0;
    for (const row of this.board) {
      for (const c of row) { if (c) counts[c] = (counts[c] || 0) + 1; }
    }
    const [p0, p1] = this.players;
    this._winner = counts[p0] !== counts[p1]
      ? (counts[p0] > counts[p1] ? p0 : p1)
      : null;
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const [p0, p1] = [this.players[0] || 'black', this.players[1] || 'white'];
    const syms = { [p0]: 'B', [p1]: 'W', null: '.' };
    const lines = [t('othello.title')];
    lines.push('  ' + Array.from({ length: SIZE }, (_, i) => i).join(' '));
    for (let i = 0; i < SIZE; i++) {
      lines.push(`${i} ` + this.board[i].map(c => syms[c] || '.').join(' '));
    }
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
}

module.exports = { Othello };
