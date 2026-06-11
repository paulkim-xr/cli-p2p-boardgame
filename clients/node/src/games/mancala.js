'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

const PITS = 6;
const SEEDS = 4;

class Mancala extends BaseGame {
  constructor() {
    super();
    this.players = [];
    this.pits = {};
    this.store = {};
    this._turnIdx = 0;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    for (const p of players) {
      this.pits[p] = Array(PITS).fill(SEEDS);
      this.store[p] = 0;
    }
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    const pit = moveData.pit;
    return Number.isInteger(pit) && pit >= 0 && pit < PITS && this.pits[playerId][pit] > 0;
  }

  applyMove(playerId, moveData) {
    const pit = moveData.pit;
    let seeds = this.pits[playerId][pit];
    this.pits[playerId][pit] = 0;
    const idx = this.players.indexOf(playerId);

    const order = [];
    for (let offset = 0; offset < this.players.length; offset++) {
      const p = this.players[(idx + offset) % this.players.length];
      const start = offset === 0 ? pit + 1 : 0;
      for (let i = start; i < PITS; i++) order.push(['pit', p, i]);
      if (offset === 0) order.push(['store', playerId, 0]);
    }

    let extraTurn = false;
    let last = null;
    for (const cell of order.slice(0, seeds)) {
      last = cell;
      if (cell[0] === 'pit') this.pits[cell[1]][cell[2]]++;
      else { this.store[cell[1]]++; if (cell[1] === playerId) extraTurn = true; }
    }

    if (last && last[0] === 'pit' && last[1] === playerId && this.pits[playerId][last[2]] === 1) {
      const oppIdx = PITS - 1 - last[2];
      const opp = this.players[(idx + 1) % this.players.length];
      const captured = this.pits[opp][oppIdx];
      if (captured > 0) {
        this.pits[opp][oppIdx] = 0;
        this.store[playerId] += captured + 1;
        this.pits[playerId][last[2]] = 0;
      }
    }

    const [done, winner] = this.isOver();
    if (done) {
      this._over = true;
      this._winner = winner;
    } else if (!extraTurn) {
      this._turnIdx = (this._turnIdx + 1) % this.players.length;
    }
  }

  isOver() {
    const allEmpty = this.players.every(p => this.pits[p].every(s => s === 0));
    if (!allEmpty) return [false, null];
    const scores = {};
    for (const p of this.players) {
      scores[p] = this.store[p] + this.pits[p].reduce((a, b) => a + b, 0);
    }
    const best = this.players.reduce((a, b) => scores[a] >= scores[b] ? a : b);
    const tied = this.players.filter(p => scores[p] === scores[best]);
    return [true, tied.length === 1 ? best : null];
  }

  render(perspective) {
    const lines = [t('mancala.title')];
    for (const p of this.players) {
      lines.push(t('mancala.player_row', { player: p, pits: JSON.stringify(this.pits[p]), store: this.store[p] }));
    }
    lines.push(t('mancala.turn', { player: this.currentTurn() }));
    return lines.join('\n');
  }

  getState(perspective) {
    return {
      pits: Object.fromEntries(this.players.map(p => [p, [...this.pits[p]]])),
      store: { ...this.store },
      turn: this.currentTurn(),
      players: this.players,
    };
  }
}

module.exports = { Mancala };
