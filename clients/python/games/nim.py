from games.base import BaseGame
from typing import List, Optional
from framework.i18n import t


class Nim(BaseGame):
    min_players = 2
    max_players = 6

    def __init__(self, piles: Optional[List[int]] = None):
        self.piles = list(piles) if piles else [3, 5, 7]
        self.players: List[str] = []
        self._turn_idx = 0

    def start(self, players):
        self.players = players
        self._turn_idx = 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id, move_data):
        if player_id != self.current_turn():
            return False
        pile = move_data.get('pile')
        count = move_data.get('count')
        if pile is None or count is None:
            return False
        if not (0 <= pile < len(self.piles)):
            return False
        return 1 <= count <= self.piles[pile]

    def apply_move(self, player_id, move_data):
        self.piles[move_data['pile']] -= move_data['count']
        self._turn_idx = (self._turn_idx + 1) % len(self.players)

    def is_over(self):
        if all(p == 0 for p in self.piles):
            last = (self._turn_idx - 1) % len(self.players)
            return True, self.players[last]
        return False, None

    def render(self, perspective=None):
        lines = [t('nim.title')]
        for i, p in enumerate(self.piles):
            lines.append(t('nim.pile', i=i, bar='I' * p, count=p))
        lines.append(t('nim.turn', player=self.current_turn()))
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        return {'piles': self.piles[:], 'turn': self.current_turn(),
                'players': self.players}
