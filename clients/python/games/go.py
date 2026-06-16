from games.base import BaseGame
from framework.i18n import t
from typing import Optional, List


class Go(BaseGame):
    min_players = max_players = 2

    def __init__(self, size=9):
        self.size = size
        self.board = [[None] * size for _ in range(size)]
        self.players = []
        self._turn_idx = 0
        self._captures = {}
        self._prev_boards = set()
        self._passes = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players
        self._captures = {p: 0 for p in players}

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _opponent(self, pid):
        return next(p for p in self.players if p != pid)

    def _neighbors(self, r, c):
        return [(r + dr, c + dc) for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                if 0 <= r + dr < self.size and 0 <= c + dc < self.size]

    def _group(self, r, c):
        color = self.board[r][c]
        if not color:
            return set(), set()
        visited, liberties = set(), set()
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            if (cr, cc) in visited:
                continue
            visited.add((cr, cc))
            for nr, nc in self._neighbors(cr, cc):
                if self.board[nr][nc] == color:
                    stack.append((nr, nc))
                elif self.board[nr][nc] is None:
                    liberties.add((nr, nc))
        return visited, liberties

    def _remove_dead(self, color):
        removed = 0
        checked = set()
        for r in range(self.size):
            for c in range(self.size):
                if self.board[r][c] == color and (r, c) not in checked:
                    grp, libs = self._group(r, c)
                    checked |= grp
                    if not libs:
                        for gr, gc in grp:
                            self.board[gr][gc] = None
                        removed += len(grp)
        return removed

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        if move_data.get('pass'):
            return True
        r, c = move_data.get('row'), move_data.get('col')
        if r is None or not (0 <= r < self.size and 0 <= c < self.size):
            return False
        if self.board[r][c] is not None:
            return False
        # Try move to check ko and suicide
        saved = [row[:] for row in self.board]
        self.board[r][c] = player_id
        opp = self._opponent(player_id)
        self._remove_dead(opp)
        _, libs = self._group(r, c)
        board_str = str(self.board)
        self.board = saved
        if board_str in self._prev_boards:
            return False
        if not libs:
            # Check if capture makes it valid
            self.board[r][c] = player_id
            self._remove_dead(opp)
            _, libs2 = self._group(r, c)
            self.board = saved
            if not libs2:
                return False
        return True

    def apply_move(self, player_id, move_data):
        if move_data.get('pass'):
            self._passes += 1
        else:
            self._passes = 0
            r, c = move_data['row'], move_data['col']
            self._prev_boards.add(str([row[:] for row in self.board]))
            self.board[r][c] = player_id
            opp = self._opponent(player_id)
            captured = self._remove_dead(opp)
            self._captures[player_id] = self._captures.get(player_id, 0) + captured
        if self._passes >= 2:
            self._over = True
            self._winner = self._score_winner()
        self._turn_idx = 1 - self._turn_idx

    def _score_winner(self):
        scores = {p: self._captures.get(p, 0) for p in self.players}
        for r in range(self.size):
            for c in range(self.size):
                if self.board[r][c]:
                    scores[self.board[r][c]] += 1
        scores[self.players[1]] += 6.5  # komi
        return max(scores, key=scores.get)

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        p0 = self.players[0] if self.players else 'black'
        p1 = self.players[1] if len(self.players) > 1 else 'white'
        syms = {None: '.', p0: 'B', p1: 'W'}
        lines = [t('go.title', size=self.size, captures=self._captures)]
        for row in self.board:
            lines.append(' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective=None) -> dict:
        return {
            'board': [row[:] for row in self.board],
            'turn': self.current_turn(),
            'players': self.players,
            'captures': dict(self._captures),
            'passes': self._passes,
        }

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        if 'captures' in data:
            self._captures = dict(data['captures'])
        if 'passes' in data:
            self._passes = data['passes']

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.lower() == 'pass':
            return {'pass': True}
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'row': int(parts[0]), 'col': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Place stones to surround territory on a 9×9 board. Ko rule enforced.',
            'Higher score (territory + captures) wins.',
            'Move: <row> <col>   e.g. "3 4"   or   "pass"',
        ]
