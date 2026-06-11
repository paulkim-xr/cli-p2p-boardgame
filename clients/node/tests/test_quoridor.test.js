'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Quoridor } = require('../src/games/quoridor');

test('start places pawns', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  assert.deepStrictEqual(g.pos['alice'], [0, 4]);
  assert.deepStrictEqual(g.pos['bob'], [8, 4]);
  assert.strictEqual(g.wallsLeft['alice'], 10);
});

test('valid N move', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { move: 'S' }));
  g.applyMove('alice', { move: 'S' });
  assert.deepStrictEqual(g.pos['alice'], [1, 4]);
});

test('alice wins reaching row 8', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  g.pos['alice'] = [7, 4];
  g.applyMove('alice', { move: 'S' });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('wall placement valid', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { wall: { row: 2, col: 2, horiz: true } }));
  g.applyMove('alice', { wall: { row: 2, col: 2, horiz: true } });
  assert.strictEqual(g.wallsLeft['alice'], 9);
});

test('wall trapping player rejected', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  for (let c = 0; c < 8; c++) g._hWalls.add(`0,${c}`);
  assert.ok(!g.validateMove('alice', { wall: { row: 0, col: 0, horiz: true } }));
});

test('render shows grid', () => {
  const g = new Quoridor();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('0') || out.includes('1'));
});
