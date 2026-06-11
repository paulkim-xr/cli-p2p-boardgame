import { BaseGame } from './base';
import { t } from '../i18n';

export class Nim extends BaseGame {
  piles: number[];
  private _turnIdx = 0;

  constructor(piles?: number[]) {
    super();
    this.piles = piles ? [...piles] : [3, 5, 7];
  }

  start(players: string[]): void {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn(): string | null {
    return this.players[this._turnIdx] ?? null;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (playerId !== this.currentTurn()) return false;
    const pile = moveData['pile'] as number;
    const count = moveData['count'] as number;
    if (pile == null || count == null) return false;
    if (!(pile >= 0 && pile < this.piles.length)) return false;
    return count >= 1 && count <= this.piles[pile];
  }

  applyMove(_playerId: string, moveData: Record<string, unknown>): void {
    this.piles[moveData['pile'] as number] -= moveData['count'] as number;
    this._turnIdx = (this._turnIdx + 1) % this.players.length;
  }

  isOver(): [boolean, string | null] {
    if (this.piles.every(p => p === 0)) {
      const last = (this._turnIdx - 1 + this.players.length) % this.players.length;
      return [true, this.players[last]];
    }
    return [false, null];
  }

  render(_perspective?: string): string {
    const lines = [t('nim.title')];
    for (let i = 0; i < this.piles.length; i++) {
      const p = this.piles[i];
      lines.push(t('nim.pile', { i, bar: 'I'.repeat(p), count: p }));
    }
    lines.push(t('nim.turn', { player: this.currentTurn() }));
    return lines.join('\n');
  }

  getState(_perspective: string): unknown {
    return { piles: [...this.piles], turn: this.currentTurn(), players: this.players };
  }
}
