import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

type Piece = [string, boolean] | null;

export class Checkers extends BaseGameImpl {
  board: Piece[][];
  private _turnIdx = 0;

  constructor() {
    super();
    this.board = Array.from({ length: 8 }, () => Array<Piece>(8).fill(null));
    this._initBoard();
  }

  private _initBoard(): void {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) this.board[r][c] = ['black', false];
          else if (r > 4) this.board[r][c] = ['red', false];
        }
      }
    }
  }

  start(players: string[]): void { this.players = players; this._turnIdx = 0; }
  currentTurn(): string | null { return this.players[this._turnIdx] ?? null; }
  private _opp(color: string): string { return color === 'red' ? 'black' : 'red'; }

  private _getMoves(color: string): [[number,number],[number,number]][] {
    const moves: [[number,number],[number,number]][] = [];
    const fwdDirs: [number,number][] = color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p[0] !== color) continue;
        const dirs: [number,number][] = p[1] ? [[-1,-1],[-1,1],[1,-1],[1,1]] : fwdDirs;
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.board[nr][nc] === null) {
            moves.push([[r, c], [nr, nc]]);
          }
        }
      }
    }
    return moves;
  }

  private _getJumps(color: string): [[number,number],[number,number],[number,number]][] {
    const jumps: [[number,number],[number,number],[number,number]][] = [];
    const fwdDirs: [number,number][] = color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
    const opp = this._opp(color);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p[0] !== color) continue;
        const dirs: [number,number][] = p[1] ? [[-1,-1],[-1,1],[1,-1],[1,1]] : fwdDirs;
        for (const [dr, dc] of dirs) {
          const mr = r + dr, mc = c + dc, lr = r + 2*dr, lc = c + 2*dc;
          if (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 &&
              this.board[mr][mc] && this.board[mr][mc]![0] === opp && this.board[lr][lc] === null) {
            jumps.push([[r,c],[mr,mc],[lr,lc]]);
          }
        }
      }
    }
    return jumps;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    const frm = moveData['from'] as number[], to = moveData['to'] as number[];
    if (!frm || !to || frm.length !== 2 || to.length !== 2) return false;
    const p = this.board[frm[0]][frm[1]];
    if (!p || p[0] !== playerId) return false;
    const jumps = this._getJumps(playerId);
    if (jumps.length) return jumps.some(j => j[0][0]===frm[0] && j[0][1]===frm[1] && j[2][0]===to[0] && j[2][1]===to[1]);
    return this._getMoves(playerId).some(m => m[0][0]===frm[0] && m[0][1]===frm[1] && m[1][0]===to[0] && m[1][1]===to[1]);
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    const frm = moveData['from'] as number[], to = moveData['to'] as number[];
    const piece = this.board[frm[0]][frm[1]]!;
    this.board[frm[0]][frm[1]] = null;
    const jumps = this._getJumps(playerId);
    const j = jumps.find(jj => jj[0][0]===frm[0] && jj[0][1]===frm[1] && jj[2][0]===to[0] && jj[2][1]===to[1]);
    if (j) this.board[j[1][0]][j[1][1]] = null;
    let isKing = piece[1];
    if ((playerId === 'red' && to[0] === 0) || (playerId === 'black' && to[0] === 7)) isKing = true;
    this.board[to[0]][to[1]] = [playerId, isKing];
    const opp = this._opp(playerId);
    const oppPieces = this.board.some(row => row.some(cell => cell && cell[0] === opp));
    if (!oppPieces || (!this._getJumps(opp).length && !this._getMoves(opp).length)) {
      this._over = true; this._winner = playerId;
    } else {
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const lookup: Record<string, string> = { 'null': '.', 'red,false': 'r', 'red,true': 'R', 'black,false': 'b', 'black,true': 'B' };
    const key = (cell: Piece) => cell ? `${cell[0]},${cell[1]}` : 'null';
    const lines = [t('checkers.title')];
    for (let i = 0; i < 8; i++) lines.push(`${i} ` + this.board[i].map(c => lookup[key(c)] ?? '.').join(' '));
    return lines.join('\n');
  }

  getState(_perspective?: string): Record<string, unknown> {
    return { board: this.board.map(row => row.map(c => c ? [...c] : null)), turn: this.currentTurn(), players: this.players };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj as Record<string, unknown>; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 4) {
      const nums = parts.map(Number);
      if (nums.every(n => !isNaN(n))) return { from: [nums[0], nums[1]], to: [nums[2], nums[3]] };
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Jump over opponent pieces to capture them. Multi-jump if possible.',
      'Reach the far end to become a king (can move backwards).',
      'Move: <fromRow> <fromCol> <toRow> <toCol>   e.g. "2 3 4 5"',
    ];
  }
}
