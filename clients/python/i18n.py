import json
import os
import sys

_translations: dict = {}
_fallback: dict = {}
_locale: str = 'en'

_LOCALES_DIR = os.path.join(os.path.dirname(__file__), 'locales')


def set_locale(locale: str) -> None:
    global _translations, _fallback, _locale
    _locale = locale
    _translations = _load(locale)
    _fallback = _load('en') if locale != 'en' else {}


def _load(locale: str) -> dict:
    path = os.path.join(_LOCALES_DIR, f'{locale}.json')
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def _supported_locales() -> set:
    try:
        return {f[:-5] for f in os.listdir(_LOCALES_DIR) if f.endswith('.json')}
    except OSError:
        return {'en', 'ko'}


def _lang_from_code(code: str) -> str | None:
    """Extract a supported locale key from a locale code like 'ko_KR.UTF-8'."""
    if not code:
        return None
    supported = _supported_locales()
    # Try full code minus encoding: 'ko_KR'
    base = code.split('.')[0].split('@')[0]
    if base in supported:
        return base
    # Try language prefix only: 'ko'
    lang = base.split('_')[0].lower()
    if lang in supported:
        return lang
    return None


def detect_locale() -> str:
    """Detect the system locale and return the best matching supported key.

    Priority:
      1. LANGUAGE / LC_ALL / LC_MESSAGES / LANG env vars (Unix standard)
      2. Python locale.getdefaultlocale()
      3. Windows UI language via ctypes
      4. Fall back to 'en'
    """
    # 1. Environment variables
    for var in ('LANGUAGE', 'LC_ALL', 'LC_MESSAGES', 'LANG'):
        val = os.environ.get(var, '')
        if not val:
            continue
        # LANGUAGE can be colon-separated list; take first
        for candidate in val.split(':'):
            result = _lang_from_code(candidate)
            if result:
                return result

    # 2. Python locale module (getlocale() preferred; getdefaultlocale() deprecated in 3.11+)
    try:
        import locale as _locale_mod
        try:
            code = _locale_mod.getlocale()[0] or ''
        except Exception:
            code = (_locale_mod.getdefaultlocale()[0] or '')  # type: ignore[attr-defined]
        result = _lang_from_code(code)
        if result:
            return result
    except Exception:
        pass

    # 3. Windows: GetUserDefaultUILanguage
    if sys.platform == 'win32':
        try:
            import ctypes
            lang_id = ctypes.windll.kernel32.GetUserDefaultUILanguage()
            # Primary language ID (low 10 bits): 0x12=Korean 0x09=English
            _WIN_PRIMARY = {0x12: 'ko', 0x09: 'en'}
            primary = lang_id & 0x3FF
            if primary in _WIN_PRIMARY:
                result = _WIN_PRIMARY[primary]
                if result in _supported_locales():
                    return result
        except Exception:
            pass

    return 'en'


def t(key: str, **kwargs) -> str:
    text = _translations.get(key) or _fallback.get(key) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            return text
    return text


# Auto-detect at import time; overridable via set_locale() or --lang flag
set_locale(detect_locale())
