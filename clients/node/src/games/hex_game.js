'use strict';
const { BaseGame } = require('./base');
const { t } = require('../framework/i18n');

const SIZE = 11;

class Hex extends BaseGame {
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
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _neighbors(r, c) {
    return [[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,-1]]
      .map(([dr, dc]) => [r+dr, c+dc])
      .filter(([nr, nc]) => nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE);
  }

  _checkWin(pid) {
    if (!this.players.length) return false;
    const isP0 = pid === this.players[0];
    const starts = isP0
      ? Array.from({ length: SIZE }, (_, c) => [0, c]).filter(([, c]) => this.board[0][c] === pid)
      : Array.from({ length: SIZE }, (_, r) => [r, 0]).filter(([r]) => this.board[r][0] === pid);
    const goal = isP0 ? ([r]) => r === SIZE - 1 : ([, c]) => c === SIZE - 1;
    const visited = new Set();
    const stack = [...starts];
    while (stack.length) {
      const pos = stack.pop();
      const key = `${pos[0]},${pos[1]}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (goal(pos)) return true;
      for (const nb of this._neighbors(pos[0], pos[1])) {
        if (this.board[nb[0]][nb[1]] === pid && !visited.has(`${nb[0]},${nb[1]}`)) {
          stack.push(nb);
        }
      }
    }
    return false;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    const { row: r, col: c } = moveData;
    return r != null && c != null && r >= 0 && r < SIZE && c >= 0 && c < SIZE && this.board[r][c] === null;
  }

  applyMove(playerId, moveData) {
    const { row: r, col: c } = moveData;
    this.board[r][c] = playerId;
    if (this._checkWin(playerId)) {
      this._over = true;
      this._winner = playerId;
    } else {
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const [p0, p1] = [this.players[0] || 'black', this.players[1] || 'white'];
    const syms = { [p0]: 'B', [p1]: 'W', null: '.' };
    const lines = [t('hex.title')];
    for (let i = 0; i < SIZE; i++) {
      lines.push(' '.repeat(i) + this.board[i].map(c => syms[c] || '.').join(' '));
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

module.exports = { Hex };
