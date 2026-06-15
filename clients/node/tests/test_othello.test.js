'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Othello } = require('../src/games/othello');

test('initial board setup', () => {
  const g = new Othello();
  g.start(['alice', 'bob']);
  // players[0]=alice=black, players[1]=bob=white
  assert.strictEqual(g.board[3][3], 'bob');
  assert.strictEqual(g.board[4][4], 'bob');
  assert.strictEqual(g.board[3][4], 'alice');
  assert.strictEqual(g.board[4][3], 'alice');
});

test('valid move flips pieces', () => {
  const g = new Othello();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { row: 2, col: 3 }));
  g.applyMove('alice', { row: 2, col: 3 });
  assert.strictEqual(g.board[2][3], 'alice');
  assert.strictEqual(g.board[3][3], 'alice');
});

test('invalid move rejected', () => {
  const g = new Othello();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('alice', { row: 0, col: 0 }));
});

test('wrong player rejected', () => {
  const g = new Othello();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('bob', { row: 2, col: 3 }));
});

test('render contains grid', () => {
  const g = new Othello();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('B') || out.includes('W'));
  assert.ok(out.includes('.'));
});

test('othello parseInput "3 4"', () => {
  const g = new Othello();
  const result = g.parseInput('3 4');
  assert.deepStrictEqual(result, { row: 3, col: 4 });
});

test('othello parseInput "pass"', () => {
  const g = new Othello();
  const result = g.parseInput('pass');
  assert.deepStrictEqual(result, { pass: true });
});

test('othello parseInput "PASS" case-insensitive', () => {
  const g = new Othello();
  const result = g.parseInput('PASS');
  assert.deepStrictEqual(result, { pass: true });
});

test('othello parseInput invalid returns null', () => {
  const g = new Othello();
  assert.strictEqual(g.parseInput('x y'), null);
  assert.strictEqual(g.parseInput(''), null);
});

test('othello getHelp returns array of length >= 2', () => {
  const g = new Othello();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
