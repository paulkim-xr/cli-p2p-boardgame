'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

class Chess extends BaseGame {
  constructor() {
    super();
    this.board = {};
    const back = ['R','N','B','Q','K','B','N','R'];
    for (let c = 0; c < 8; c++) {
      const f = String.fromCharCode(97 + c);
      this.board[`${f}1`] = ['w', back[c]];
      this.board[`${f}2`] = ['w', 'P'];
      this.board[`${f}7`] = ['b', 'P'];
      this.board[`${f}8`] = ['b', back[c]];
    }
    this.players = [];
    this._cmap = {};
    this._turnIdx = 0;
    this._castle = { w: { K: true, Q: true }, b: { K: true, Q: true } };
    this._enPassant = null;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    this._cmap = { [players[0]]: 'w', [players[1]]: 'b' };
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _row(sq) { return parseInt(sq[1]) - 1; }
  _col(sq) { return sq.charCodeAt(0) - 97; }
  _sq(r, c) { return String.fromCharCode(97 + c) + (r + 1); }
  _ok(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  _color(sq) { const p = this.board[sq]; return p ? p[0] : null; }

  _attacked(sq, by) {
    const r = this._row(sq), c = this._col(sq);
    const pd = by === 'w' ? -1 : 1;
    for (const dc of [-1, 1]) {
      const pr = r + pd, pc = c + dc;
      if (this._ok(pr, pc)) {
        const s = this._sq(pr, pc);
        if (this.board[s] && this.board[s][0] === by && this.board[s][1] === 'P') return true;
      }
    }
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      if (this._ok(r+dr, c+dc)) {
        const s = this._sq(r+dr, c+dc);
        if (this.board[s] && this.board[s][0] === by && this.board[s][1] === 'N') return true;
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (this._ok(r+dr, c+dc)) {
          const s = this._sq(r+dr, c+dc);
          if (this.board[s] && this.board[s][0] === by && this.board[s][1] === 'K') return true;
        }
      }
    }
    for (const [dirs, pts] of [
      [[[0,1],[0,-1],[1,0],[-1,0]], new Set(['R','Q'])],
      [[[1,1],[1,-1],[-1,1],[-1,-1]], new Set(['B','Q'])],
    ]) {
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (this._ok(nr, nc)) {
          const s = this._sq(nr, nc);
          if (this.board[s]) {
            if (this.board[s][0] === by && pts.has(this.board[s][1])) return true;
            break;
          }
          nr += dr; nc += dc;
        }
      }
    }
    return false;
  }

  _kingSq(color) {
    for (const [s, p] of Object.entries(this.board)) {
      if (p[0] === color && p[1] === 'K') return s;
    }
    return null;
  }

  _inCheck(color) {
    const ks = this._kingSq(color);
    const opp = color === 'w' ? 'b' : 'w';
    return ks ? this._attacked(ks, opp) : false;
  }

  _pseudoTargets(frm) {
    if (!this.board[frm]) return [];
    const [color, piece] = this.board[frm];
    const r = this._row(frm), c = this._col(frm);
    const res = [];
    if (piece === 'P') {
      const d = color === 'w' ? 1 : -1;
      const fwd = this._sq(r + d, c);
      if (this._ok(r + d, c) && !this.board[fwd]) {
        res.push(fwd);
        const start = color === 'w' ? 1 : 6;
        const fwd2 = this._sq(r + 2*d, c);
        if (r === start && !this.board[fwd2]) res.push(fwd2);
      }
      for (const dc of [-1, 1]) {
        if (this._ok(r + d, c + dc)) {
          const s = this._sq(r + d, c + dc);
          if ((this._color(s) !== null && this._color(s) !== color) || s === this._enPassant) {
            res.push(s);
          }
        }
      }
    } else if (piece === 'N') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        if (this._ok(r+dr, c+dc)) {
          const s = this._sq(r+dr, c+dc);
          if (this._color(s) !== color) res.push(s);
        }
      }
    } else if (piece === 'B' || piece === 'R' || piece === 'Q') {
      const dirs = [];
      if (piece === 'B' || piece === 'Q') dirs.push(...[[1,1],[1,-1],[-1,1],[-1,-1]]);
      if (piece === 'R' || piece === 'Q') dirs.push(...[[0,1],[0,-1],[1,0],[-1,0]]);
      for (const [dr, dc] of dirs) {
        let nr = r+dr, nc = c+dc;
        while (this._ok(nr, nc)) {
          const s = this._sq(nr, nc);
          if (this._color(s) === color) break;
          res.push(s);
          if (this.board[s]) break;
          nr += dr; nc += dc;
        }
      }
    } else if (piece === 'K') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (this._ok(r+dr, c+dc)) {
            const s = this._sq(r+dr, c+dc);
            if (this._color(s) !== color) res.push(s);
          }
        }
      }
      const rn = color === 'w' ? 1 : 8;
      const opp = color === 'w' ? 'b' : 'w';
      if (this._castle[color].K && !this._inCheck(color)) {
        const f = `f${rn}`, g = `g${rn}`;
        if (!this.board[f] && !this.board[g] && !this._attacked(f, opp) && !this._attacked(g, opp)) {
          res.push(g);
        }
      }
      if (this._castle[color].Q && !this._inCheck(color)) {
        const b2 = `b${rn}`, c2 = `c${rn}`, d2 = `d${rn}`;
        if (!this.board[b2] && !this.board[c2] && !this.board[d2] &&
            !this._attacked(c2, opp) && !this._attacked(d2, opp)) {
          res.push(c2);
        }
      }
    }
    return res;
  }

  _push(frm, to, promo = 'Q') {
    const saved = {
      board: { ...this.board },
      castle: { w: { ...this._castle.w }, b: { ...this._castle.b } },
      ep: this._enPassant,
    };
    const [color, piece] = this.board[frm];
    delete this.board[frm];
    this._enPassant = null;
    if (piece === 'P' && to === saved.ep) {
      const capR = this._row(to) + (color === 'w' ? -1 : 1);
      delete this.board[this._sq(capR, this._col(to))];
    }
    if (piece === 'P' && Math.abs(this._row(to) - this._row(frm)) === 2) {
      this._enPassant = this._sq(Math.floor((this._row(frm) + this._row(to)) / 2), this._col(frm));
    }
    if (piece === 'K') {
      this._castle[color] = { K: false, Q: false };
      const rn = this._row(frm) + 1;
      const dc = this._col(to) - this._col(frm);
      if (dc === 2) { this.board[`f${rn}`] = this.board[`h${rn}`]; delete this.board[`h${rn}`]; }
      else if (dc === -2) { this.board[`d${rn}`] = this.board[`a${rn}`]; delete this.board[`a${rn}`]; }
    }
    if (piece === 'R') {
      const rn = color === 'w' ? 1 : 8;
      if (frm === `a${rn}`) this._castle[color].Q = false;
      if (frm === `h${rn}`) this._castle[color].K = false;
    }
    if (piece === 'P' && (this._row(to) === 7 || this._row(to) === 0)) {
      this.board[to] = [color, promo];
    } else {
      this.board[to] = [color, piece];
    }
    return saved;
  }

  _pop(saved) {
    this.board = saved.board;
    this._castle = saved.castle;
    this._enPassant = saved.ep;
  }

  _legal(frm, to, promo = 'Q') {
    if (!this._pseudoTargets(frm).includes(to)) return false;
    const color = this.board[frm][0];
    const s = this._push(frm, to, promo);
    const ok = !this._inCheck(color);
    this._pop(s);
    return ok;
  }

  _allLegal(color) {
    const moves = [];
    for (const frm of Object.keys(this.board)) {
      if (this.board[frm] && this.board[frm][0] === color) {
        for (const to of this._pseudoTargets(frm)) {
          if (this._legal(frm, to)) moves.push([frm, to]);
        }
      }
    }
    return moves;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    const { from: frm, to } = moveData;
    if (!frm || !to || frm.length !== 2 || to.length !== 2) return false;
    if (!this.board[frm]) return false;
    if (this.board[frm][0] !== this._cmap[playerId]) return false;
    return this._legal(frm, to, moveData.promotion || 'Q');
  }

  applyMove(playerId, moveData) {
    this._push(moveData.from, moveData.to, moveData.promotion || 'Q');
    this._turnIdx = 1 - this._turnIdx;
    const nxtColor = this._cmap[this.players[this._turnIdx]];
    if (!this._allLegal(nxtColor).length) {
      this._over = true;
      this._winner = this._inCheck(nxtColor) ? this.players[1 - this._turnIdx] : null;
    }
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const lines = [t('chess.title'), t('chess.board_header')];
    for (let rank = 7; rank >= 0; rank--) {
      let row = `${rank + 1} `;
      for (let file = 0; file < 8; file++) {
        const sq = this._sq(rank, file);
        const p = this.board[sq];
        if (p) row += (p[0] === 'w' ? p[1] : p[1].toLowerCase()) + ' ';
        else row += '. ';
      }
      lines.push(row);
    }
    lines.push(t('chess.turn', { player: this.currentTurn() }));
    return lines.join('\n');
  }

  getState(perspective) {
    return {
      board: Object.fromEntries(Object.entries(this.board).map(([s, p]) => [s, [...p]])),
      turn: this.currentTurn(),
      players: this.players,
      check: !this._over ? this._inCheck(this._cmap[this.currentTurn()] || 'w') : false,
    };
  }
}

module.exports = { Chess };
