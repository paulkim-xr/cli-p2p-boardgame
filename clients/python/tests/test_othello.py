import sys
sys.path.insert(0, 'clients/python')
from games.othello import Othello


def make():
    g = Othello()
    g.start(['black', 'white'])
    return g


def test_initial_disc_count():
    g = make()
    flat = [c for row in g.board for c in row]
    assert flat.count('black') == 2
    assert flat.count('white') == 2


def test_black_moves_first():
    assert make().current_turn() == 'black'


def test_valid_opening_move():
    g = make()
    assert g.validate_move('black', {'row': 2, 'col': 3})


def test_invalid_move_no_flip():
    g = make()
    assert not g.validate_move('black', {'row': 0, 'col': 0})


def test_flip_on_move():
    g = make()
    g.apply_move('black', {'row': 2, 'col': 3})
    assert g.board[3][3] == 'black'


def test_game_ends_when_set():
    g = make()
    g._over = True
    g._winner = 'black'
    done, w = g.is_over()
    assert done and w == 'black'
