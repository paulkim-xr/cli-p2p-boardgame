import sys
import os
sys.path.insert(0, 'clients/python')
from framework import i18n


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


def test_detect_locale_returns_supported():
    result = i18n.detect_locale()
    assert result in i18n._supported_locales()


def test_detect_from_lang_env(monkeypatch):
    monkeypatch.setenv('LANG', 'ko_KR.UTF-8')
    monkeypatch.delenv('LANGUAGE', raising=False)
    monkeypatch.delenv('LC_ALL', raising=False)
    monkeypatch.delenv('LC_MESSAGES', raising=False)
    assert i18n.detect_locale() == 'ko'


def test_detect_english_from_lang_env(monkeypatch):
    monkeypatch.setenv('LANG', 'en_US.UTF-8')
    monkeypatch.delenv('LANGUAGE', raising=False)
    monkeypatch.delenv('LC_ALL', raising=False)
    monkeypatch.delenv('LC_MESSAGES', raising=False)
    assert i18n.detect_locale() == 'en'


def test_detect_language_env_list(monkeypatch):
    monkeypatch.setenv('LANGUAGE', 'ko_KR:en_US')
    assert i18n.detect_locale() == 'ko'


def test_detect_unknown_falls_back_to_en(monkeypatch):
    for var in ('LANGUAGE', 'LC_ALL', 'LC_MESSAGES', 'LANG'):
        monkeypatch.delenv(var, raising=False)
    # Patch getdefaultlocale to return unknown language
    import locale as _lc
    monkeypatch.setattr(_lc, 'getdefaultlocale', lambda: ('xx_XX', 'UTF-8'))
    # On non-Windows, should fall back to 'en'
    if sys.platform != 'win32':
        assert i18n.detect_locale() == 'en'
