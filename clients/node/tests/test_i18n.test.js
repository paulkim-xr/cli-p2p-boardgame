'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { t, setLocale, detectLocale, _supportedLocales } = require('../src/framework/i18n');

test('english locale', () => {
  setLocale('en');
  assert.strictEqual(t('lobby.title'), 'P2P Board Game Hub');
});

test('korean locale', () => {
  setLocale('ko');
  assert.strictEqual(t('lobby.title'), 'P2P 보드게임 허브');
});

test('format substitution', () => {
  setLocale('en');
  assert.strictEqual(t('game.winner', { winner: 'alice' }), 'Winner: alice');
});

test('missing key returns key', () => {
  setLocale('en');
  assert.strictEqual(t('no.such.key'), 'no.such.key');
});

test('detectLocale returns supported locale', () => {
  const result = detectLocale();
  const supported = _supportedLocales();
  assert.ok(supported.has(result), `${result} not in supported locales`);
});

test('detect ko from LANG env', () => {
  const prev = process.env.LANG;
  process.env.LANG = 'ko_KR.UTF-8';
  delete process.env.LANGUAGE;
  delete process.env.LC_ALL;
  delete process.env.LC_MESSAGES;
  const r = detectLocale();
  if (prev === undefined) delete process.env.LANG;
  else process.env.LANG = prev;
  assert.strictEqual(r, 'ko');
});

test('fallback to en for unknown locale', () => {
  const prev = process.env.LANG;
  const prevLang = process.env.LANGUAGE;
  process.env.LANG = 'xx_XX.UTF-8';
  delete process.env.LANGUAGE;
  const r = detectLocale();
  if (prev === undefined) delete process.env.LANG;
  else process.env.LANG = prev;
  if (prevLang !== undefined) process.env.LANGUAGE = prevLang;
  assert.strictEqual(r, 'en');
});

test('nim title korean', () => {
  setLocale('ko');
  const { Nim } = require('../src/games/nim');
  const g = new Nim();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('님') || out.includes('Nim'));
  assert.ok(out.includes('더미') || out.includes('pile'));
});

test('nim title english', () => {
  setLocale('en');
  const { Nim } = require('../src/games/nim');
  const g = new Nim();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('Nim'));
  assert.ok(out.includes('pile'));
});
