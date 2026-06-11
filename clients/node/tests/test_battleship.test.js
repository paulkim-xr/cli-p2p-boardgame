'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { Battleship } = require('../src/games/battleship');

test('start in placement phase', () => {
  const g = new Battleship();
  g.start(['alice', 'bob']);
  assert.strictEqual(g._phase, 'place');
  assert.strictEqual(g.currentTurn(), 'alice');
});

test('place all ships transitions to battle', () => {
  const g = new Battleship();
  g.start(['alice', 'bob']);
  const ships = [[0,0,true],[0,0,true],[0,0,true],[0,0,true],[0,0,true]];
  function placeAll(player, startRow) {
    const sizes = [5,4,3,3,2];
    for (let i = 0; i < 5; i++) {
      g.applyMove(player, { place: { row: startRow + i, col: 0, horiz: true } });
    }
  }
  placeAll('alice', 0);
  placeAll('bob', 0);
  assert.strictEqual(g._phase, 'battle');
});

test('shot hit and miss', () => {
  const g = new Battleship();
  g.start(['alice', 'bob']);
  const sizes = [5,4,3,3,2];
  for (let i = 0; i < 5; i++) g.applyMove('alice', { place: { row: i, col: 0, horiz: true } });
  for (let i = 0; i < 5; i++) g.applyMove('bob',   { place: { row: i, col: 0, horiz: true } });
  assert.strictEqual(g._phase, 'battle');
  g.applyMove('alice', { shot: { row: 0, col: 0 } });
  assert.strictEqual(g._shots['alice'].get('0,0'), 'hit');
  g.applyMove('bob', { shot: { row: 9, col: 9 } });
  assert.strictEqual(g._shots['bob'].get('9,9'), 'miss');
});

test('all sunk — game over', () => {
  const g = new Battleship();
  g.start(['alice', 'bob']);
  for (let i = 0; i < 5; i++) g.applyMove('alice', { place: { row: i, col: 0, horiz: true } });
  for (let i = 0; i < 5; i++) g.applyMove('bob',   { place: { row: i, col: 0, horiz: true } });
  const sizes = [5,4,3,3,2];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < sizes[r]; c++) {
      g._shots['alice'].set(`${r},${c}`, 'hit');
    }
  }
  const [done, winner] = g.isOver();
  assert.ok(done);
  assert.strictEqual(winner, 'alice');
});

test('duplicate shot rejected', () => {
  const g = new Battleship();
  g.start(['alice', 'bob']);
  for (let i = 0; i < 5; i++) g.applyMove('alice', { place: { row: i, col: 0, horiz: true } });
  for (let i = 0; i < 5; i++) g.applyMove('bob',   { place: { row: i, col: 0, horiz: true } });
  g.applyMove('alice', { shot: { row: 0, col: 0 } });
  g.applyMove('bob',   { shot: { row: 9, col: 9 } });
  assert.ok(!g.validateMove('alice', { shot: { row: 0, col: 0 } }));
});
