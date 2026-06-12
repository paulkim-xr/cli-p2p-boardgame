'use strict';
const { BaseGame } = require('./base');
const { t } = require('../i18n');

const SIZE = 9;
const DIRS = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };

class Quoridor extends BaseGame {
  constructor() {
    super();
    this.players = [];
    this.pos = {};
    this.wallsLeft = {};
    this._hWalls = new Set();
    this._vWalls = new Set();
    this._turnIdx = 0;
    this._over = false;
    this._winner = null;
  }

  start(players) {
    this.players = players;
    const n = players.length;
    const walls = n === 2 ? 10 : 5;
    const starts = [[0,4],[8,4],[4,0],[4,8]].slice(0, n);
    for (let i = 0; i < n; i++) {
      this.pos[players[i]] = starts[i];
      this.wallsLeft[players[i]] = walls;
    }
  }

  currentTurn() {
    return this.players[this._turnIdx] || null;
  }

  _goals(pid) {
    const idx = this.players.indexOf(pid);
    if (idx === 0) return ([r]) => r === 8;
    if (idx === 1) return ([r]) => r === 0;
    if (idx === 2) return ([, c]) => c === 8;
    return ([, c]) => c === 0;
  }

  _blocked(r, c, dr, dc) {
    if (dr === -1) {
      for (const dc2 of [-1, 0]) {
        if (c + dc2 >= 0 && c + dc2 < SIZE - 1 && this._hWalls.has(`${r-1},${c+dc2}`)) return true;
      }
    }
    if (dr === 1) {
      for (const dc2 of [-1, 0]) {
        if (c + dc2 >= 0 && c + dc2 < SIZE - 1 && this._hWalls.has(`${r},${c+dc2}`)) return true;
      }
    }
    if (dc === -1) {
      for (const dr2 of [-1, 0]) {
        if (r + dr2 >= 0 && r + dr2 < SIZE - 1 && this._vWalls.has(`${r+dr2},${c-1}`)) return true;
      }
    }
    if (dc === 1) {
      for (const dr2 of [-1, 0]) {
        if (r + dr2 >= 0 && r + dr2 < SIZE - 1 && this._vWalls.has(`${r+dr2},${c}`)) return true;
      }
    }
    return false;
  }

  _reachable(pid) {
    const goal = this._goals(pid);
    const start = this.pos[pid];
    const visited = new Set([`${start[0]},${start[1]}`]);
    const q = [[...start]];
    let head = 0;
    while (head < q.length) {
      const [r, c] = q[head++];
      if (goal([r, c])) return true;
      for (const [dir, [dr, dc]] of Object.entries(DIRS)) {
        const nr = r + dr, nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
            !visited.has(key) && !this._blocked(r, c, dr, dc)) {
          visited.add(key);
          q.push([nr, nc]);
        }
      }
    }
    return false;
  }

  validateMove(playerId, moveData) {
    if (this._over || playerId !== this.currentTurn()) return false;
    if (moveData.move !== undefined) {
      const d = moveData.move;
      if (!DIRS[d]) return false;
      const [dr, dc] = DIRS[d];
      const [r, c] = this.pos[playerId];
      const nr = r + dr, nc = c + dc;
      return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !this._blocked(r, c, dr, dc);
    }
    if (moveData.wall !== undefined) {
      const w = moveData.wall;
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

  applyMove(playerId, moveData) {
    if (moveData.move !== undefined) {
      const [dr, dc] = DIRS[moveData.move];
      const [r, c] = this.pos[playerId];
      this.pos[playerId] = [r + dr, c + dc];
      if (this._goals(playerId)(this.pos[playerId])) {
        this._over = true;
        this._winner = playerId;
        return;
      }
    } else {
      const { row: wr, col: wc, horiz } = moveData.wall;
      if (horiz) {
        this._hWalls.add(`${wr},${wc}`);
        this._hWalls.add(`${wr},${wc+1}`);
      } else {
        this._vWalls.add(`${wr},${wc}`);
        this._vWalls.add(`${wr+1},${wc}`);
      }
      this.wallsLeft[playerId]--;
    }
    this._turnIdx = (this._turnIdx + 1) % this.players.length;
  }

  isOver() {
    return [this._over, this._winner];
  }

  render(perspective) {
    const pidSyms = {};
    this.players.forEach((p, i) => { pidSyms[p] = String(i); });
    const wallsInfo = this.players.map(p =>
      t('quoridor.walls_entry', { player: p, n: this.wallsLeft[p] })
    ).join('  ');
    const lines = [t('quoridor.title', { walls: wallsInfo })];
    for (let r = 0; r < SIZE; r++) {
      let row = '  ';
      for (let c = 0; c < SIZE; c++) {
        const occ = this.players.find(p => this.pos[p][0] === r && this.pos[p][1] === c);
        row += pidSyms[occ] || '.';
        if (c < SIZE - 1) {
          row += (this._vWalls.has(`${r},${c}`) || this._vWalls.has(`${r-1},${c}`)) ? '|' : ' ';
        }
      }
      lines.push(row);
    }
    return lines.join('\n');
  }

  getState(perspective) {
    return {
      pos: Object.fromEntries(Object.entries(this.pos).map(([p, v]) => [p, [...v]])),
      wallsLeft: { ...this.wallsLeft },
      hWalls: [...this._hWalls],
      vWalls: [...this._vWalls],
      turn: this.currentTurn(),
      players: this.players,
    };
  }

  loadState(data) {
    if (!data) return;
    if (data.players) this.players = data.players;
    if (data.pos) this.pos = Object.fromEntries(Object.entries(data.pos).map(([p, v]) => [p, [...v]]));
    if (data.wallsLeft) this.wallsLeft = { ...data.wallsLeft };
    if (data.hWalls) this._hWalls = new Set(data.hWalls);
    if (data.vWalls) this._vWalls = new Set(data.vWalls);
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }
}

module.exports = { Quoridor };
