import { describe, test, expect, beforeEach } from 'bun:test';
import { Checkers } from '../src/games/checkers';

describe('Checkers', () => {
  let g: Checkers;
  beforeEach(() => { g = new Checkers(); g.start(['red', 'black']); });

  test('initial pieces placed', () => {
    const redPieces = g.board.flat().filter(c => c && c[0] === 'red').length;
    const blackPieces = g.board.flat().filter(c => c && c[0] === 'black').length;
    expect(redPieces).toBe(12);
    expect(blackPieces).toBe(12);
  });

  test('red moves first', () => {
    expect(g.currentTurn()).toBe('red');
  });

  test('valid move accepted', () => {
    expect(g.validateMove('red', { from: [5, 0], to: [4, 1] })).toBe(true);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('black', { from: [5, 0], to: [4, 1] })).toBe(false);
  });

  test('render contains pieces', () => {
    const out = g.render();
    expect(out).toContain('r');
    expect(out).toContain('b');
  });
});
