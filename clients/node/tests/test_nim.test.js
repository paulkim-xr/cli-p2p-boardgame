'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Nim } = require('../src/games/nim');

test('nim start sets players', () => {
  const g = new Nim();
  g.start(['alice', 'bob']);
  assert.strictEqual(g.currentTurn(), 'alice');
});

test('nim valid move', () => {
  const g = new Nim();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { pile: 0, count: 2 }));
});

test('nim invalid move wrong player', () => {
  const g = new Nim();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('bob', { pile: 0, count: 1 }));
});

test('nim apply move reduces pile', () => {
  const g = new Nim([3, 5, 7]);
  g.start(['alice', 'bob']);
  g.applyMove('alice', { pile: 0, count: 3 });
  assert.strictEqual(g.piles[0], 0);
  assert.strictEqual(g.currentTurn(), 'bob');
});

test('nim game over when all piles empty', () => {
  const g = new Nim([1]);
  g.start(['alice', 'bob']);
  g.applyMove('alice', { pile: 0, count: 1 });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('nim render contains pile info', () => {
  const g = new Nim([3, 5, 7]);
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('3'));
  assert.ok(out.includes('alice'));
});

test('nim getState', () => {
  const g = new Nim([3, 5, 7]);
  g.start(['alice', 'bob']);
  const s = g.getState();
  assert.deepStrictEqual(s.piles, [3, 5, 7]);
  assert.strictEqual(s.turn, 'alice');
});
