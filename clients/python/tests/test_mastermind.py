import sys
sys.path.insert(0, 'clients/python')
from games.mastermind import Mastermind


def make(code=None):
    g = Mastermind()
    g.start(['maker', 'breaker'])
    if code:
        g.apply_move('maker', {'code': code})
    return g


def make_with_code():
    return make(code=[1, 2, 3, 4])


def test_maker_sets_code():
    g = Mastermind()
    g.start(['maker', 'breaker'])
    assert g.current_turn() == 'maker'
    assert g.validate_move('maker', {'code': [1, 2, 3, 4]})


def test_invalid_code_wrong_digits():
    g = Mastermind()
    g.start(['maker', 'breaker'])
    assert not g.validate_move('maker', {'code': [1, 2, 3, 7]})


def test_after_code_set_breaker_guesses():
    g = make(code=[1, 2, 3, 4])
    assert g.current_turn() == 'breaker'


def test_score_all_exact():
    g = make(code=[1, 2, 3, 4])
    exact, mis = g._score([1, 2, 3, 4])
    assert exact == 4 and mis == 0


def test_score_partial():
    g = make(code=[1, 2, 3, 4])
    exact, mis = g._score([1, 3, 2, 4])
    assert exact == 2 and mis == 2


def test_score_none():
    g = make(code=[1, 2, 3, 4])
    exact, mis = g._score([5, 6, 5, 6])
    assert exact == 0 and mis == 0


def test_breaker_wins_exact_guess():
    g = make(code=[1, 2, 3, 4])
    g.apply_move('breaker', {'guess': [1, 2, 3, 4]})
    done, winner = g.is_over()
    assert done and winner == 'breaker'


def test_maker_wins_after_10_wrong_guesses():
    g = make(code=[1, 2, 3, 4])
    for _ in range(10):
        g.apply_move('breaker', {'guess': [5, 5, 5, 5]})
    done, winner = g.is_over()
    assert done and winner == 'maker'


def test_load_state_restores_guesses():
    g = make_with_code()
    g.apply_move('breaker', {'guess': [1, 2, 3, 4]})
    state = g.get_state('breaker')
    g2 = Mastermind()
    g2.start(['maker', 'breaker'])
    g2.load_state(state, 'breaker')
    assert len(g2._guesses) == 1

def test_parse_input_spaced():
    g = Mastermind()
    g.start(['a', 'b'])
    g._code = [1, 2, 3, 4]
    assert g.parse_input('1 2 3 4') == {'guess': [1, 2, 3, 4]}

def test_parse_input_compact():
    g = Mastermind()
    g.start(['a', 'b'])
    g._code = [1, 2, 3, 4]
    assert g.parse_input('5612') == {'guess': [5, 6, 1, 2]}

def test_parse_input_code_phase():
    g = Mastermind()
    g.start(['a', 'b'])
    assert g.parse_input('1 2 3 4') == {'code': [1, 2, 3, 4]}

def test_parse_input_invalid():
    g = Mastermind()
    g.start(['a', 'b'])
    assert g.parse_input('abc') is None

def test_get_help_nonempty():
    g = Mastermind()
    g.start(['a', 'b'])
    assert len(g.get_help()) >= 3
