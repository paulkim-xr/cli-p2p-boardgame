import sys
sys.path.insert(0, 'clients/python')
import i18n


def test_korean_default():
    i18n.set_locale('ko')
    assert i18n.t('lobby.title') == 'P2P 보드게임 허브'


def test_english_locale():
    i18n.set_locale('en')
    assert i18n.t('lobby.title') == 'P2P Board Game Hub'


def test_format_substitution():
    i18n.set_locale('en')
    result = i18n.t('game.winner', winner='alice')
    assert result == 'Winner: alice'


def test_missing_key_returns_key():
    i18n.set_locale('en')
    assert i18n.t('no.such.key') == 'no.such.key'


def test_fallback_to_english():
    i18n.set_locale('ko')
    # All keys in ko.json exist; test that a hypothetical missing ko key falls back
    # We simulate by directly checking _fallback is populated
    assert i18n._fallback  # English fallback loaded when locale is ko


def test_nim_render_korean():
    i18n.set_locale('ko')
    from games.nim import Nim
    g = Nim()
    g.start(['alice', 'bob'])
    out = g.render()
    assert '님' in out
    assert '더미' in out


def test_nim_render_english():
    i18n.set_locale('en')
    from games.nim import Nim
    g = Nim()
    g.start(['alice', 'bob'])
    out = g.render()
    assert 'Nim' in out
    assert 'pile' in out
