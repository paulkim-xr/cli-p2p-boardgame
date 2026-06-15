import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

export class Nim extends BaseGameImpl {
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

  getState(_perspective?: string): Record<string, unknown> {
    return { piles: [...this.piles], turn: this.currentTurn(), players: this.players };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj as Record<string, unknown>; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const pile = Number(parts[0]), count = Number(parts[1]);
      if (!isNaN(pile) && !isNaN(count)) return { pile, count };
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Take ≥1 stone from exactly one pile each turn. Last to take wins.',
      'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
    ];
  }
}
