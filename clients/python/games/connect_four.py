from games.base import BaseGame

ROWS, COLS = 6, 7


class ConnectFour(BaseGame):
    def __init__(self):
        self.board = [[None] * COLS for _ in range(ROWS)]
        self.players = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players
        self._turn_idx = 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        col = move_data.get('col')
        return isinstance(col, int) and 0 <= col < COLS and self.board[0][col] is None

    def apply_move(self, player_id, move_data):
        col = move_data['col']
        for row in range(ROWS - 1, -1, -1):
            if self.board[row][col] is None:
                self.board[row][col] = player_id
                break
        if self._check_win(player_id):
            self._over = True
            self._winner = player_id
        elif all(self.board[0][c] is not None for c in range(COLS)):
            self._over = True
            self._winner = None
        else:
            self._turn_idx = 1 - self._turn_idx

    def _check_win(self, pid):
        b = self.board
        dirs = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for r in range(ROWS):
            for c in range(COLS):
                if b[r][c] != pid:
                    continue
                for dr, dc in dirs:
                    if all(0 <= r + dr * i < ROWS and 0 <= c + dc * i < COLS and
                           b[r + dr * i][c + dc * i] == pid for i in range(1, 4)):
                        return True
        return False

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        syms = {None: '.'}
        if self.players:
            syms[self.players[0]] = 'X'
            if len(self.players) > 1:
                syms[self.players[1]] = 'O'
        lines = ['Connect Four']
        for row in self.board:
            lines.append('  ' + ' '.join(syms.get(c, '?') for c in row))
        lines.append('  ' + ' '.join(str(i) for i in range(COLS)))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'board': self.board, 'turn': self.current_turn(),
                'players': self.players}
