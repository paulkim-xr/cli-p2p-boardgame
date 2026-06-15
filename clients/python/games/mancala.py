from games.base import BaseGame
from framework.i18n import t
from typing import Optional, List

PITS = 6
SEEDS = 4


class Mancala(BaseGame):
    min_players = 2
    max_players = 4

    def __init__(self):
        self.players = []
        self.pits = {}
        self.store = {}
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players
        for p in players:
            self.pits[p] = [SEEDS] * PITS
            self.store[p] = 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        pit = move_data.get('pit')
        return isinstance(pit, int) and 0 <= pit < PITS and self.pits[player_id][pit] > 0

    def apply_move(self, player_id, move_data):
        pit = move_data['pit']
        seeds = self.pits[player_id][pit]
        self.pits[player_id][pit] = 0
        idx = self.players.index(player_id)
        order = []
        for offset in range(len(self.players)):
            p = self.players[(idx + offset) % len(self.players)]
            start = pit + 1 if offset == 0 else 0
            for i in range(start, PITS):
                order.append(('pit', p, i))
            if offset == 0:
                order.append(('store', player_id, 0))
        extra_turn = False
        last = None
        for cell in order[:seeds]:
            last = cell
            if cell[0] == 'pit':
                self.pits[cell[1]][cell[2]] += 1
            else:
                self.store[cell[1]] += 1
                if cell[1] == player_id:
                    extra_turn = True
        # capture: last seed in own empty pit (was 0, now 1)
        if (last and last[0] == 'pit' and last[1] == player_id and
                self.pits[player_id][last[2]] == 1):
            opp_idx = PITS - 1 - last[2]
            opp = self.players[(idx + 1) % len(self.players)]
            captured = self.pits[opp][opp_idx]
            if captured > 0:
                self.pits[opp][opp_idx] = 0
                self.store[player_id] += captured + 1
                self.pits[player_id][last[2]] = 0
        done, winner = self.is_over()
        if done:
            self._over = True
            self._winner = winner
        elif not extra_turn:
            self._turn_idx = (self._turn_idx + 1) % len(self.players)

    def is_over(self):
        if all(self.pits[p][i] == 0 for p in self.players for i in range(PITS)):
            scores = {p: self.store[p] + sum(self.pits[p]) for p in self.players}
            best = max(scores, key=scores.get)
            tied = [p for p in self.players if scores[p] == scores[best]]
            return True, (best if len(tied) == 1 else None)
        return False, None

    def render(self, perspective=None):
        lines = [t('mancala.title')]
        for p in self.players:
            lines.append(t('mancala.player_row', player=p, pits=self.pits[p], store=self.store[p]))
        lines.append(t('mancala.turn', player=self.current_turn()))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'pits': {p: self.pits[p][:] for p in self.players},
                'store': dict(self.store), 'turn': self.current_turn(),
                'players': self.players}

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'pits' in data:
            self.pits = {p: list(v) for p, v in data['pits'].items()}
        if 'store' in data:
            self.store = dict(data['store'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

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
        try:
            return {'pit': int(raw.split()[0])}
        except (ValueError, IndexError):
            return None

    def get_help(self) -> List[str]:
        return [
            'Board shows  [0]:4  [1]:4  [2]:4  [3]:4  [4]:4  [5]:4  store=N',
            'Pick a pit index 0–5 to sow its seeds counter-clockwise.',
            'Land in your store → free turn.  Land in your own empty pit → capture opposite.',
            'Move: <pit>   e.g. "2"',
        ]
