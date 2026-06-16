from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json

ROWS, COLS = 6, 7


class ConnectFour(BaseGame):
    def __init__(self):
        self.board = [[None] * COLS for _ in range(ROWS)]
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._turn_idx = 0
        self._over = False
        self._winner = None
        self.board = [[None] * COLS for _ in range(ROWS)]

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        col = move_data.get('col')
        return isinstance(col, int) and 0 <= col < COLS and self.board[0][col] is None

    def apply_move(self, player_id: str, move_data: dict) -> None:
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
        else:
            self._turn_idx = 1 - self._turn_idx

    def _check_win(self, pid: str) -> bool:
        dirs = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for r in range(ROWS):
            for c in range(COLS):
                if self.board[r][c] != pid:
                    continue
                for dr, dc in dirs:
                    if all(0 <= r + dr * i < ROWS and 0 <= c + dc * i < COLS and
                           self.board[r + dr * i][c + dc * i] == pid for i in range(1, 4)):
                        return True
        return False

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        syms = {None: '.'}
        if self.players:
            syms[self.players[0]] = 'X'
            if len(self.players) > 1:
                syms[self.players[1]] = 'O'
        lines = [t('connect4.title')]
        for row in self.board:
            lines.append('  ' + ' '.join(syms.get(c, '?') for c in row))
        lines.append('  ' + ' '.join(str(i) for i in range(COLS)))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'board': [row[:] for row in self.board],
                'turn': self.current_turn(), 'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        try:
            return {'col': int(raw.split()[0])}
        except (ValueError, IndexError):
            return None

    def get_help(self) -> List[str]:
        return [
            'Drop a piece into a column. First to connect 4 in a row wins.',
            'Move: <col>   e.g. "3"',
        ]
