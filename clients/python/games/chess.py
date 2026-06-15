from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t


class Chess(BaseGame):
    min_players = max_players = 2

    def __init__(self):
        self.board = {
            'a1': ('w', 'R'), 'b1': ('w', 'N'), 'c1': ('w', 'B'), 'd1': ('w', 'Q'),
            'e1': ('w', 'K'), 'f1': ('w', 'B'), 'g1': ('w', 'N'), 'h1': ('w', 'R'),
            **{f'{f}2': ('w', 'P') for f in 'abcdefgh'},
            **{f'{f}7': ('b', 'P') for f in 'abcdefgh'},
            'a8': ('b', 'R'), 'b8': ('b', 'N'), 'c8': ('b', 'B'), 'd8': ('b', 'Q'),
            'e8': ('b', 'K'), 'f8': ('b', 'B'), 'g8': ('b', 'N'), 'h8': ('b', 'R'),
        }
        self.players = []
        self._cmap = {}
        self._turn_idx = 0
        self._castle = {'w': {'K': True, 'Q': True}, 'b': {'K': True, 'Q': True}}
        self._en_passant = None
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players
        self._cmap = {players[0]: 'w', players[1]: 'b'}

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def _row(self, sq): return int(sq[1]) - 1
    def _col(self, sq): return ord(sq[0]) - ord('a')
    def _sq(self, r, c): return chr(ord('a') + c) + str(r + 1)
    def _ok(self, r, c): return 0 <= r < 8 and 0 <= c < 8

    def _color(self, sq):
        p = self.board.get(sq)
        return p[0] if p else None

    def _attacked(self, sq, by):
        r, c = self._row(sq), self._col(sq)
        pd = -1 if by == 'w' else 1
        for dc in [-1, 1]:
            pr, pc = r + pd, c + dc
            if self._ok(pr, pc) and self.board.get(self._sq(pr, pc)) == (by, 'P'):
                return True
        for dr, dc in [(-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)]:
            s = self._sq(r + dr, c + dc) if self._ok(r + dr, c + dc) else None
            if s and self.board.get(s) == (by, 'N'):
                return True
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == dc == 0:
                    continue
                s = self._sq(r + dr, c + dc) if self._ok(r + dr, c + dc) else None
                if s and self.board.get(s) == (by, 'K'):
                    return True
        for dirs, pts in [
            ([(0, 1), (0, -1), (1, 0), (-1, 0)], {'R', 'Q'}),
            ([(1, 1), (1, -1), (-1, 1), (-1, -1)], {'B', 'Q'}),
        ]:
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                while self._ok(nr, nc):
                    s = self._sq(nr, nc)
                    if s in self.board:
                        if self.board[s][0] == by and self.board[s][1] in pts:
                            return True
                        break
                    nr += dr
                    nc += dc
        return False

    def _king_sq(self, color):
        return next((s for s, p in self.board.items() if p == (color, 'K')), None)

    def _in_check(self, color):
        ks = self._king_sq(color)
        opp = 'b' if color == 'w' else 'w'
        return self._attacked(ks, opp) if ks else False

    def _pseudo_targets(self, frm):
        if frm not in self.board:
            return []
        color, piece = self.board[frm]
        r, c = self._row(frm), self._col(frm)
        res = []
        if piece == 'P':
            d = 1 if color == 'w' else -1
            fwd = self._sq(r + d, c)
            if self._ok(r + d, c) and fwd not in self.board:
                res.append(fwd)
                start = 1 if color == 'w' else 6
                fwd2 = self._sq(r + 2 * d, c)
                if r == start and fwd2 not in self.board:
                    res.append(fwd2)
            for dc in [-1, 1]:
                if self._ok(r + d, c + dc):
                    s = self._sq(r + d, c + dc)
                    if self._color(s) not in (None, color) or s == self._en_passant:
                        res.append(s)
        elif piece == 'N':
            for dr, dc in [(-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)]:
                if self._ok(r + dr, c + dc):
                    s = self._sq(r + dr, c + dc)
                    if self._color(s) != color:
                        res.append(s)
        elif piece in ('B', 'R', 'Q'):
            dirs = []
            if piece in ('B', 'Q'):
                dirs += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
            if piece in ('R', 'Q'):
                dirs += [(0, 1), (0, -1), (1, 0), (-1, 0)]
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                while self._ok(nr, nc):
                    s = self._sq(nr, nc)
                    if self._color(s) == color:
                        break
                    res.append(s)
                    if s in self.board:
                        break
                    nr += dr
                    nc += dc
        elif piece == 'K':
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == dc == 0:
                        continue
                    if self._ok(r + dr, c + dc):
                        s = self._sq(r + dr, c + dc)
                        if self._color(s) != color:
                            res.append(s)
            row_n = 1 if color == 'w' else 8
            opp = 'b' if color == 'w' else 'w'
            if self._castle[color]['K'] and not self._in_check(color):
                f, g = f'f{row_n}', f'g{row_n}'
                if f not in self.board and g not in self.board:
                    if not self._attacked(f, opp) and not self._attacked(g, opp):
                        res.append(g)
            if self._castle[color]['Q'] and not self._in_check(color):
                b2, c2, d2 = f'b{row_n}', f'c{row_n}', f'd{row_n}'
                if b2 not in self.board and c2 not in self.board and d2 not in self.board:
                    if not self._attacked(c2, opp) and not self._attacked(d2, opp):
                        res.append(c2)
        return res

    def _push(self, frm, to, promo='Q'):
        saved = {
            'board': dict(self.board),
            'castle': {c: dict(v) for c, v in self._castle.items()},
            'ep': self._en_passant,
        }
        color, piece = self.board.pop(frm)
        self._en_passant = None
        if piece == 'P' and to == saved['ep']:
            cap_r = self._row(to) + (-1 if color == 'w' else 1)
            self.board.pop(self._sq(cap_r, self._col(to)), None)
        if piece == 'P' and abs(self._row(to) - self._row(frm)) == 2:
            self._en_passant = self._sq(
                (self._row(frm) + self._row(to)) // 2, self._col(frm))
        if piece == 'K':
            self._castle[color] = {'K': False, 'Q': False}
            rn = self._row(frm) + 1
            if self._col(to) - self._col(frm) == 2:
                self.board[f'f{rn}'] = self.board.pop(f'h{rn}')
            elif self._col(to) - self._col(frm) == -2:
                self.board[f'd{rn}'] = self.board.pop(f'a{rn}')
        if piece == 'R':
            rn = 1 if color == 'w' else 8
            if frm == f'a{rn}':
                self._castle[color]['Q'] = False
            if frm == f'h{rn}':
                self._castle[color]['K'] = False
        if piece == 'P' and (self._row(to) == 7 or self._row(to) == 0):
            self.board[to] = (color, promo)
        else:
            self.board[to] = (color, piece)
        return saved

    def _pop(self, saved):
        self.board = saved['board']
        self._castle = saved['castle']
        self._en_passant = saved['ep']

    def _legal(self, frm, to, promo='Q'):
        if to not in self._pseudo_targets(frm):
            return False
        color = self.board[frm][0]
        s = self._push(frm, to, promo)
        ok = not self._in_check(color)
        self._pop(s)
        return ok

    def _all_legal(self, color):
        return [(f, t) for f in list(self.board)
                if self.board.get(f, (None,))[0] == color
                for t in self._pseudo_targets(f) if self._legal(f, t)]

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        frm, to = move_data.get('from', ''), move_data.get('to', '')
        if len(frm) != 2 or len(to) != 2:
            return False
        if frm not in self.board:
            return False
        if self.board[frm][0] != self._cmap.get(player_id):
            return False
        return self._legal(frm, to, move_data.get('promotion', 'Q'))

    def apply_move(self, player_id, move_data):
        self._push(move_data['from'], move_data['to'], move_data.get('promotion', 'Q'))
        self._turn_idx = 1 - self._turn_idx
        nxt_color = self._cmap[self.players[self._turn_idx]]
        if not self._all_legal(nxt_color):
            self._over = True
            self._winner = (self.players[1 - self._turn_idx]
                            if self._in_check(nxt_color) else None)

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective=None):
        lines = [t('chess.title'), t('chess.board_header')]
        for rank in range(7, -1, -1):
            row = str(rank + 1) + ' '
            for file in range(8):
                sq = self._sq(rank, file)
                p = self.board.get(sq)
                if p:
                    row += (p[1] if p[0] == 'w' else p[1].lower()) + ' '
                else:
                    row += '. '
            lines.append(row)
        lines.append(t('chess.turn', player=self.current_turn()))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {
            'board': {s: list(p) for s, p in self.board.items()},
            'turn': self.current_turn(),
            'players': self.players,
            'castle': self._castle,
            'en_passant': self._en_passant,
            'check': (self._in_check(self._cmap.get(self.current_turn(), 'w'))
                      if not self._over else False),
        }

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'board' in data:
            self.board = {sq: tuple(p) for sq, p in data['board'].items()}
        if 'players' in data:
            self.players = list(data['players'])
            if len(self.players) == 2:
                self._cmap = {self.players[0]: 'w', self.players[1]: 'b'}
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        if 'castle' in data:
            self._castle = data['castle']
        if 'en_passant' in data:
            self._en_passant = data['en_passant']

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            return {'from': parts[0], 'to': parts[1]}
        return None

    def get_help(self) -> List[str]:
        return [
            'Standard chess. Castling, en passant, and promotion all supported.',
            'Move: <from> <to>   e.g. "e2 e4"   castle: "e1 g1"',
        ]
