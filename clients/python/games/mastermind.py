from collections import Counter
from games.base import BaseGame


class Mastermind(BaseGame):
    MAX_GUESSES = 10

    def __init__(self):
        self.players = []
        self._code = None
        self._guesses = []   # list of (guess, exact, misplaced)
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players):
        self.players = players  # players[0]=maker, players[1]=breaker
        self._turn_idx = 0

    def current_turn(self):
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id, move_data):
        if self._over or player_id != self.current_turn():
            return False
        if self._code is None:
            code = move_data.get('code', [])
            return (len(code) == 4 and
                    all(isinstance(d, int) and 1 <= d <= 6 for d in code))
        else:
            guess = move_data.get('guess', [])
            return (len(guess) == 4 and
                    all(isinstance(d, int) and 1 <= d <= 6 for d in guess))

    def apply_move(self, player_id, move_data):
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

    def render(self, perspective=None):
        lines = ['마스터마인드 (숫자 4자리, 1-6)']
        for i, (g, e, m) in enumerate(self._guesses):
            lines.append(f'  {i+1:2}. {g}  정확={e} 위치오류={m}')
        remaining = self.MAX_GUESSES - len(self._guesses)
        if not self._over:
            lines.append(f'  남은 시도: {remaining}')
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        state = {'guesses': self._guesses, 'turn': self.current_turn(),
                 'players': self.players, 'over': self._over}
        if perspective == self.players[0] or self._over:
            state['code'] = self._code
        return state
