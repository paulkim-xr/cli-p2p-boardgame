'use strict';

class BaseGame {
  start(players) { this.players = players; this._over = false; this._winner = null; }
  validateMove(playerId, moveData) { throw new Error('not implemented'); }
  applyMove(playerId, moveData) { throw new Error('not implemented'); }
  render(perspective) { throw new Error('not implemented'); }
  getState(perspective) { throw new Error('not implemented'); }
  loadState(data, perspective) { throw new Error('not implemented'); }
  isOver() { throw new Error('not implemented'); }
  currentTurn() { throw new Error('not implemented'); }
  parseInput(raw) { throw new Error('not implemented'); }
  getHelp() { throw new Error('not implemented'); }
}

module.exports = { BaseGame };
