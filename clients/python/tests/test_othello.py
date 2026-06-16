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


def test_load_state_restores():
    g = make()
    g.apply_move('black', {'row': 2, 'col': 3})
    state = g.get_state()
    g2 = Othello()
    g2.start(['black', 'white'])
    g2.load_state(state)
    assert g2.board[2][3] == 'black'

def test_parse_input_row_col():
    assert make().parse_input('3 4') == {'row': 3, 'col': 4}

def test_parse_input_pass():
    assert make().parse_input('pass') == {'pass': True}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
