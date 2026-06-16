import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

export class Go extends BaseGameImpl {
  readonly size: number;
  board: (string | null)[][];
  private _turnIdx = 0;
  private _captures: Record<string, number> = {};
  private _prevBoards: Set<string> = new Set();
  private _passes = 0;

  constructor(size = 9) {
    super();
    this.size = size;
    this.board = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  }

  start(players: string[]): void {
    this.players = players;
    this._captures = { [players[0]]: 0, [players[1]]: 0 };
  }

  currentTurn(): string | null { return this.players[this._turnIdx] ?? null; }
  private _opponent(pid: string): string { return this.players.find(p => p !== pid) ?? ''; }

  private _neighbors(r: number, c: number): [number, number][] {
    return ([-1,0,1,0] as number[]).map((_, i) => {
      const offsets = [[-1,0],[1,0],[0,-1],[0,1]];
      return [r + offsets[i][0], c + offsets[i][1]] as [number, number];
    }).filter(([nr, nc]) => nr >= 0 && nr < this.size && nc >= 0 && nc < this.size);
  }

  private _group(r: number, c: number): [Set<string>, Set<string>] {
    const color = this.board[r][c];
    if (!color) return [new Set(), new Set()];
    const visited = new Set<string>(), liberties = new Set<string>();
    const stack: [number, number][] = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const key = `${cr},${cc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      for (const [nr, nc] of this._neighbors(cr, cc)) {
        if (this.board[nr][nc] === color) stack.push([nr, nc]);
        else if (this.board[nr][nc] === null) liberties.add(`${nr},${nc}`);
      }
    }
    return [visited, liberties];
  }

  private _removeDead(color: string): number {
    let removed = 0;
    const checked = new Set<string>();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const key = `${r},${c}`;
        if (this.board[r][c] === color && !checked.has(key)) {
          const [grp, libs] = this._group(r, c);
          for (const k of grp) checked.add(k);
          if (!libs.size) {
            for (const k of grp) {
              const [gr, gc] = k.split(',').map(Number);
              this.board[gr][gc] = null; removed++;
            }
          }
        }
      }
    }
    return removed;
  }

  private _boardStr(): string { return JSON.stringify(this.board); }
  private _copyBoard(): (string | null)[][] { return this.board.map(row => [...row]); }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData['pass']) return true;
    const r = moveData['row'] as number, c = moveData['col'] as number;
    if (r == null || !(r >= 0 && r < this.size && c >= 0 && c < this.size)) return false;
    if (this.board[r][c] !== null) return false;
    const saved = this._copyBoard();
    this.board[r][c] = playerId;
    const opp = this._opponent(playerId);
    this._removeDead(opp);
    const [, libs] = this._group(r, c);
    const boardStr = this._boardStr();
    this.board = saved;
    if (this._prevBoards.has(boardStr)) return false;
    if (!libs.size) {
      this.board[r][c] = playerId;
      this._removeDead(opp);
      const [, libs2] = this._group(r, c);
      this.board = saved;
      if (!libs2.size) return false;
    }
    return true;
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    if (moveData['pass']) {
      this._passes++;
    } else {
      this._passes = 0;
      const r = moveData['row'] as number, c = moveData['col'] as number;
      this._prevBoards.add(this._boardStr());
      this.board[r][c] = playerId;
      const captured = this._removeDead(this._opponent(playerId));
      this._captures[playerId] = (this._captures[playerId] ?? 0) + captured;
    }
    if (this._passes >= 2) { this._over = true; this._winner = this._scoreWinner(); }
    this._turnIdx = 1 - this._turnIdx;
  }

  private _scoreWinner(): string {
    const scores = { ...this._captures };
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        if (this.board[r][c]) scores[this.board[r][c]!] = (scores[this.board[r][c]!] ?? 0) + 1;
    scores[this.players[1]] = (scores[this.players[1]] ?? 0) + 6.5;
    return this.players.reduce((best, p) => ((scores[p] ?? 0) > (scores[best] ?? 0) ? p : best), this.players[0]);
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const [p0, p1] = [this.players[0] ?? 'black', this.players[1] ?? 'white'];
    const syms: Record<string, string> = { [p0]: 'B', [p1]: 'W' };
    const lines = [t('go.title', { size: this.size, captures: JSON.stringify(this._captures) })];
    for (const row of this.board) lines.push(row.map(c => (c ? syms[c] ?? '?' : '.')).join(' '));
    return lines.join('\n');
  }

  getState(_perspective?: string): Record<string, unknown> {
    return { board: this.board, turn: this.currentTurn(), captures: { ...this._captures }, players: this.players };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === 'pass') return { pass: true };
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
      'Place stones to surround territory on a 9×9 board. Ko rule enforced.',
      'Higher score (territory + captures) wins.',
      'Move: <row> <col>   e.g. "3 4"   or   "pass"',
    ];
  }
}
