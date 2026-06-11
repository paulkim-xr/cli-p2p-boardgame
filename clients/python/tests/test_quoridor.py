import sys
sys.path.insert(0, 'clients/python')
from games.quoridor import Quoridor


def make2():
    g = Quoridor()
    g.start(['alice', 'bob'])
    return g


def test_initial_positions():
    g = make2()
    assert g.pos['alice'] == (0, 4)
    assert g.pos['bob'] == (8, 4)


def test_alice_moves_first():
    assert make2().current_turn() == 'alice'


def test_valid_move_south():
    assert make2().validate_move('alice', {'move': 'S'})


def test_invalid_move_out_of_bounds():
    assert not make2().validate_move('alice', {'move': 'N'})


def test_move_advances_position():
    g = make2()
    g.apply_move('alice', {'move': 'S'})
    assert g.pos['alice'] == (1, 4)


def test_alice_wins_reaching_row_8():
    g = make2()
    for _ in range(20):
        if g.is_over()[0]:
            break
        turn = g.current_turn()
        direction = 'S' if turn == 'alice' else 'N'
        g.apply_move(turn, {'move': direction})
    done, winner = g.is_over()
    assert done and winner == 'alice'


def test_wall_placement():
    g = make2()
    assert g.validate_move('alice', {'wall': {'row': 2, 'col': 2, 'horiz': True}})
    g.apply_move('alice', {'wall': {'row': 2, 'col': 2, 'horiz': True}})
    assert g.walls_left['alice'] == 9
