from dataclasses import dataclass, field
from typing import List


def _load_game_classes():
    from games.nim import Nim
    from games.mastermind import Mastermind
    from games.connect_four import ConnectFour
    from games.othello import Othello
    from games.checkers import Checkers
    from games.chess import Chess
    from games.battleship import Battleship
    from games.go import Go
    from games.hex_game import Hex
    from games.quoridor import Quoridor
    from games.mancala import Mancala
    return {
        'nim': Nim, 'mastermind': Mastermind, 'connect4': ConnectFour,
        'othello': Othello, 'checkers': Checkers, 'chess': Chess,
        'battleship': Battleship, 'go': Go, 'hex': Hex,
        'quoridor': Quoridor, 'mancala': Mancala,
    }


GAMES = {
    'nim':        {'name': 'Nim',          'min': 2, 'max': 6},
    'mastermind': {'name': 'Mastermind',   'min': 2, 'max': 2},
    'connect4':   {'name': 'Connect Four', 'min': 2, 'max': 2},
    'othello':    {'name': 'Othello',      'min': 2, 'max': 2},
    'checkers':   {'name': 'Checkers',     'min': 2, 'max': 2},
    'chess':      {'name': 'Chess',        'min': 2, 'max': 2},
    'battleship': {'name': 'Battleship',   'min': 2, 'max': 2},
    'go':         {'name': 'Go',           'min': 2, 'max': 2},
    'hex':        {'name': 'Hex',          'min': 2, 'max': 2},
    'quoridor':   {'name': 'Quoridor',     'min': 2, 'max': 4},
    'mancala':    {'name': 'Mancala',      'min': 2, 'max': 4},
}


@dataclass
class Session:
    name: str
    game_id: str
    host_ip: str
    port: int
    players: List[str] = field(default_factory=list)
    options: dict = field(default_factory=dict)

    @property
    def max_players(self):
        return GAMES.get(self.game_id, {}).get('max', 2)

    def to_beacon(self):
        return {
            'session': self.name,
            'game': self.game_id,
            'players': len(self.players),
            'max': self.max_players,
        }
