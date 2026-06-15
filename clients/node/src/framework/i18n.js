'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

let _translations = {};
let _fallback = {};
let _locale = 'en';

function _load(locale) {
  try {
    const p = path.join(LOCALES_DIR, `${locale}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return {};
  }
}

function _supportedLocales() {
  try {
    return new Set(
      fs.readdirSync(LOCALES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.slice(0, -5))
    );
  } catch (_) {
    return new Set(['en', 'ko']);
  }
}

function _langFromCode(code) {
  if (!code) return null;
  const supported = _supportedLocales();
  const base = code.split('.')[0].split('@')[0];
  if (supported.has(base)) return base;
  const lang = base.split('_')[0].toLowerCase();
  if (supported.has(lang)) return lang;
  return null;
}

function detectLocale() {
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
      const { execSync } = require('child_process');
      const out = execSync('powershell -NoProfile -Command "[System.Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName"', { timeout: 3000 }).toString().trim().toLowerCase();
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

function setLocale(locale) {
  _locale = locale;
  _translations = _load(locale);
  _fallback = locale !== 'en' ? _load('en') : {};
}

function t(key, vars) {
  let text = _translations[key] || _fallback[key] || key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }
  return text;
}

setLocale(detectLocale());

module.exports = { t, setLocale, detectLocale, _supportedLocales };
