'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Checkers } = require('../src/games/checkers');

test('initial board has pieces', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  let reds = 0, blacks = 0;
  for (const row of g.board) {
    for (const c of row) {
      if (c && c[0] === 'red') reds++;
      if (c && c[0] === 'black') blacks++;
    }
  }
  assert.strictEqual(reds, 12);
  assert.strictEqual(blacks, 12);
});

test('red moves first', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  assert.strictEqual(g.currentTurn(), 'red');
});

test('valid move accepted', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  const moves = g._getMoves('red');
  assert.ok(moves.length > 0);
  const [[fr, fc], [tr, tc]] = moves[0];
  assert.ok(g.validateMove('red', { from: [fr, fc], to: [tr, tc] }));
});

test('invalid move rejected (wrong player)', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  const moves = g._getMoves('black');
  if (moves.length > 0) {
    const [[fr, fc], [tr, tc]] = moves[0];
    assert.ok(!g.validateMove('red', { from: [fr, fc], to: [tr, tc] }));
  }
});

test('king promotion on reaching far row', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  g.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  g.board[1][0] = ['red', false];
  g.board[0][0] = null;
  g.applyMove('red', { from: [1, 0], to: [0, 1] });
  assert.ok(g.board[0][1] && g.board[0][1][1] === true);
});

test('render shows pieces', () => {
  const g = new Checkers();
  g.start(['red', 'black']);
  const out = g.render();
  assert.ok(out.includes('r') || out.includes('b'));
});

test('checkers parseInput "2 3 4 5"', () => {
  const g = new Checkers();
  const result = g.parseInput('2 3 4 5');
  assert.deepStrictEqual(result, { from: [2, 3], to: [4, 5] });
});

test('checkers parseInput valid JSON', () => {
  const g = new Checkers();
  const result = g.parseInput('{"from":[2,3],"to":[4,5]}');
  assert.deepStrictEqual(result, { from: [2, 3], to: [4, 5] });
});

test('checkers parseInput invalid returns null', () => {
  const g = new Checkers();
  assert.strictEqual(g.parseInput('2 3'), null);
  assert.strictEqual(g.parseInput('abc'), null);
});

test('checkers getHelp returns array of length >= 2', () => {
  const g = new Checkers();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
