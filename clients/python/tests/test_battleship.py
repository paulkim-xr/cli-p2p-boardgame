import sys
sys.path.insert(0, 'clients/python')
from games.battleship import Battleship, SHIP_SIZES


def full_setup(g):
    for i in range(len(SHIP_SIZES)):
        g.apply_move('alice', {'place': {'ship': i, 'row': i, 'col': 0, 'horiz': True}})
        g.apply_move('bob',   {'place': {'ship': i, 'row': i, 'col': 0, 'horiz': True}})


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
