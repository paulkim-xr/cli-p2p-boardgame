import sys
sys.path.insert(0, 'clients/python')
from games.connect_four import ConnectFour


def make():
    g = ConnectFour()
    g.start(['alice', 'bob'])
    return g


def test_valid_drop():
    assert make().validate_move('alice', {'col': 3})


def test_invalid_col_out_of_range():
    assert not make().validate_move('alice', {'col': 7})


def test_full_column_invalid():
    g = make()
    for _ in range(6):
        g.apply_move(g.current_turn(), {'col': 0})
    assert not g.validate_move(g.current_turn(), {'col': 0})


def test_piece_stacks():
    g = make()
    g.apply_move('alice', {'col': 3})
    g.apply_move('bob', {'col': 3})
    assert g.board[5][3] == 'alice'
    assert g.board[4][3] == 'bob'


def test_horizontal_win():
    g = make()
    for col in range(3):
        g.apply_move('alice', {'col': col})
        g.apply_move('bob', {'col': col})
    g.apply_move('alice', {'col': 3})
    done, winner = g.is_over()
    assert done and winner == 'alice'


def test_vertical_win():
    g = make()
    count = 0
    while not g.is_over()[0] and count < 20:
        if g.current_turn() == 'alice':
            g.apply_move('alice', {'col': 0})
        else:
            g.apply_move('bob', {'col': 1})
        count += 1
    done, winner = g.is_over()
    assert done and winner == 'alice'
