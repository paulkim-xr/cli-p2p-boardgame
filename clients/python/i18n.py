import json
import os

_translations: dict = {}
_fallback: dict = {}
_locale: str = 'ko'

_LOCALES_DIR = os.path.join(os.path.dirname(__file__), 'locales')


def set_locale(locale: str) -> None:
    global _translations, _fallback, _locale
    _locale = locale
    _translations = _load(locale)
    if locale != 'en':
        _fallback = _load('en')


def _load(locale: str) -> dict:
    path = os.path.join(_LOCALES_DIR, f'{locale}.json')
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def t(key: str, **kwargs) -> str:
    text = _translations.get(key) or _fallback.get(key) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            return text
    return text


# Default locale loaded at import time so games/UI can call t() without init
set_locale('ko')
