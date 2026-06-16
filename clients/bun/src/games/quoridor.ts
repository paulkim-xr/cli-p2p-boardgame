import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

const SIZE = 9;
const DIRS: Record<string, [number, number]> = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

export class Quoridor extends BaseGameImpl {
  pos: Record<string, [number, number]> = {};
  wallsLeft: Record<string, number> = {};
  private _hWalls: Set<string> = new Set();
  private _vWalls: Set<string> = new Set();
  private _turnIdx = 0;

  start(players: string[]): void {
    this.players = players;
    const n = players.length;
    const walls = n === 2 ? 10 : 5;
    const starts: [number, number][] = [[0,4],[8,4],[4,0],[4,8]];
    for (let i = 0; i < n; i++) {
      this.pos[players[i]] = starts[i];
      this.wallsLeft[players[i]] = walls;
    }
  }

  currentTurn(): string | null { return this.players[this._turnIdx] ?? null; }

  private _goals(pid: string): (pos: [number, number]) => boolean {
    const idx = this.players.indexOf(pid);
    if (idx === 0) return ([r]) => r === 8;
    if (idx === 1) return ([r]) => r === 0;
    if (idx === 2) return ([, c]) => c === 8;
    return ([, c]) => c === 0;
  }

  private _blocked(r: number, c: number, dr: number, dc: number): boolean {
    if (dr === -1) { for (const dc2 of [-1, 0]) { if (c + dc2 >= 0 && c + dc2 < SIZE - 1 && this._hWalls.has(`${r-1},${c+dc2}`)) return true; } }
    if (dr === 1)  { for (const dc2 of [-1, 0]) { if (c + dc2 >= 0 && c + dc2 < SIZE - 1 && this._hWalls.has(`${r},${c+dc2}`)) return true; } }
    if (dc === -1) { for (const dr2 of [-1, 0]) { if (r + dr2 >= 0 && r + dr2 < SIZE - 1 && this._vWalls.has(`${r+dr2},${c-1}`)) return true; } }
    if (dc === 1)  { for (const dr2 of [-1, 0]) { if (r + dr2 >= 0 && r + dr2 < SIZE - 1 && this._vWalls.has(`${r+dr2},${c}`)) return true; } }
    return false;
  }

  private _reachable(pid: string): boolean {
    const goal = this._goals(pid);
    const start = this.pos[pid];
    const visited = new Set<string>([`${start[0]},${start[1]}`]);
    const q: [number, number][] = [[...start] as [number, number]];
    let head = 0;
    while (head < q.length) {
      const [r, c] = q[head++];
      if (goal([r, c])) return true;
      for (const [, [dr, dc]] of Object.entries(DIRS)) {
        const nr = r + dr, nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !visited.has(key) && !this._blocked(r, c, dr, dc)) {
          visited.add(key); q.push([nr, nc]);
        }
      }
    }
    return false;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData['move'] !== undefined) {
      const d = moveData['move'] as string;
      if (!DIRS[d]) return false;
      const [dr, dc] = DIRS[d];
      const [r, c] = this.pos[playerId];
      const nr = r + dr, nc = c + dc;
      return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !this._blocked(r, c, dr, dc);
    }
    if (moveData['wall'] !== undefined) {
      const w = moveData['wall'] as { row: number; col: number; horiz: boolean };
      if (this.wallsLeft[playerId] <= 0) return false;
      const { row: wr, col: wc, horiz } = w;
      if (!(wr >= 0 && wr < SIZE - 1 && wc >= 0 && wc < SIZE - 1)) return false;
      if (horiz) {
        if (this._hWalls.has(`${wr},${wc}`) || this._hWalls.has(`${wr},${wc+1}`)) return false;
        this._hWalls.add(`${wr},${wc}`); this._hWalls.add(`${wr},${wc+1}`);
        const ok = this.players.every(p => this._reachable(p));
        this._hWalls.delete(`${wr},${wc}`); this._hWalls.delete(`${wr},${wc+1}`);
        return ok;
      } else {
        if (this._vWalls.has(`${wr},${wc}`) || this._vWalls.has(`${wr+1},${wc}`)) return false;
        this._vWalls.add(`${wr},${wc}`); this._vWalls.add(`${wr+1},${wc}`);
        const ok = this.players.every(p => this._reachable(p));
        this._vWalls.delete(`${wr},${wc}`); this._vWalls.delete(`${wr+1},${wc}`);
        return ok;
      }
    }
    return false;
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    if (moveData['move'] !== undefined) {
      const [dr, dc] = DIRS[moveData['move'] as string];
      const [r, c] = this.pos[playerId];
      this.pos[playerId] = [r + dr, c + dc];
      if (this._goals(playerId)(this.pos[playerId])) { this._over = true; this._winner = playerId; return; }
    } else {
      const { row: wr, col: wc, horiz } = moveData['wall'] as { row: number; col: number; horiz: boolean };
      if (horiz) { this._hWalls.add(`${wr},${wc}`); this._hWalls.add(`${wr},${wc+1}`); }
      else { this._vWalls.add(`${wr},${wc}`); this._vWalls.add(`${wr+1},${wc}`); }
      this.wallsLeft[playerId]--;
    }
    this._turnIdx = (this._turnIdx + 1) % this.players.length;
  }

  isOver(): [boolean, string | null] { return [this._over, this._winner]; }

  render(_perspective?: string): string {
    const pidSyms: Record<string, string> = {};
    this.players.forEach((p, i) => { pidSyms[p] = String(i); });
    const wallsInfo = this.players.map(p => t('quoridor.walls_entry', { player: p, n: this.wallsLeft[p] })).join('  ');
    const lines = [t('quoridor.title', { walls: wallsInfo })];
    for (let r = 0; r < SIZE; r++) {
      let row = '  ';
      for (let c = 0; c < SIZE; c++) {
        const occ = this.players.find(p => this.pos[p][0] === r && this.pos[p][1] === c);
        row += pidSyms[occ ?? ''] ?? '.';
        if (c < SIZE - 1) row += (this._vWalls.has(`${r},${c}`) || this._vWalls.has(`${r-1},${c}`)) ? '|' : ' ';
      }
      lines.push(row);
    }
    return lines.join('\n');
  }

  getState(_perspective?: string): Record<string, unknown> {
    return {
      pos: Object.fromEntries(Object.entries(this.pos).map(([p, v]) => [p, [...v]])),
      wallsLeft: { ...this.wallsLeft },
      turn: this.currentTurn(),
      players: this.players,
    };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj as Record<string, unknown>; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1 && /^[nsewNSEW]$/.test(parts[0])) {
      return { move: parts[0].toUpperCase() };
    }
    if (parts.length === 3) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        return { wall: { row: r, col: c, horiz: parts[2].toLowerCase() === 'h' } };
      }
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Race your pawn to the opposite side of the 9×9 board.',
      'Place walls to block opponents, but never seal off someone completely.',
      'Move pawn: n / s / e / w   e.g. "s"',
      'Place wall: <row> <col> <h|v>   e.g. "3 2 h"  (or "3 2 v" for vertical)',
    ];
  }
}
