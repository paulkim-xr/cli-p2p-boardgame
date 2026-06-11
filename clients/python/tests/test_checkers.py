import sys
sys.path.insert(0, 'clients/python')
from games.checkers import Checkers


def make():
    g = Checkers()
    g.start(['red', 'black'])
    return g


def test_red_moves_first():
    assert make().current_turn() == 'red'


def test_initial_piece_count():
    g = make()
    reds = sum(1 for r in g.board for c in r if c and c[0] == 'red')
    blacks = sum(1 for r in g.board for c in r if c and c[0] == 'black')
    assert reds == 12 and blacks == 12


def test_valid_simple_moves_exist():
    g = make()
    moves = g._get_moves('red')
    assert len(moves) > 0


def test_invalid_move_empty_square():
    g = make()
    assert not g.validate_move('red', {'from': [0, 0], 'to': [1, 1]})


def test_simple_move_advances_piece():
    g = make()
    moves = g._get_moves('red')
    frm, to = moves[0]
    g.apply_move('red', {'from': list(frm), 'to': list(to)})
    assert g.board[to[0]][to[1]] is not None
    assert g.board[frm[0]][frm[1]] is None
    assert g.current_turn() == 'black'


def test_king_promotion():
    g = make()
    g.board = [[None] * 8 for _ in range(8)]
    g.board[1][0] = ('red', False)
    g.board[7][7] = ('black', False)
    g.apply_move('red', {'from': [1, 0], 'to': [0, 1]})
    assert g.board[0][1] == ('red', True)
