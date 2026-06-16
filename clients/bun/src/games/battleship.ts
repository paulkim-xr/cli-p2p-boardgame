import { BaseGameImpl } from './base';
import { t } from '../framework/i18n';

const SHIP_SIZES = [5, 4, 3, 3, 2];
const GRID = 10;

export class Battleship extends BaseGameImpl {
  private _phase: 'place' | 'battle' = 'place';
  private _ships: Record<string, Set<string>[]> = {};
  private _placed: Record<string, number> = {};
  private _shots: Record<string, Map<string, 'hit' | 'miss'>> = {};
  private _turnIdx = 0;
  private _placeTurn = 0;

  start(players: string[]): void {
    this.players = players;
    this._turnIdx = 0;
    this._placeTurn = 0;
    for (const p of players) {
      this._ships[p] = [];
      this._placed[p] = 0;
      this._shots[p] = new Map();
    }
  }

  currentTurn(): string | null {
    if (this._phase === 'place') return this.players[this._placeTurn % this.players.length] ?? null;
    return this.players[this._turnIdx] ?? null;
  }

  validateMove(playerId: string, moveData: Record<string, unknown>): boolean {
    if (playerId !== this.currentTurn()) return false;
    if (this._phase === 'place') {
      const pl = moveData['place'] as { row: number; col: number; horiz: boolean } | undefined;
      if (!pl) return false;
      const idx = this._placed[playerId];
      if (idx >= SHIP_SIZES.length) return false;
      return this._canPlace(playerId, idx, pl.row, pl.col, pl.horiz);
    } else {
      const sh = moveData['shot'] as { row: number; col: number } | undefined;
      if (!sh) return false;
      const key = `${sh.row},${sh.col}`;
      return sh.row >= 0 && sh.row < GRID && sh.col >= 0 && sh.col < GRID && !this._shots[playerId].has(key);
    }
  }

  private _canPlace(pid: string, shipIdx: number, r: number, c: number, horiz: boolean): boolean {
    const size = SHIP_SIZES[shipIdx];
    const cells: [number, number][] = [];
    for (let i = 0; i < size; i++) cells.push(horiz ? [r, c + i] : [r + i, c]);
    if (cells.some(([cr, cc]) => cr < 0 || cr >= GRID || cc < 0 || cc >= GRID)) return false;
    const occupied = new Set(this._ships[pid].flatMap(s => [...s]));
    return !cells.some(([cr, cc]) => occupied.has(`${cr},${cc}`));
  }

  applyMove(playerId: string, moveData: Record<string, unknown>): void {
    if (this._phase === 'place') {
      const pl = moveData['place'] as { row: number; col: number; horiz: boolean };
      const idx = this._placed[playerId];
      const size = SHIP_SIZES[idx];
      const cells = new Set<string>();
      for (let i = 0; i < size; i++) {
        const [r, c] = pl.horiz ? [pl.row, pl.col + i] : [pl.row + i, pl.col];
        cells.add(`${r},${c}`);
      }
      this._ships[playerId].push(cells);
      this._placed[playerId]++;
      this._placeTurn++;
      if (this.players.every(p => this._placed[p] === SHIP_SIZES.length)) {
        this._phase = 'battle'; this._turnIdx = 0;
      }
    } else {
      const sh = moveData['shot'] as { row: number; col: number };
      const key = `${sh.row},${sh.col}`;
      const opp = this.players[1 - this.players.indexOf(playerId)];
      const hit = this._ships[opp].some(ship => ship.has(key));
      this._shots[playerId].set(key, hit ? 'hit' : 'miss');
      this._turnIdx = 1 - this._turnIdx;
    }
  }

  private _allSunk(pid: string, shooter: string): boolean {
    return this._ships[pid].every(ship => [...ship].every(cell => this._shots[shooter].has(cell)));
  }

  isOver(): [boolean, string | null] {
    if (this._phase !== 'battle') return [false, null];
    for (let i = 0; i < this.players.length; i++) {
      const opp = this.players[1 - i];
      if (this._allSunk(this.players[i], opp)) return [true, opp];
    }
    return [false, null];
  }

  render(perspective?: string): string {
    if (!perspective || !this.players.includes(perspective)) perspective = this.players[0] ?? '';
    const opp = this.players.find(p => p !== perspective) ?? null;
    const lines = [t('battleship.title', { player: perspective })];
    const ownCells = new Set(this._ships[perspective]?.flatMap(s => [...s]) ?? []);
    lines.push(t('battleship.own_board'));
    for (let r = 0; r < GRID; r++) {
      let row = '  ';
      for (let c = 0; c < GRID; c++) {
        const key = `${r},${c}`;
        const oppShots = opp ? this._shots[opp] : new Map<string, 'hit' | 'miss'>();
        if (oppShots.has(key)) row += (oppShots.get(key) === 'hit' ? 'X' : 'o') + ' ';
        else if (ownCells.has(key)) row += 'S ';
        else row += '. ';
      }
      lines.push(row);
    }
    if (opp) {
      lines.push(t('battleship.enemy_board', { opp }));
      for (let r = 0; r < GRID; r++) {
        let row = '  ';
        for (let c = 0; c < GRID; c++) {
          const s = this._shots[perspective]?.get(`${r},${c}`);
          row += (s === 'hit' ? 'X' : s === 'miss' ? 'o' : '.') + ' ';
        }
        lines.push(row);
      }
    }
    return lines.join('\n');
  }

  getState(perspective?: string): Record<string, unknown> {
    const p = perspective ?? this.players[0] ?? '';
    const opp = this.players.find(pl => pl !== p) ?? null;
    const shotsObj = (m: Map<string, 'hit' | 'miss'>) => Object.fromEntries([...m]);
    return {
      phase: this._phase,
      turn: this.currentTurn(),
      ownShips: this._ships[p] ? this._ships[p].flatMap(s => [...s]) : [],
      myShots: shotsObj(this._shots[p] ?? new Map()),
      oppShots: opp ? shotsObj(this._shots[opp] ?? new Map()) : {},
    };
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj as Record<string, unknown>; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 3) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        return { place: { row: r, col: c, horiz: parts[2].toLowerCase() !== 'v' } };
      }
    }
    if (parts.length === 2) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        if (this._phase === 'place') return { place: { row: r, col: c, horiz: true } };
        return { shot: { row: r, col: c } };
      }
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Place ships secretly, then take turns calling coordinates to sink them.',
      'Place ship: <row> <col> <h|v>   e.g. "3 4 h"  (or "3 4 v" for vertical)',
      'Shoot:      <row> <col>          e.g. "3 4"',
    ];
  }
}
