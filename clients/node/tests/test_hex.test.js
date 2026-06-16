'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Hex } = require('../src/games/hex_game');

test('valid placement', () => {
  const g = new Hex();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { row: 5, col: 5 }));
  g.applyMove('alice', { row: 5, col: 5 });
  assert.strictEqual(g.board[5][5], 'alice');
  assert.strictEqual(g.currentTurn(), 'bob');
});

test('occupied cell rejected', () => {
  const g = new Hex();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { row: 0, col: 0 });
  g.applyMove('bob',   { row: 1, col: 1 });
  assert.ok(!g.validateMove('alice', { row: 0, col: 0 }));
});

test('alice wins top-bottom', () => {
  const g = new Hex();
  g.start(['alice', 'bob']);
  for (let r = 0; r < 11; r++) {
    g.board[r][0] = 'alice';
  }
  g.board[10][0] = null;
  g.applyMove('alice', { row: 10, col: 0 });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('render has hex shape', () => {
  const g = new Hex();
  g.start(['alice', 'bob']);
  const out = g.render();
  const lines = out.split('\n');
  assert.ok(lines.length > 5);
  assert.ok(lines[1].startsWith('.') || lines[1].startsWith(' '));
});

test('hex parseInput "3 4"', () => {
  const g = new Hex();
  const result = g.parseInput('3 4');
  assert.deepStrictEqual(result, { row: 3, col: 4 });
});

test('hex parseInput valid JSON', () => {
  const g = new Hex();
  const result = g.parseInput('{"row":5,"col":6}');
  assert.deepStrictEqual(result, { row: 5, col: 6 });
});

test('hex parseInput invalid returns null', () => {
  const g = new Hex();
  assert.strictEqual(g.parseInput('abc'), null);
  assert.strictEqual(g.parseInput('3'), null);
});

test('hex getHelp returns array of length >= 2', () => {
  const g = new Hex();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
