import { describe, test, expect, beforeEach } from 'bun:test';
import { Hex } from '../src/games/hex_game';

describe('Hex', () => {
  let g: Hex;
  beforeEach(() => { g = new Hex(); g.start(['alice', 'bob']); });

  test('empty 11x11 board', () => {
    expect(g.board.length).toBe(11);
    expect(g.board[0].length).toBe(11);
    expect(g.board[5][5]).toBeNull();
  });

  test('valid placement', () => {
    expect(g.validateMove('alice', { row: 5, col: 5 })).toBe(true);
  });

  test('occupied spot rejected', () => {
    g.applyMove('alice', { row: 5, col: 5 });
    expect(g.validateMove('bob', { row: 5, col: 5 })).toBe(false);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { row: 0, col: 0 })).toBe(false);
  });

  test('player 0 wins with top-to-bottom path', () => {
    for (let r = 0; r < 11; r++) {
      g.board[r][5] = 'alice';
    }
    g.applyMove('alice', { row: 0, col: 0 });
    const [done, winner] = g.isOver();
    expect(done).toBe(true);
    expect(winner).toBe('alice');
  });
});
