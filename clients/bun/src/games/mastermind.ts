import { BaseGame } from './base';
import { t } from '../i18n';

const MAX_GUESSES = 10;

export class Mastermind extends BaseGame {
  private _code: number[] | null = null;
  private _guesses: [number[], number, number][] = [];
  private _turnIdx = 0;
  private _over = false;
  private _winner: string | null = null;

  start(players: string[]): void {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn(): string | null {
    return this.players[this._turnIdx] ?? null;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (this._code === null) {
      const code = (moveData['code'] as number[]) ?? [];
      return code.length === 4 && code.every((d: number) => Number.isInteger(d) && d >= 1 && d <= 6);
    } else {
      const guess = (moveData['guess'] as number[]) ?? [];
      return guess.length === 4 && guess.every((d: number) => Number.isInteger(d) && d >= 1 && d <= 6);
    }
  }

  applyMove(_playerId: string, moveData: Record<string, unknown>): void {
    if (this._code === null) {
      this._code = moveData['code'] as number[];
      this._turnIdx = 1;
    } else {
      const guess = moveData['guess'] as number[];
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

  private _score(guess: number[]): [number, number] {
    let exact = 0;
    for (let i = 0; i < 4; i++) if (guess[i] === this._code![i]) exact++;
    const codeCount: Record<number, number> = {};
    const guessCount: Record<number, number> = {};
    for (let i = 0; i < 4; i++) {
      codeCount[this._code![i]] = (codeCount[this._code![i]] ?? 0) + 1;
      guessCount[guess[i]] = (guessCount[guess[i]] ?? 0) + 1;
    }
    let total = 0;
    for (const k of Object.keys(codeCount)) {
      total += Math.min(codeCount[Number(k)], guessCount[Number(k)] ?? 0);
    }
    return [exact, total - exact];
  }

  isOver(): [boolean, string | null] {
    return [this._over, this._winner];
  }

  render(_perspective?: string): string {
    const lines = [t('mastermind.title')];
    for (let i = 0; i < this._guesses.length; i++) {
      const [g, e, m] = this._guesses[i];
      lines.push(t('mastermind.guess', { n: i + 1, guess: g, exact: e, mis: m }));
    }
    if (!this._over) lines.push(t('mastermind.remaining', { n: MAX_GUESSES - this._guesses.length }));
    return lines.join('\n');
  }

  getState(perspective: string): unknown {
    const state: Record<string, unknown> = {
      guesses: this._guesses,
      turn: this.currentTurn(),
      players: this.players,
      over: this._over,
    };
    if (perspective === this.players[0] || this._over) state['code'] = this._code;
    return state;
  }
}
