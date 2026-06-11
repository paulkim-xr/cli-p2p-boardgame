'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { ConnectFour } = require('../src/games/connect_four');

test('basic move and turn switch', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  assert.ok(g.validateMove('alice', { col: 3 }));
  g.applyMove('alice', { col: 3 });
  assert.strictEqual(g.currentTurn(), 'bob');
  assert.strictEqual(g.board[5][3], 'alice');
});

test('invalid col rejected', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  assert.ok(!g.validateMove('alice', { col: 7 }));
  assert.ok(!g.validateMove('alice', { col: -1 }));
});

test('full column rejected', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  for (let i = 0; i < 6; i++) {
    g.board[i][0] = 'alice';
  }
  assert.ok(!g.validateMove('alice', { col: 0 }));
});

test('win detection horizontal', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  for (let c = 0; c < 3; c++) { g.board[5][c] = 'alice'; }
  g.applyMove('alice', { col: 3 });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('win detection vertical', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  for (let r = 2; r <= 4; r++) { g.board[r][0] = 'alice'; }
  g.applyMove('alice', { col: 0 });
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('render shows board', () => {
  const g = new ConnectFour();
  g.start(['alice', 'bob']);
  const out = g.render();
  assert.ok(out.includes('0'));
  assert.ok(out.includes('.'));
});
