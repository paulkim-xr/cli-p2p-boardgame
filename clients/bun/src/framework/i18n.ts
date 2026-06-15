import enData from '../../locales/en.json';
import koData from '../../locales/ko.json';

type Translations = Record<string, string>;

const LOCALE_MAP: Record<string, Translations> = {
  en: enData as Translations,
  ko: koData as Translations,
};

let _translations: Translations = enData as Translations;
let _fallback: Translations = {};
let _locale = 'en';

function _langFromCode(code: string): string | null {
  if (!code) return null;
  const supported = new Set(Object.keys(LOCALE_MAP));
  const base = code.split('.')[0].split('@')[0];
  if (supported.has(base)) return base;
  const lang = base.split('_')[0].toLowerCase();
  if (supported.has(lang)) return lang;
  return null;
}

export function detectLocale(): string {
  for (const varName of ['LANGUAGE', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const val = process.env[varName] || '';
    if (!val) continue;
    for (const candidate of val.split(':')) {
      const r = _langFromCode(candidate);
      if (r) return r;
    }
  }
  if (process.platform === 'win32') {
    try {
      const proc = Bun.spawnSync(
        ['powershell', '-NoProfile', '-Command', '[System.Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName'],
        { timeout: 3000 }
      );
      const out = new TextDecoder().decode(proc.stdout).trim().toLowerCase();
      const r = _langFromCode(out);
      if (r) return r;
    } catch (_) {}
  } else {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const r = _langFromCode(locale);
      if (r) return r;
    } catch (_) {}
  }
  return 'en';
}

export function setLocale(locale: string): void {
  _locale = locale;
  _translations = LOCALE_MAP[locale] ?? (enData as Translations);
  _fallback = locale !== 'en' ? (enData as Translations) : {};
}

export function t(key: string, vars?: Record<string, unknown>): string {
  let text = _translations[key] || _fallback[key] || key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
  }
  return text;
}

setLocale(detectLocale());
