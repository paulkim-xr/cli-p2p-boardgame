from collections import Counter
from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json


class Mastermind(BaseGame):
    MAX_GUESSES = 10

    def __init__(self):
        self.players: List[str] = []
        self._code: Optional[List[int]] = None
        self._guesses: List = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._code = None
        self._guesses = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        if self._code is None:
            code = move_data.get('code', [])
            return len(code) == 4 and all(isinstance(d, int) and 1 <= d <= 6 for d in code)
        guess = move_data.get('guess', [])
        return len(guess) == 4 and all(isinstance(d, int) and 1 <= d <= 6 for d in guess)

    def apply_move(self, player_id: str, move_data: dict) -> None:
        if self._code is None:
            self._code = move_data['code']
            self._turn_idx = 1
        else:
            guess = move_data['guess']
            exact, mis = self._score(guess)
            self._guesses.append((guess, exact, mis))
            if exact == 4:
                self._over = True
                self._winner = self.players[1]
            elif len(self._guesses) >= self.MAX_GUESSES:
                self._over = True
                self._winner = self.players[0]

    def _score(self, guess):
        exact = sum(g == c for g, c in zip(guess, self._code))
        mis = sum((Counter(self._code) & Counter(guess)).values()) - exact
        return exact, mis

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        lines = [t('mastermind.title')]
        for i, (g, e, m) in enumerate(self._guesses):
            lines.append(t('mastermind.guess', n=i + 1, guess=g, exact=e, mis=m))
        if not self._over:
            lines.append(t('mastermind.remaining', n=self.MAX_GUESSES - len(self._guesses)))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        state = {'guesses': self._guesses, 'turn': self.current_turn(),
                 'players': self.players, 'over': self._over}
        if perspective == self.players[0] or self._over:
            state['code'] = self._code
        return state

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'guesses' in data:
            self._guesses = list(data['guesses'])
        if 'code' in data:
            self._code = data['code']
        if 'over' in data:
            self._over = bool(data['over'])
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
        digits = None
        if len(parts) == 4:
            try:
                digits = [int(p) for p in parts]
            except ValueError:
                return None
        elif len(parts) == 1 and len(parts[0]) == 4 and parts[0].isdigit():
            digits = [int(c) for c in parts[0]]
        if digits is not None and len(digits) == 4:
            return {'code': digits} if self._code is None else {'guess': digits}
        return None

    def get_help(self) -> List[str]:
        return [
            'Guess the secret 4-digit code (digits 1-6).',
            'B = right digit + right position.  W = right digit, wrong position.',
            'Move: <d1> <d2> <d3> <d4>   e.g. "1 2 3 4"  or  "1234"',
        ]
