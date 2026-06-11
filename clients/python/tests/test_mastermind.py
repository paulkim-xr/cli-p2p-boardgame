import sys
sys.path.insert(0, 'clients/python')
from games.mastermind import Mastermind


def make(code=None):
    g = Mastermind()
    g.start(['maker', 'breaker'])
    if code:
        g.apply_move('maker', {'code': code})
    return g


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
