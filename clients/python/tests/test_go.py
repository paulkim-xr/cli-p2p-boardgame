import sys
sys.path.insert(0, 'clients/python')
from games.go import Go


def make(size=9):
    g = Go(size=size)
    g.start(['black', 'white'])
    return g


def test_black_moves_first():
    assert make().current_turn() == 'black'


def test_valid_move():
    assert make().validate_move('black', {'row': 3, 'col': 3})


def test_occupied_square_invalid():
    g = make()
    g.apply_move('black', {'row': 3, 'col': 3})
    assert not g.validate_move('white', {'row': 3, 'col': 3})


def test_capture_single_stone():
    g = make()
    g.board[1][1] = 'white'
    g.board[0][1] = 'black'
    g.board[1][0] = 'black'
    g.board[2][1] = 'black'
    g._turn_idx = 0
    g.apply_move('black', {'row': 1, 'col': 2})
    assert g.board[1][1] is None


def test_two_passes_ends_game():
    g = make()
    g.apply_move('black', {'pass': True})
    g.apply_move('white', {'pass': True})
    done, _ = g.is_over()
    assert done
