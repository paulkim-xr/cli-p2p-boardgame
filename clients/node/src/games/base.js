'use strict';

class BaseGame {
  start(players) { this.players = players; }
  validateMove(playerId, moveData) { throw new Error('not implemented'); }
  applyMove(playerId, moveData) { throw new Error('not implemented'); }
  render(perspective) { throw new Error('not implemented'); }
  getState(perspective) { throw new Error('not implemented'); }
  isOver() { throw new Error('not implemented'); }
  currentTurn() { throw new Error('not implemented'); }
}

module.exports = { BaseGame };
