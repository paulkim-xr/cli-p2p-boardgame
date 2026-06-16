import sys
sys.path.insert(0, 'clients/python')
from games.mancala import Mancala


def make():
    g = Mancala()
    g.start(['alice', 'bob'])
    return g


def test_initial_seeds():
    g = make()
    assert all(g.pits['alice'][i] == 4 for i in range(6))
    assert g.store['alice'] == 0


def test_alice_moves_first():
    assert make().current_turn() == 'alice'


def test_valid_pit():
    assert make().validate_move('alice', {'pit': 3})


def test_empty_pit_invalid():
    g = make()
    g.pits['alice'][2] = 0
    assert not g.validate_move('alice', {'pit': 2})


def test_seeds_distributed():
    g = make()
    g.apply_move('alice', {'pit': 0})
    assert g.pits['alice'][0] == 0
    assert g.pits['alice'][1] == 5


def test_extra_turn_on_store_land():
    g = make()
    # pit 2: 4 seeds → land at pits 3,4,5,store → extra turn
    g.apply_move('alice', {'pit': 2})
    assert g.current_turn() == 'alice'


def test_game_over_empty_rows():
    g = make()
    g.pits['alice'] = [0] * 6
    g.pits['bob'] = [0] * 6
    done, _ = g.is_over()
    assert done


def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'pit': 2})
    state = g.get_state()
    g2 = Mancala()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.current_turn() == g.current_turn()


def test_parse_input_pit():
    assert make().parse_input('2') == {'pit': 2}


def test_parse_input_invalid():
    assert make().parse_input('abc') is None


def test_get_help_nonempty():
    assert len(make().get_help()) >= 3
