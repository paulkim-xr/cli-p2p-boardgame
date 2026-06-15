'use strict';
const { BaseGame } = require('./base');
const { t } = require('../framework/i18n');

const MAX_GUESSES = 10;

class Mastermind extends BaseGame {
  constructor() {
    super();
    this.players = [];
    this._code = null;
    this._guesses = [];
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

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (this._code === null) {
      const code = moveData.code || [];
      return code.length === 4 && code.every(d => Number.isInteger(d) && d >= 1 && d <= 6);
    } else {
      const guess = moveData.guess || [];
      return guess.length === 4 && guess.every(d => Number.isInteger(d) && d >= 1 && d <= 6);
    }
  }

  applyMove(playerId, moveData) {
    if (this._code === null) {
      this._code = moveData.code;
      this._turnIdx = 1;
    } else {
      const guess = moveData.guess;
      const [exact, mis] = this._score(guess);
      this._guesses.push([guess, exact, mis]);
      if (exact === 4) {
        this._over = true;
        this._winner = this.players[1];
      } else if (this._guesses.length >= MAX_GUESSES) {
        this._over = true;
        this._winner = this.players[0];
      }
    }
  }

  _score(guess) {
    let exact = 0;
    for (let i = 0; i < 4; i++) {
      if (guess[i] === this._code[i]) exact++;
    }
    const codeCount = {};
    const guessCount = {};
    for (let i = 0; i < 4; i++) {
      codeCount[this._code[i]] = (codeCount[this._code[i]] || 0) + 1;
      guessCount[guess[i]] = (guessCount[guess[i]] || 0) + 1;
    }
    let total = 0;
    for (const k of Object.keys(codeCount)) {
      total += Math.min(codeCount[k], guessCount[k] || 0);
    }
    return [exact, total - exact];
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const lines = [t('mastermind.title')];
    for (let i = 0; i < this._guesses.length; i++) {
      const [g, e, m] = this._guesses[i];
      lines.push(t('mastermind.guess', { n: i + 1, guess: g, exact: e, mis: m }));
    }
    if (!this._over) {
      lines.push(t('mastermind.remaining', { n: MAX_GUESSES - this._guesses.length }));
    }
    return lines.join('\n');
  }

  getState(perspective) {
    const state = {
      guesses: this._guesses,
      turn: this.currentTurn(),
      players: this.players,
      over: this._over,
    };
    if (perspective === this.players[0] || this._over) {
      state.code = this._code;
    }
    return state;
  }

  loadState(data) {
    if (!data) return;
    if (data.players) this.players = data.players;
    if (data.guesses) this._guesses = data.guesses.map(g => [...g]);
    if (data.over != null) this._over = data.over;
    if (data.code) this._code = [...data.code];
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }
}

module.exports = { Mastermind };
