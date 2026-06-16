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

test('mastermind parseInput returns code when no code set', () => {
  const g = new Mastermind();
  const result = g.parseInput('1 2 3 4');
  assert.deepStrictEqual(result, { code: [1, 2, 3, 4] });
});

test('mastermind parseInput compact 4-digit string returns code', () => {
  const g = new Mastermind();
  const result = g.parseInput('1234');
  assert.deepStrictEqual(result, { code: [1, 2, 3, 4] });
});

test('mastermind parseInput returns guess when code is set', () => {
  const g = new Mastermind();
  g._code = [1, 2, 3, 4];
  const result = g.parseInput('5 6 5 6');
  assert.deepStrictEqual(result, { guess: [5, 6, 5, 6] });
});

test('mastermind parseInput invalid returns null', () => {
  const g = new Mastermind();
  assert.strictEqual(g.parseInput('bad'), null);
  assert.strictEqual(g.parseInput('1 2 3'), null);
});

test('mastermind getHelp returns array of length >= 2', () => {
  const g = new Mastermind();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
