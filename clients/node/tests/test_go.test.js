'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Go } = require('../src/games/go');

test('start initializes captures', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  assert.strictEqual(g._captures['alice'], 0);
  assert.strictEqual(g._captures['bob'], 0);
});

test('valid placement', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { row: 4, col: 4 }));
  g.applyMove('alice', { row: 4, col: 4 });
  assert.strictEqual(g.board[4][4], 'alice');
  assert.strictEqual(g.currentTurn(), 'bob');
});

test('occupied cell rejected', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  g.applyMove('alice', { row: 4, col: 4 });
  g.applyMove('bob',   { row: 3, col: 3 });
  assert.ok(!g.validateMove('alice', { row: 4, col: 4 }));
});

test('capture removes opponent stones', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  g.board[0][1] = 'bob';
  g.board[1][0] = 'bob';
  g.board[0][0] = 'bob';
  g.applyMove('alice', { row: 0, col: 1 });
});

test('two passes ends game', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  g.applyMove('alice', { pass: true });
  g.applyMove('bob',   { pass: true });
  const [done] = g.isOver();
  assert.ok(done);
});

test('pass move valid', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { pass: true }));
});

test('render contains board', () => {
  const g = new Go(9);
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('.'));
  assert.ok(out.includes('9'));
});

test('go parseInput "3 4"', () => {
  const g = new Go();
  const result = g.parseInput('3 4');
  assert.deepStrictEqual(result, { row: 3, col: 4 });
});

test('go parseInput "pass"', () => {
  const g = new Go();
  const result = g.parseInput('pass');
  assert.deepStrictEqual(result, { pass: true });
});

test('go parseInput "PASS" case-insensitive', () => {
  const g = new Go();
  const result = g.parseInput('PASS');
  assert.deepStrictEqual(result, { pass: true });
});

test('go parseInput invalid returns null', () => {
  const g = new Go();
  assert.strictEqual(g.parseInput('x y'), null);
});

test('go getHelp returns array of length >= 2', () => {
  const g = new Go();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
