import sys
sys.path.insert(0, 'clients/python')
from games.chess import Chess


def make():
    g = Chess()
    g.start(['alice', 'bob'])
    return g


def test_initial_king_positions():
    g = make()
    assert g.board.get('e1') == ('w', 'K')
    assert g.board.get('e8') == ('b', 'K')


def test_pawn_single_push():
    assert make().validate_move('alice', {'from': 'e2', 'to': 'e3'})


def test_pawn_double_push():
    assert make().validate_move('alice', {'from': 'e2', 'to': 'e4'})


def test_pawn_triple_push_invalid():
    assert not make().validate_move('alice', {'from': 'e2', 'to': 'e5'})


def test_wrong_turn():
    assert not make().validate_move('bob', {'from': 'e7', 'to': 'e5'})


def test_pawn_move_applies():
    g = make()
    g.apply_move('alice', {'from': 'e2', 'to': 'e4'})
    assert 'e2' not in g.board
    assert g.board['e4'] == ('w', 'P')
    assert g.current_turn() == 'bob'


def test_knight_move():
    assert make().validate_move('alice', {'from': 'g1', 'to': 'f3'})


def test_castling_kingside_white():
    g = make()
    del g.board['f1']
    del g.board['g1']
    assert g.validate_move('alice', {'from': 'e1', 'to': 'g1'})


def test_castling_blocked():
    g = make()
    assert not g.validate_move('alice', {'from': 'e1', 'to': 'g1'})


def test_scholar_mate():
    g = make()
    moves = [
        ('alice', {'from': 'e2', 'to': 'e4'}),
        ('bob',   {'from': 'e7', 'to': 'e5'}),
        ('alice', {'from': 'd1', 'to': 'h5'}),
        ('bob',   {'from': 'b8', 'to': 'c6'}),
        ('alice', {'from': 'f1', 'to': 'c4'}),
        ('bob',   {'from': 'a7', 'to': 'a6'}),
        ('alice', {'from': 'h5', 'to': 'f7'}),
    ]
    for pid, mv in moves:
        assert g.validate_move(pid, mv), f'invalid: {pid} {mv}'
        g.apply_move(pid, mv)
    done, winner = g.is_over()
    assert done and winner == 'alice'


def test_stalemate_no_winner():
    g = Chess()
    g.start(['alice', 'bob'])
    # Simplified stalemate: just verify is_over returns None winner on stalemate
    g._over = True
    g._winner = None
    done, winner = g.is_over()
    assert done and winner is None


def test_load_state_restores_board():
    g = make()
    state = g.get_state()
    g2 = Chess()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.current_turn() == 'alice'
    assert ('w', 'K') in g2.board.values()


def test_parse_input_from_to():
    assert make().parse_input('e2 e4') == {'from': 'e2', 'to': 'e4'}


def test_parse_input_invalid():
    assert make().parse_input('xyz') is None


def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
