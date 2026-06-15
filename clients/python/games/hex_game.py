from games.base import BaseGame
from framework.i18n import t

SIZE = 11


class Hex(BaseGame):
    min_players = max_players = 2

    def __init__(self):
        self.board = [[None] * SIZE for _ in range(SIZE)]
        self.players = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players  # [0]=black(top-bottom), [1]=white(left-right)

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _neighbors(self, r, c):
        return [(r + dr, c + dc)
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, 1), (1, -1)]
                if 0 <= r + dr < SIZE and 0 <= c + dc < SIZE]

    def _check_win(self, pid):
        if not self.players:
            return False
        if pid == self.players[0]:
            starts = [(0, c) for c in range(SIZE) if self.board[0][c] == pid]
            goal = lambda r, c: r == SIZE - 1
        else:
            starts = [(r, 0) for r in range(SIZE) if self.board[r][0] == pid]
            goal = lambda r, c: c == SIZE - 1
        visited = set()
        stack = list(starts)
        while stack:
            pos = stack.pop()
            if pos in visited:
                continue
            visited.add(pos)
            if goal(*pos):
                return True
            for nb in self._neighbors(*pos):
                if self.board[nb[0]][nb[1]] == pid and nb not in visited:
                    stack.append(nb)
        return False

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        r, c = move_data.get('row'), move_data.get('col')
        return (r is not None and c is not None and
                0 <= r < SIZE and 0 <= c < SIZE and
                self.board[r][c] is None)

    def apply_move(self, player_id, move_data):
        r, c = move_data['row'], move_data['col']
        self.board[r][c] = player_id
        if self._check_win(player_id):
            self._over = True
            self._winner = player_id
        else:
            self._turn_idx = 1 - self._turn_idx

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        p0 = self.players[0] if self.players else 'black'
        p1 = self.players[1] if len(self.players) > 1 else 'white'
        syms = {None: '.', p0: 'B', p1: 'W'}
        lines = [t('hex.title')]
        for i, row in enumerate(self.board):
            lines.append(' ' * i + ' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'board': self.board, 'turn': self.current_turn(),
                'players': self.players}
