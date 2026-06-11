import sys
sys.path.insert(0, 'clients/python')
from games.hex_game import Hex


def make():
    g = Hex()
    g.start(['black', 'white'])
    return g


def test_black_moves_first():
    assert make().current_turn() == 'black'


def test_valid_move():
    assert make().validate_move('black', {'row': 5, 'col': 5})


def test_occupied_invalid():
    g = make()
    g.apply_move('black', {'row': 5, 'col': 5})
    assert not g.validate_move('white', {'row': 5, 'col': 5})


def test_black_wins_full_column():
    g = make()
    for r in range(11):
        g.board[r][0] = 'black'
    assert g._check_win('black')
