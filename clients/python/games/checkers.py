from games.base import BaseGame


class Checkers(BaseGame):
    # board[r][c] = (color, is_king) or None
    # red moves toward row 0; black moves toward row 7
    def __init__(self):
        self.board = [[None] * 8 for _ in range(8)]
        self.players = []
        self._turn_idx = 0
        self._over = False
        self._winner = None
        self._init_board()

    def _init_board(self):
        for r in range(8):
            for c in range(8):
                if (r + c) % 2 == 1:
                    if r < 3:
                        self.board[r][c] = ('black', False)
                    elif r > 4:
                        self.board[r][c] = ('red', False)

    def start(self, players):
        self.players = players  # [0]=red, [1]=black

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _opponent(self, color):
        return 'black' if color == 'red' else 'red'

    def _get_moves(self, color):
        moves = []
        dirs = [(-1, -1), (-1, 1)] if color == 'red' else [(1, -1), (1, 1)]
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if not p or p[0] != color:
                    continue
                d = dirs if not p[1] else [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                for dr, dc in d:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 8 and 0 <= nc < 8 and self.board[nr][nc] is None:
                        moves.append(((r, c), (nr, nc)))
        return moves

    def _get_jumps(self, color):
        jumps = []
        opp = self._opponent(color)
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if not p or p[0] != color:
                    continue
                dirs = [(-1, -1), (-1, 1)] if color == 'red' else [(1, -1), (1, 1)]
                if p[1]:
                    dirs = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                for dr, dc in dirs:
                    mr, mc = r + dr, c + dc
                    lr, lc = r + 2 * dr, c + 2 * dc
                    if (0 <= lr < 8 and 0 <= lc < 8 and
                            self.board[mr][mc] and self.board[mr][mc][0] == opp and
                            self.board[lr][lc] is None):
                        jumps.append(((r, c), (mr, mc), (lr, lc)))
        return jumps

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        color = player_id
        frm = tuple(move_data.get('from', []))
        to = tuple(move_data.get('to', []))
        if len(frm) != 2 or len(to) != 2:
            return False
        p = self.board[frm[0]][frm[1]]
        if not p or p[0] != color:
            return False
        jumps = self._get_jumps(color)
        if jumps:
            return any(j[0] == frm and j[2] == to for j in jumps)
        return any(m[0] == frm and m[1] == to for m in self._get_moves(color))

    def apply_move(self, player_id, move_data):
        color = player_id
        frm = tuple(move_data['from'])
        to = tuple(move_data['to'])
        piece = self.board[frm[0]][frm[1]]
        self.board[frm[0]][frm[1]] = None
        jumps = self._get_jumps(color)
        jumped = next((j[1] for j in jumps if j[0] == frm and j[2] == to), None)
        if jumped:
            self.board[jumped[0]][jumped[1]] = None
        is_king = piece[1]
        if (color == 'red' and to[0] == 0) or (color == 'black' and to[0] == 7):
            is_king = True
        self.board[to[0]][to[1]] = (color, is_king)
        opp = self._opponent(color)
        opp_pieces = any(self.board[r][c] and self.board[r][c][0] == opp
                         for r in range(8) for c in range(8))
        if not opp_pieces or (not self._get_jumps(opp) and not self._get_moves(opp)):
            self._over = True
            self._winner = color
        else:
            self._turn_idx = 1 - self._turn_idx

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        syms = {None: '.', ('red', False): 'r', ('red', True): 'R',
                ('black', False): 'b', ('black', True): 'B'}
        lines = ['Checkers']
        for i, row in enumerate(self.board):
            lines.append(f'{i} ' + ' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'board': [[list(c) if c else None for c in r] for r in self.board],
                'turn': self.current_turn(), 'players': self.players}
