from games.base import BaseGame
from framework.i18n import t

SHIP_SIZES = [5, 4, 3, 3, 2]
GRID = 10


class Battleship(BaseGame):
    min_players = max_players = 2

    def __init__(self):
        self.players = []
        self._phase = 'place'
        self._ships = {}
        self._placed = {}
        self._shots = {}
        self._turn_idx = 0
        self._place_turn = 0

    def start(self, players):
        self.players = players
        self._turn_idx = 0
        self._place_turn = 0
        for p in players:
            self._ships[p] = []
            self._placed[p] = 0
            self._shots[p] = {}

    def current_turn(self):
        if self._phase == 'place':
            return self.players[self._place_turn % len(self.players)]
        return self.players[self._turn_idx]

    def validate_move(self, player_id, move_data):
        if player_id != self.current_turn():
            return False
        if self._phase == 'place':
            pl = move_data.get('place')
            if not pl:
                return False
            idx = self._placed[player_id]
            if idx >= len(SHIP_SIZES):
                return False
            return self._can_place(player_id, idx, pl['row'], pl['col'], pl['horiz'])
        else:
            sh = move_data.get('shot')
            if not sh:
                return False
            key = (sh['row'], sh['col'])
            return (0 <= sh['row'] < GRID and 0 <= sh['col'] < GRID and
                    key not in self._shots[player_id])

    def _can_place(self, pid, ship_idx, r, c, horiz):
        size = SHIP_SIZES[ship_idx]
        cells = [(r, c + i) if horiz else (r + i, c) for i in range(size)]
        if any(not (0 <= cr < GRID and 0 <= cc < GRID) for cr, cc in cells):
            return False
        occupied = {cell for s in self._ships[pid] for cell in s}
        return not any(cell in occupied for cell in cells)

    def apply_move(self, player_id, move_data):
        if self._phase == 'place':
            pl = move_data['place']
            idx = self._placed[player_id]
            size = SHIP_SIZES[idx]
            cells = set(
                (pl['row'], pl['col'] + i) if pl['horiz'] else (pl['row'] + i, pl['col'])
                for i in range(size)
            )
            self._ships[player_id].append(cells)
            self._placed[player_id] += 1
            self._place_turn += 1
            if all(self._placed[p] == len(SHIP_SIZES) for p in self.players):
                self._phase = 'battle'
                self._turn_idx = 0
        else:
            sh = move_data['shot']
            key = (sh['row'], sh['col'])
            opp = self.players[1 - self.players.index(player_id)]
            hit = any(key in ship for ship in self._ships[opp])
            self._shots[player_id][key] = 'hit' if hit else 'miss'
            self._turn_idx = 1 - self._turn_idx

    def _all_sunk(self, pid, shooter):
        return all(ship <= self._shots[shooter].keys() for ship in self._ships[pid])

    def is_over(self):
        if self._phase != 'battle':
            return False, None
        for i, pid in enumerate(self.players):
            opp = self.players[1 - i]
            if self._all_sunk(pid, opp):
                return True, opp
        return False, None

    def render(self, perspective=None):
        if not perspective or perspective not in self.players:
            perspective = self.players[0] if self.players else None
        opp = next((p for p in self.players if p != perspective), None)
        lines = [t('battleship.title', player=perspective)]
        own_cells = {c for s in self._ships.get(perspective, []) for c in s}
        lines.append(t('battleship.own_board'))
        for r in range(GRID):
            row = '  '
            for c in range(GRID):
                key = (r, c)
                opp_shots = self._shots.get(opp, {})
                if key in opp_shots:
                    row += ('X' if opp_shots[key] == 'hit' else 'o') + ' '
                elif (r, c) in own_cells:
                    row += 'S '
                else:
                    row += '. '
            lines.append(row)
        if opp:
            lines.append(t('battleship.enemy_board', opp=opp))
            for r in range(GRID):
                row = '  '
                for c in range(GRID):
                    s = self._shots.get(perspective, {}).get((r, c))
                    row += ('X' if s == 'hit' else 'o' if s == 'miss' else '.') + ' '
                lines.append(row)
        return '\n'.join(lines)

    def get_state(self, perspective=None):
        opp = next((p for p in self.players if p != perspective), None)
        return {
            'phase': self._phase,
            'turn': self.current_turn(),
            'own_ships': [list(c) for s in self._ships.get(perspective, []) for c in s],
            'my_shots': {f'{r},{c}': v for (r, c), v in self._shots.get(perspective, {}).items()},
            'opp_shots': ({f'{r},{c}': v for (r, c), v in self._shots.get(opp, {}).items()}
                          if opp else {}),
        }
