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


def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'pile': 0, 'count': 2})
    state = g.get_state()
    g2 = Nim()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.piles == g.piles
    assert g2.current_turn() == 'bob'


def test_parse_input_pile_count():
    assert make().parse_input('0 2') == {'pile': 0, 'count': 2}


def test_parse_input_invalid():
    assert make().parse_input('xyz') is None


def test_parse_input_json_fallback():
    assert make().parse_input('{"pile": 1, "count": 3}') == {'pile': 1, 'count': 3}


def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
