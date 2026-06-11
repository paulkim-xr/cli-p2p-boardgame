'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

class Nim extends BaseGame {
  constructor(piles) {
    super();
    this.piles = piles ? [...piles] : [3, 5, 7];
    this.players = [];
    this._turnIdx = 0;
  }

  start(players) {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  validateMove(playerId, moveData) {
    if (playerId !== this.currentTurn()) return false;
    const { pile, count } = moveData;
    if (pile == null || count == null) return false;
    if (!(pile >= 0 && pile < this.piles.length)) return false;
    return count >= 1 && count <= this.piles[pile];
  }

  applyMove(playerId, moveData) {
    this.piles[moveData.pile] -= moveData.count;
    this._turnIdx = (this._turnIdx + 1) % this.players.length;
  }

  isOver() {
    if (this.piles.every(p => p === 0)) {
      const last = (this._turnIdx - 1 + this.players.length) % this.players.length;
      return [true, this.players[last]];
    }
    return [false, null];
  }

  render(perspective) {
    const lines = [t('nim.title')];
    for (let i = 0; i < this.piles.length; i++) {
      const p = this.piles[i];
      lines.push(t('nim.pile', { i, bar: 'I'.repeat(p), count: p }));
    }
    lines.push(t('nim.turn', { player: this.currentTurn() }));
    return lines.join('\n');
  }

  getState(perspective) {
    return { piles: [...this.piles], turn: this.currentTurn(), players: this.players };
  }
}

module.exports = { Nim };
