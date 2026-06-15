'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Chess } = require('../src/games/chess');

test('initial position has 32 pieces', () => {
  const g = new Chess();
  assert.strictEqual(Object.keys(g.board).length, 32);
});

test('start sets color map', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  assert.strictEqual(g._cmap['alice'], 'w');
  assert.strictEqual(g._cmap['bob'], 'b');
});

test('pawn can move forward', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { from: 'e2', to: 'e4' }));
});

test('invalid move rejected', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('alice', { from: 'e2', to: 'e5' }));
});

test('wrong color rejected', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('alice', { from: 'e7', to: 'e5' }));
});

test('scholar mate', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  g.applyMove('alice', { from: 'e2', to: 'e4' });
  g.applyMove('bob',   { from: 'e7', to: 'e5' });
  g.applyMove('alice', { from: 'f1', to: 'c4' });
  g.applyMove('bob',   { from: 'b8', to: 'c6' });
  g.applyMove('alice', { from: 'd1', to: 'h5' });
  g.applyMove('bob',   { from: 'a7', to: 'a6' });
  g.applyMove('alice', { from: 'h5', to: 'f7' });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('render shows board', () => {
  const g = new Chess();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('K'));
  assert.ok(out.includes('R'));
  assert.ok(out.includes('P'));
});

test('chess parseInput "e2 e4"', () => {
  const g = new Chess();
  const result = g.parseInput('e2 e4');
  assert.deepStrictEqual(result, { from: 'e2', to: 'e4' });
});

test('chess parseInput valid JSON', () => {
  const g = new Chess();
  const result = g.parseInput('{"from":"e2","to":"e4"}');
  assert.deepStrictEqual(result, { from: 'e2', to: 'e4' });
});

test('chess parseInput single token returns null', () => {
  const g = new Chess();
  assert.strictEqual(g.parseInput('e2'), null);
});

test('chess getHelp returns array of length >= 2', () => {
  const g = new Chess();
  const help = g.getHelp();
  assert.ok(Array.isArray(help));
  assert.ok(help.length >= 2);
});
