'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

class Checkers extends BaseGame {
  constructor() {
    super();
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.players = [];
    this._turnIdx = 0;
    this._over = false;
    this._winner = null;
    this._initBoard();
  }

  _initBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) this.board[r][c] = ['black', false];
          else if (r > 4) this.board[r][c] = ['red', false];
        }
      }
    }
  }

  start(players) {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _opp(color) {
    return color === 'red' ? 'black' : 'red';
  }

  _getMoves(color) {
    const moves = [];
    const fwdDirs = color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p[0] !== color) continue;
        const dirs = p[1] ? [[-1,-1],[-1,1],[1,-1],[1,1]] : fwdDirs;
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.board[nr][nc] === null) {
            moves.push([[r, c], [nr, nc]]);
          }
        }
      }
    }
    return moves;
  }

  _getJumps(color) {
    const jumps = [];
    const fwdDirs = color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
    const opp = this._opp(color);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p[0] !== color) continue;
        const dirs = p[1] ? [[-1,-1],[-1,1],[1,-1],[1,1]] : fwdDirs;
        for (const [dr, dc] of dirs) {
          const mr = r + dr, mc = c + dc;
          const lr = r + 2*dr, lc = c + 2*dc;
          if (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 &&
              this.board[mr][mc] && this.board[mr][mc][0] === opp &&
              this.board[lr][lc] === null) {
            jumps.push([[r,c],[mr,mc],[lr,lc]]);
          }
        }
      }
    }
    return jumps;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    const frm = moveData.from;
    const to = moveData.to;
    if (!frm || !to || frm.length !== 2 || to.length !== 2) return false;
    const color = playerId;
    const p = this.board[frm[0]][frm[1]];
    if (!p || p[0] !== color) return false;
    const jumps = this._getJumps(color);
    if (jumps.length) {
      return jumps.some(j => j[0][0]===frm[0] && j[0][1]===frm[1] && j[2][0]===to[0] && j[2][1]===to[1]);
    }
    return this._getMoves(color).some(m => m[0][0]===frm[0] && m[0][1]===frm[1] && m[1][0]===to[0] && m[1][1]===to[1]);
  }

  applyMove(playerId, moveData) {
    const color = playerId;
    const frm = moveData.from;
    const to = moveData.to;
    const piece = this.board[frm[0]][frm[1]];
    this.board[frm[0]][frm[1]] = null;
    const jumps = this._getJumps(color);
    const j = jumps.find(jj => jj[0][0]===frm[0] && jj[0][1]===frm[1] && jj[2][0]===to[0] && jj[2][1]===to[1]);
    if (j) this.board[j[1][0]][j[1][1]] = null;
    let isKing = piece[1];
    if ((color === 'red' && to[0] === 0) || (color === 'black' && to[0] === 7)) isKing = true;
    this.board[to[0]][to[1]] = [color, isKing];
    const opp = this._opp(color);
    const oppPieces = this.board.some(row => row.some(cell => cell && cell[0] === opp));
    if (!oppPieces || (!this._getJumps(opp).length && !this._getMoves(opp).length)) {
      this._over = true;
      this._winner = color;
    } else {
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const syms = new Map();
    const key = cell => cell ? `${cell[0]},${cell[1]}` : 'null';
    const lookup = { 'null': '.', 'red,false': 'r', 'red,true': 'R', 'black,false': 'b', 'black,true': 'B' };
    const lines = [t('checkers.title')];
    for (let i = 0; i < 8; i++) {
      lines.push(`${i} ` + this.board[i].map(c => lookup[key(c)] || '.').join(' '));
    }
    return lines.join('\n');
  }

  getState(perspective) {
    return {
      board: this.board.map(row => row.map(c => c ? [...c] : null)),
      turn: this.currentTurn(),
      players: this.players,
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.players) this.players = data.players;
    if (data.board) this.board = data.board.map(row => row.map(cell => cell ? [...cell] : null));
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }
}

module.exports = { Checkers };
