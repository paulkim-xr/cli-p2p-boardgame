import sys
sys.path.insert(0, 'clients/python')
from games.nim import Nim


def make():
    g = Nim()
    g.start(['alice', 'bob'])
    return g


def test_initial_state():
    g = make()
    assert g.piles == [3, 5, 7]
    assert g.current_turn() == 'alice'


def test_valid_move():
    assert make().validate_move('alice', {'pile': 0, 'count': 2})


def test_wrong_turn():
    assert not make().validate_move('bob', {'pile': 0, 'count': 1})


def test_count_exceeds_pile():
    assert not make().validate_move('alice', {'pile': 0, 'count': 5})


def test_apply_changes_pile_and_advances_turn():
    g = make()
    g.apply_move('alice', {'pile': 0, 'count': 2})
    assert g.piles[0] == 1
    assert g.current_turn() == 'bob'


def test_game_over_last_stone_wins():
    g = Nim(piles=[1, 0, 0])
    g.start(['alice', 'bob'])
    g.apply_move('alice', {'pile': 0, 'count': 1})
    done, winner = g.is_over()
    assert done and winner == 'alice'


def test_not_over_mid_game():
    done, _ = make().is_over()
    assert not done


def test_multiplayer_three_players():
    g = Nim()
    g.start(['a', 'b', 'c'])
    g.apply_move('a', {'pile': 0, 'count': 1})
    assert g.current_turn() == 'b'
    g.apply_move('b', {'pile': 1, 'count': 1})
    assert g.current_turn() == 'c'
