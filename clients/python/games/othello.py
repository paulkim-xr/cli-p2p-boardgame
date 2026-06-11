from games.base import BaseGame

SIZE = 8
DIRS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


class Othello(BaseGame):
    def __init__(self):
        self.board = [[None] * SIZE for _ in range(SIZE)]
        mid = SIZE // 2
        self.board[mid - 1][mid - 1] = 'white'
        self.board[mid][mid] = 'white'
        self.board[mid - 1][mid] = 'black'
        self.board[mid][mid - 1] = 'black'
        self.players = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players  # [0]=black by convention
        self._turn_idx = 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _opponent(self, pid):
        return self.players[1 - self.players.index(pid)]

    def _flips(self, pid, r, c):
        if self.board[r][c] is not None:
            return []
        opp = self._opponent(pid)
        all_flips = []
        for dr, dc in DIRS:
            line = []
            nr, nc = r + dr, c + dc
            while 0 <= nr < SIZE and 0 <= nc < SIZE and self.board[nr][nc] == opp:
                line.append((nr, nc))
                nr += dr
                nc += dc
            if line and 0 <= nr < SIZE and 0 <= nc < SIZE and self.board[nr][nc] == pid:
                all_flips.extend(line)
        return all_flips

    def _has_moves(self, pid):
        return any(self._flips(pid, r, c)
                   for r in range(SIZE) for c in range(SIZE))

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        if move_data.get('pass'):
            return not self._has_moves(player_id)
        r, c = move_data.get('row'), move_data.get('col')
        if r is None or c is None:
            return False
        return bool(self._flips(player_id, r, c))

    def apply_move(self, player_id, move_data):
        if not move_data.get('pass'):
            r, c = move_data['row'], move_data['col']
            flips = self._flips(player_id, r, c)
            self.board[r][c] = player_id
            for fr, fc in flips:
                self.board[fr][fc] = player_id
        self._turn_idx = 1 - self._turn_idx
        nxt = self.current_turn()
        if not self._has_moves(nxt):
            self._turn_idx = 1 - self._turn_idx
            if not self._has_moves(self.current_turn()):
                self._finish()

    def _finish(self):
        self._over = True
        counts = {p: sum(c == p for row in self.board for c in row)
                  for p in self.players}
        best = max(counts, key=counts.get)
        self._winner = best if counts[self.players[0]] != counts[self.players[1]] else None

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        p0 = self.players[0] if self.players else 'black'
        p1 = self.players[1] if len(self.players) > 1 else 'white'
        syms = {None: '.', p0: 'B', p1: 'W'}
        lines = ['Othello']
        lines.append('  ' + ' '.join(str(i) for i in range(SIZE)))
        for i, row in enumerate(self.board):
            lines.append(f'{i} ' + ' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'board': self.board, 'turn': self.current_turn(),
                'players': self.players}
