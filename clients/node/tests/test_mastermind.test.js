'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Mastermind } = require('../src/games/mastermind');

test('start, maker sets code', () => {
  const g = new Mastermind();
  g.start(['alice', 'bob']);
  assert.strictEqual(g.currentTurn(), 'alice');
  assert.ok(g.validateMove('alice', { code: [1,2,3,4] }));
  g.applyMove('alice', { code: [1,2,3,4] });
  assert.strictEqual(g.currentTurn(), 'bob');
});

test('breaker guesses', () => {
  const g = new Mastermind();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { code: [1,2,3,4] });
  assert.ok(g.validateMove('bob', { guess: [1,2,3,4] }));
  g.applyMove('bob', { guess: [1,2,3,4] });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'bob');
});

test('score exact and misplaced', () => {
  const g = new Mastermind();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { code: [1,2,3,4] });
  g.applyMove('bob', { guess: [1,3,2,5] });
  const [guess, exact, mis] = g._guesses[0];
  assert.strictEqual(exact, 1);
  assert.strictEqual(mis, 2);
});

test('max guesses maker wins', () => {
  const g = new Mastermind();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { code: [1,2,3,4] });
  for (let i = 0; i < 10; i++) {
    g.applyMove('bob', { guess: [5,5,5,5] });
    if (g.isOver()[0]) break;
  }
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('invalid code rejected', () => {
  const g = new Mastermind();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('alice', { code: [1,2,3,7] }));
  assert.ok(!g.validateMove('alice', { code: [1,2,3] }));
});
