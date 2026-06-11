import { describe, test, expect, beforeEach } from 'bun:test';
import { Nim } from '../src/games/nim';

describe('Nim', () => {
  let g: Nim;
  beforeEach(() => { g = new Nim([3, 5, 7]); g.start(['alice', 'bob']); });

  test('initial piles', () => {
    expect(g.piles).toEqual([3, 5, 7]);
    expect(g.currentTurn()).toBe('alice');
  });

  test('valid move reduces pile', () => {
    expect(g.validateMove('alice', { pile: 0, count: 2 })).toBe(true);
    g.applyMove('alice', { pile: 0, count: 2 });
    expect(g.piles[0]).toBe(1);
    expect(g.currentTurn()).toBe('bob');
  });

  test('invalid move rejected', () => {
    expect(g.validateMove('alice', { pile: 0, count: 5 })).toBe(false);
    expect(g.validateMove('bob', { pile: 0, count: 1 })).toBe(false);
  });

  test('game over when all piles empty', () => {
    g.applyMove('alice', { pile: 0, count: 3 });
    g.applyMove('bob', { pile: 1, count: 5 });
    g.applyMove('alice', { pile: 2, count: 7 });
    const [done, winner] = g.isOver();
    expect(done).toBe(true);
    expect(winner).toBe('alice');
  });

  test('render contains piles', () => {
    const out = g.render();
    expect(out).toContain('3');
    expect(out).toContain('alice');
  });
});
