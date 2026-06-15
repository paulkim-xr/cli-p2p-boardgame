from games.base import BaseGame
from collections import deque
from framework.i18n import t

SIZE = 9
DIRS = {'N': (-1, 0), 'S': (1, 0), 'E': (0, 1), 'W': (0, -1)}


class Quoridor(BaseGame):
    min_players = 2
    max_players = 4

    def __init__(self):
        self.players = []
        self.pos = {}
        self.walls_left = {}
        self._h_walls = set()
        self._v_walls = set()
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players
        n = len(players)
        walls = 10 if n == 2 else 5
        starts = [(0, 4), (8, 4), (4, 0), (4, 8)][:n]
        for i, p in enumerate(players):
            self.pos[p] = starts[i]
            self.walls_left[p] = walls

    def _goals(self, pid):
        idx = self.players.index(pid)
        if idx == 0: return lambda r, c: r == 8
        if idx == 1: return lambda r, c: r == 0
        if idx == 2: return lambda r, c: c == 8
        return lambda r, c: c == 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _blocked(self, r, c, dr, dc):
        if dr == -1:
            return any((r - 1, c + dc2) in self._h_walls
                       for dc2 in [-1, 0] if 0 <= c + dc2 < SIZE - 1)
        if dr == 1:
            return any((r, c + dc2) in self._h_walls
                       for dc2 in [-1, 0] if 0 <= c + dc2 < SIZE - 1)
        if dc == -1:
            return any((r + dr2, c - 1) in self._v_walls
                       for dr2 in [-1, 0] if 0 <= r + dr2 < SIZE - 1)
        if dc == 1:
            return any((r + dr2, c) in self._v_walls
                       for dr2 in [-1, 0] if 0 <= r + dr2 < SIZE - 1)
        return False

    def _reachable(self, pid):
        goal = self._goals(pid)
        start = self.pos[pid]
        visited = {start}
        q = deque([start])
        while q:
            r, c = q.popleft()
            if goal(r, c):
                return True
            for dr, dc in DIRS.values():
                nr, nc = r + dr, c + dc
                if (0 <= nr < SIZE and 0 <= nc < SIZE and
                        (nr, nc) not in visited and
                        not self._blocked(r, c, dr, dc)):
                    visited.add((nr, nc))
                    q.append((nr, nc))
        return False

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        if 'move' in move_data:
            d = move_data['move']
            if d not in DIRS:
                return False
            dr, dc = DIRS[d]
            r, c = self.pos[player_id]
            nr, nc = r + dr, c + dc
            return 0 <= nr < SIZE and 0 <= nc < SIZE and not self._blocked(r, c, dr, dc)
        if 'wall' in move_data:
            w = move_data['wall']
            if self.walls_left[player_id] <= 0:
                return False
            wr, wc, horiz = w['row'], w['col'], w['horiz']
            if not (0 <= wr < SIZE - 1 and 0 <= wc < SIZE - 1):
                return False
            if horiz:
                if (wr, wc) in self._h_walls or (wr, wc + 1) in self._h_walls:
                    return False
                self._h_walls.add((wr, wc))
                self._h_walls.add((wr, wc + 1))
                ok = all(self._reachable(p) for p in self.players)
                self._h_walls.discard((wr, wc))
                self._h_walls.discard((wr, wc + 1))
                return ok
            else:
                if (wr, wc) in self._v_walls or (wr + 1, wc) in self._v_walls:
                    return False
                self._v_walls.add((wr, wc))
                self._v_walls.add((wr + 1, wc))
                ok = all(self._reachable(p) for p in self.players)
                self._v_walls.discard((wr, wc))
                self._v_walls.discard((wr + 1, wc))
                return ok
        return False

    def apply_move(self, player_id, move_data):
        if 'move' in move_data:
            dr, dc = DIRS[move_data['move']]
            r, c = self.pos[player_id]
            self.pos[player_id] = (r + dr, c + dc)
            if self._goals(player_id)(*self.pos[player_id]):
                self._over = True
                self._winner = player_id
                return
        else:
            w = move_data['wall']
            wr, wc, horiz = w['row'], w['col'], w['horiz']
            if horiz:
                self._h_walls.add((wr, wc))
                self._h_walls.add((wr, wc + 1))
            else:
                self._v_walls.add((wr, wc))
                self._v_walls.add((wr + 1, wc))
            self.walls_left[player_id] -= 1
        self._turn_idx = (self._turn_idx + 1) % len(self.players)

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        pid_syms = {p: str(i) for i, p in enumerate(self.players)}
        walls_info = '  '.join(
            t('quoridor.walls_entry', player=p, n=self.walls_left[p])
            for p in self.players
        )
        lines = [t('quoridor.title', walls=walls_info)]
        for r in range(SIZE):
            row = '  '
            for c in range(SIZE):
                occupant = next((p for p, pos in self.pos.items() if pos == (r, c)), None)
                row += pid_syms.get(occupant, '.')
                if c < SIZE - 1:
                    row += '|' if ((r, c) in self._v_walls or
                                   (r - 1, c) in self._v_walls) else ' '
            lines.append(row)
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'pos': {p: list(v) for p, v in self.pos.items()},
                'walls_left': self.walls_left, 'turn': self.current_turn(),
                'players': self.players}
