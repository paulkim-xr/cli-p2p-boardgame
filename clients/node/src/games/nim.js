'use strict';
const { BaseGame } = require('./base');
const { t } = require('../framework/i18n');

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

  loadState(data) {
    if (!data) return;
    if (Array.isArray(data.piles)) this.piles = [...data.piles];
    if (data.players) this.players = data.players;
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const pile = Number(parts[0]), count = Number(parts[1]);
      if (!isNaN(pile) && !isNaN(count)) return { pile, count };
    }
    return null;
  }

  getHelp() {
    return [
      'Take >=1 stone from exactly one pile each turn. Last to take wins.',
      'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
    ];
  }
}

module.exports = { Nim };
