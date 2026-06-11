import { BaseGame } from './base';
import { t } from '../i18n';

const ROWS = 6;
const COLS = 7;

export class ConnectFour extends BaseGame {
  board: (string | null)[][];
  private _turnIdx = 0;
  private _over = false;
  private _winner: string | null = null;

  constructor() {
    super();
    this.board = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
  }

  start(players: string[]): void {
    this.players = players;
    this._turnIdx = 0;
  }

  currentTurn(): string | null {
    return this.players[this._turnIdx] ?? null;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    const col = moveData['col'] as number;
    return Number.isInteger(col) && col >= 0 && col < COLS && this.board[0][col] === null;
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    const col = moveData['col'] as number;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.board[row][col] === null) { this.board[row][col] = playerId; break; }
    }
    if (this._checkWin(playerId)) {
      this._over = true; this._winner = playerId;
    } else if (this.board[0].every(c => c !== null)) {
      this._over = true; this._winner = null;
    } else {
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  private _checkWin(pid: string): boolean {
    const b = this.board;
    const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== pid) continue;
        for (const [dr, dc] of dirs) {
          let win = true;
          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== pid) { win = false; break; }
          }
          if (win) return true;
        }
      }
    }
    return false;
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const syms: Record<string, string> = {};
    if (this.players[0]) syms[this.players[0]] = 'X';
    if (this.players[1]) syms[this.players[1]] = 'O';
    const lines = [t('connect4.title')];
    for (const row of this.board) lines.push('  ' + row.map(c => (c ? syms[c] ?? '?' : '.')).join(' '));
    lines.push('  ' + Array.from({ length: COLS }, (_, i) => i).join(' '));
    return lines.join('\n');
  }

  getState(_perspective: string): unknown {
    return { board: this.board, turn: this.currentTurn(), players: this.players };
  }
}
