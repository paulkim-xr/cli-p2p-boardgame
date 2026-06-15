'use strict';
const { BaseGame } = require('./base');
const { t } = require('../framework/i18n');

class Go extends BaseGame {
  constructor(size = 9) {
    super();
    this.size = size;
    this.board = Array.from({ length: size }, () => Array(size).fill(null));
    this.players = [];
    this._turnIdx = 0;
    this._captures = {};
    this._prevBoards = new Set();
    this._passes = 0;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    this._captures = { [players[0]]: 0, [players[1]]: 0 };
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _opponent(pid) {
    return this.players.find(p => p !== pid);
  }

  _neighbors(r, c) {
    return [[-1,0],[1,0],[0,-1],[0,1]]
      .map(([dr, dc]) => [r+dr, c+dc])
      .filter(([nr, nc]) => nr >= 0 && nr < this.size && nc >= 0 && nc < this.size);
  }

  _group(r, c) {
    const color = this.board[r][c];
    if (!color) return [new Set(), new Set()];
    const visited = new Set(), liberties = new Set();
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const key = `${cr},${cc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const [nr, nc] of this._neighbors(cr, cc)) {
        if (this.board[nr][nc] === color) stack.push([nr, nc]);
        else if (this.board[nr][nc] === null) liberties.add(`${nr},${nc}`);
      }
    }
    return [visited, liberties];
  }

  _groupCells(visited) {
    return [...visited].map(k => k.split(',').map(Number));
  }

  _removeDead(color) {
    let removed = 0;
    const checked = new Set();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (this.board[r][c] === color && !checked.has(key)) {
          const [grp, libs] = this._group(r, c);
          for (const k of grp) checked.add(k);
          if (!libs.size) {
            for (const [gr, gc] of this._groupCells(grp)) {
              this.board[gr][gc] = null;
              removed++;
            }
          }
        }
      }
    }
    return removed;
  }

  _boardStr() {
    return JSON.stringify(this.board);
  }

  _copyBoard() {
    return this.board.map(row => [...row]);
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData.pass) return true;
    const { row: r, col: c } = moveData;
    if (r == null || !(r >= 0 && r < this.size && c >= 0 && c < this.size)) return false;
    if (this.board[r][c] !== null) return false;
    const saved = this._copyBoard();
    this.board[r][c] = playerId;
    const opp = this._opponent(playerId);
    this._removeDead(opp);
    const [, libs] = this._group(r, c);
    const boardStr = this._boardStr();
    this.board = saved;
    if (this._prevBoards.has(boardStr)) return false;
    if (!libs.size) {
      this.board[r][c] = playerId;
      this._removeDead(opp);
      const [, libs2] = this._group(r, c);
      this.board = saved;
      if (!libs2.size) return false;
    }
    return true;
  }

  applyMove(playerId, moveData) {
    if (moveData.pass) {
      this._passes++;
    } else {
      this._passes = 0;
      const { row: r, col: c } = moveData;
      this._prevBoards.add(this._boardStr());
      this.board[r][c] = playerId;
      const opp = this._opponent(playerId);
      const captured = this._removeDead(opp);
      this._captures[playerId] = (this._captures[playerId] || 0) + captured;
    }
    if (this._passes >= 2) {
      this._over = true;
      this._winner = this._scoreWinner();
    }
    this._turnIdx = 1 - this._turnIdx;
  }

  _scoreWinner() {
    const scores = { ...this._captures };
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c]) scores[this.board[r][c]]++;
      }
    }
    scores[this.players[1]] = (scores[this.players[1]] || 0) + 6.5;
    return this.players.reduce((best, p) => (scores[p] > scores[best] ? p : best), this.players[0]);
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const [p0, p1] = [this.players[0] || 'black', this.players[1] || 'white'];
    const syms = { [p0]: 'B', [p1]: 'W', null: '.' };
    const capStr = JSON.stringify(this._captures);
    const lines = [t('go.title', { size: this.size, captures: capStr })];
    for (const row of this.board) {
      lines.push(row.map(c => syms[c] || '.').join(' '));
    }
    return lines.join('\n');
  }

  getState(perspective) {
    return {
      board: this.board,
      turn: this.currentTurn(),
      captures: { ...this._captures },
      players: this.players,
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.players) this.players = data.players;
    if (data.board) this.board = data.board.map(row => [...row]);
    if (data.captures) this._captures = { ...data.captures };
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }
}

module.exports = { Go };
