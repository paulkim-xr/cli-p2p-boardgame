import { describe, test, expect, beforeEach } from 'bun:test';
import { Go } from '../src/games/go';

describe('Go', () => {
  let g: Go;
  beforeEach(() => { g = new Go(9); g.start(['alice', 'bob']); });

  test('empty board', () => {
    expect(g.board[0][0]).toBeNull();
    expect(g.currentTurn()).toBe('alice');
  });

  test('valid placement', () => {
    expect(g.validateMove('alice', { row: 4, col: 4 })).toBe(true);
  });

  test('occupied spot rejected', () => {
    g.applyMove('alice', { row: 4, col: 4 });
    expect(g.validateMove('bob', { row: 4, col: 4 })).toBe(false);
  });

  test('pass is valid', () => {
    expect(g.validateMove('alice', { pass: true })).toBe(true);
  });

  test('two passes end game', () => {
    g.applyMove('alice', { pass: true });
    g.applyMove('bob', { pass: true });
    const [done] = g.isOver();
    expect(done).toBe(true);
  });

  test('capture removes stones', () => {
    g.applyMove('alice', { row: 0, col: 1 });
    g.applyMove('bob', { row: 0, col: 0 });
    g.applyMove('alice', { row: 1, col: 0 });
    expect(g.board[0][0]).toBeNull();
  });
});
