import sys
sys.path.insert(0, 'clients/python')
from games.battleship import Battleship, SHIP_SIZES


def full_setup(g):
    for i in range(len(SHIP_SIZES)):
        g.apply_move('alice', {'place': {'ship': i, 'row': i, 'col': 0, 'horiz': True}})
        g.apply_move('bob',   {'place': {'ship': i, 'row': i, 'col': 0, 'horiz': True}})


def make_placed():
    g = Battleship()
    g.start(['alice', 'bob'])
    full_setup(g)
    return g


def test_placement_phase():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g._phase == 'place'


def test_valid_placement():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.validate_move('alice', {'place': {'ship': 0, 'row': 0, 'col': 0, 'horiz': True}})


def test_invalid_placement_out_of_bounds():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert not g.validate_move('alice', {'place': {'ship': 0, 'row': 0, 'col': 7, 'horiz': True}})


def test_transition_to_battle():
    g = Battleship()
    g.start(['alice', 'bob'])
    full_setup(g)
    assert g._phase == 'battle'


def test_shot_hit():
    g = Battleship()
    g.start(['alice', 'bob'])
    full_setup(g)
    g.apply_move('alice', {'shot': {'row': 0, 'col': 0}})
    assert g._shots['alice'][(0, 0)] == 'hit'


def test_shot_miss():
    g = Battleship()
    g.start(['alice', 'bob'])
    full_setup(g)
    g.apply_move('alice', {'shot': {'row': 9, 'col': 9}})
    assert g._shots['alice'][(9, 9)] == 'miss'


def test_game_over_all_sunk():
    g = Battleship()
    g.start(['alice', 'bob'])
    full_setup(g)
    for ship_cells in g._ships['bob']:
        for cell in ship_cells:
            g._shots['alice'][cell] = 'hit'
    done, _ = g.is_over()
    assert done


def test_load_state_restores_phase():
    g = make_placed()
    state = g.get_state('alice')
    g2 = Battleship()
    g2.start(['alice', 'bob'])
    g2.load_state(state, 'alice')
    assert g2._phase == 'battle'


def test_parse_input_place_h():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('3 4 h') == {'place': {'row': 3, 'col': 4, 'horiz': True}}


def test_parse_input_place_v():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('3 4 v') == {'place': {'row': 3, 'col': 4, 'horiz': False}}


def test_parse_input_shot():
    g = Battleship()
    g.start(['alice', 'bob'])
    g._phase = 'battle'
    assert g.parse_input('5 6') == {'shot': {'row': 5, 'col': 6}}


def test_parse_input_invalid():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('abc') is None


def test_get_help_nonempty():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert len(g.get_help()) >= 3
