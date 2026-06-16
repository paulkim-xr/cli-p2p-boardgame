import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

const SIZE = 11;

export class Hex extends BaseGameImpl {
  board: (string | null)[][];
  private _turnIdx = 0;

  constructor() {
    super();
    this.board = Array.from({ length: SIZE }, () => Array<string | null>(SIZE).fill(null));
  }

  start(players: string[]): void { this.players = players; this._turnIdx = 0; }
  currentTurn(): string | null { return this.players[this._turnIdx] ?? null; }

  private _neighbors(r: number, c: number): [number, number][] {
    return ([-1,0,1,0,-1,1] as number[]).map((_, i) => {
      const offsets: [number,number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,-1]];
      return [r + offsets[i][0], c + offsets[i][1]] as [number,number];
    }).filter(([nr, nc]) => nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE);
  }

  private _checkWin(pid: string): boolean {
    if (!this.players.length) return false;
    const isP0 = pid === this.players[0];
    const starts: [number,number][] = isP0
      ? Array.from({ length: SIZE }, (_, c) => [0, c] as [number,number]).filter(([, c]) => this.board[0][c] === pid)
      : Array.from({ length: SIZE }, (_, r) => [r, 0] as [number,number]).filter(([r]) => this.board[r][0] === pid);
    const goal = isP0 ? ([r]: [number,number]) => r === SIZE - 1 : ([, c]: [number,number]) => c === SIZE - 1;
    const visited = new Set<string>();
    const stack = [...starts];
    while (stack.length) {
      const pos = stack.pop()!;
      const key = `${pos[0]},${pos[1]}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (goal(pos)) return true;
      for (const nb of this._neighbors(pos[0], pos[1])) {
        if (this.board[nb[0]][nb[1]] === pid && !visited.has(`${nb[0]},${nb[1]}`)) stack.push(nb);
      }
    }
    return false;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    const r = moveData['row'] as number, c = moveData['col'] as number;
    return r != null && c != null && r >= 0 && r < SIZE && c >= 0 && c < SIZE && this.board[r][c] === null;
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    const r = moveData['row'] as number, c = moveData['col'] as number;
    this.board[r][c] = playerId;
    if (this._checkWin(playerId)) { this._over = true; this._winner = playerId; }
    else this._turnIdx = 1 - this._turnIdx;
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const [p0, p1] = [this.players[0] ?? 'black', this.players[1] ?? 'white'];
    const syms: Record<string, string> = { [p0]: 'B', [p1]: 'W' };
    const lines = [t('hex.title')];
    for (let i = 0; i < SIZE; i++) lines.push(' '.repeat(i) + this.board[i].map(c => (c ? syms[c] ?? '?' : '.')).join(' '));
    return lines.join('\n');
  }

  getState(_perspective?: string): Record<string, unknown> {
    return { board: this.board, turn: this.currentTurn(), players: this.players };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj as Record<string, unknown>; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const row = Number(parts[0]), col = Number(parts[1]);
      if (!isNaN(row) && !isNaN(col)) return { row, col };
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Connect your two opposite sides of the 11×11 board. No draws.',
      'Move: <row> <col>   e.g. "3 4"',
    ];
  }
}
