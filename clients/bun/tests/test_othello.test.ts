import { describe, test, expect, beforeEach } from 'bun:test';
import { Othello } from '../src/games/othello';

describe('Othello', () => {
  let g: Othello;
  beforeEach(() => { g = new Othello(); g.start(['alice', 'bob']); });

  test('initial board setup', () => {
    expect(g.board[3][3]).toBe('bob');
    expect(g.board[4][4]).toBe('bob');
    expect(g.board[3][4]).toBe('alice');
    expect(g.board[4][3]).toBe('alice');
  });

  test('valid move flips pieces', () => {
    expect(g.validateMove('alice', { row: 2, col: 3 })).toBe(true);
    g.applyMove('alice', { row: 2, col: 3 });
    expect(g.board[2][3]).toBe('alice');
    expect(g.board[3][3]).toBe('alice');
  });

  test('invalid move rejected', () => {
    expect(g.validateMove('alice', { row: 0, col: 0 })).toBe(false);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { row: 2, col: 3 })).toBe(false);
  });

  test('render contains grid', () => {
    const out = g.render();
    expect(out.includes('B') || out.includes('W')).toBe(true);
  });
});
