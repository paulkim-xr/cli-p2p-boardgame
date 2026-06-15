from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json


class Nim(BaseGame):
    min_players = 2
    max_players = 6

    def __init__(self, piles: Optional[List[int]] = None):
        self.piles = list(piles) if piles else [3, 5, 7]
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if player_id != self.current_turn():
            return False
        pile = move_data.get('pile')
        count = move_data.get('count')
        if pile is None or count is None:
            return False
        if not (0 <= pile < len(self.piles)):
            return False
        return 1 <= count <= self.piles[pile]

    def apply_move(self, player_id: str, move_data: dict) -> None:
        self.piles[move_data['pile']] -= move_data['count']
        self._turn_idx = (self._turn_idx + 1) % len(self.players)

    def is_over(self):
        if all(p == 0 for p in self.piles):
            last = (self._turn_idx - 1) % len(self.players)
            return True, self.players[last]
        return False, None

    def render(self, perspective: Optional[str] = None) -> str:
        lines = [t('nim.title')]
        for i, p in enumerate(self.piles):
            lines.append(t('nim.pile', i=i, bar='I' * p, count=p))
        lines.append(t('nim.turn', player=self.current_turn()))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'piles': self.piles[:], 'turn': self.current_turn(),
                'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'piles' in data:
            self.piles = list(data['piles'])
        if 'players' in data:
            self.players = list(data['players'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith(('{', '[')):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'pile': int(parts[0]), 'count': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Take >=1 stone from exactly one pile each turn. Last to take wins.',
            'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
        ]
