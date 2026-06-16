'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Mancala } = require('../src/games/mancala');

test('start gives each player 24 seeds', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  assert.deepStrictEqual(g.pits['alice'], [4,4,4,4,4,4]);
  assert.strictEqual(g.store['alice'], 0);
});

test('valid pit move', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { pit: 0 }));
});

test('empty pit rejected', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  g.pits['alice'][0] = 0;
  assert.ok(!g.validateMove('alice', { pit: 0 }));
});

test('seeds distributed', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { pit: 0 });
  assert.strictEqual(g.pits['alice'][0], 0);
  assert.strictEqual(g.pits['alice'][1], 5);
  assert.strictEqual(g.pits['alice'][2], 5);
  assert.strictEqual(g.pits['alice'][3], 5);
  assert.strictEqual(g.pits['alice'][4], 5);
});

test('extra turn when last seed lands in store', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  g.pits['alice'] = [0, 0, 0, 0, 0, 1];
  g.applyMove('alice', { pit: 5 });
  assert.strictEqual(g.store['alice'], 1);
  assert.strictEqual(g.currentTurn(), 'alice');
});

test('render contains player names', () => {
  const g = new Mancala();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('alice'));
  assert.ok(out.includes('bob'));
});

test('mancala parseInput "2"', () => {
  const g = new Mancala();
  const result = g.parseInput('2');
  assert.deepStrictEqual(result, { pit: 2 });
});

test('mancala parseInput valid JSON', () => {
  const g = new Mancala();
  const result = g.parseInput('{"pit":3}');
  assert.deepStrictEqual(result, { pit: 3 });
});

test('mancala parseInput invalid returns null', () => {
  const g = new Mancala();
  assert.strictEqual(g.parseInput('abc'), null);
});

test('mancala getHelp returns array of length >= 2', () => {
  const g = new Mancala();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
