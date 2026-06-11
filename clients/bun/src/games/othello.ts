import { BaseGame } from './base';
import { t } from '../i18n';

const SIZE = 8;
const DIRS: [number, number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

export class Othello extends BaseGame {
  board: (string | null)[][];
  private _turnIdx = 0;
  private _over = false;
  private _winner: string | null = null;

  constructor() {
    super();
    this.board = Array.from({ length: SIZE }, () => Array<string | null>(SIZE).fill(null));
  }

  start(players: string[]): void {
    this.players = players;
    this._turnIdx = 0;
    const mid = SIZE >> 1;
    this.board[mid-1][mid-1] = players[1];
    this.board[mid][mid]     = players[1];
    this.board[mid-1][mid]   = players[0];
    this.board[mid][mid-1]   = players[0];
  }

  currentTurn(): string | null { return this.players[this._turnIdx] ?? null; }

  private _opponent(pid: string): string {
    return this.players[1 - this.players.indexOf(pid)];
  }

  private _flips(pid: string, r: number, c: number): [number, number][] {
    if (this.board[r][c] !== null) return [];
    const opp = this._opponent(pid);
    const allFlips: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
      const line: [number, number][] = [];
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === opp) {
        line.push([nr, nc]); nr += dr; nc += dc;
      }
      if (line.length && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.board[nr][nc] === pid) {
        allFlips.push(...line);
      }
    }
    return allFlips;
  }

  private _hasMoves(pid: string): boolean {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this._flips(pid, r, c).length) return true;
    return false;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData['pass']) return !this._hasMoves(playerId);
    const r = moveData['row'] as number, c = moveData['col'] as number;
    if (r == null || c == null) return false;
    return this._flips(playerId, r, c).length > 0;
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    if (!moveData['pass']) {
      const r = moveData['row'] as number, c = moveData['col'] as number;
      const flips = this._flips(playerId, r, c);
      this.board[r][c] = playerId;
      for (const [fr, fc] of flips) this.board[fr][fc] = playerId;
    }
    this._turnIdx = 1 - this._turnIdx;
    const nxt = this.currentTurn()!;
    if (!this._hasMoves(nxt)) {
      this._turnIdx = 1 - this._turnIdx;
      if (!this._hasMoves(this.currentTurn()!)) this._finish();
    }
  }

  private _finish(): void {
    this._over = true;
    const counts: Record<string, number> = {};
    for (const p of this.players) counts[p] = 0;
    for (const row of this.board) for (const c of row) if (c) counts[c] = (counts[c] ?? 0) + 1;
    const [p0, p1] = this.players;
    this._winner = counts[p0] !== counts[p1] ? (counts[p0] > counts[p1] ? p0 : p1) : null;
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const [p0, p1] = [this.players[0] ?? 'black', this.players[1] ?? 'white'];
    const syms: Record<string, string> = { [p0]: 'B', [p1]: 'W' };
    const lines = [t('othello.title')];
    lines.push('  ' + Array.from({ length: SIZE }, (_, i) => i).join(' '));
    for (let i = 0; i < SIZE; i++) {
      lines.push(`${i} ` + this.board[i].map(c => (c ? syms[c] ?? '?' : '.')).join(' '));
    }
    return lines.join('\n');
  }

  getState(_perspective: string): unknown {
    return { board: this.board, turn: this.currentTurn(), players: this.players };
  }
}
