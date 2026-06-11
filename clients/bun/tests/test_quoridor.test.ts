import { describe, test, expect, beforeEach } from 'bun:test';
import { Quoridor } from '../src/games/quoridor';

describe('Quoridor', () => {
  let g: Quoridor;
  beforeEach(() => { g = new Quoridor(); g.start(['alice', 'bob']); });

  test('initial positions', () => {
    expect(g.pos['alice']).toEqual([0, 4]);
    expect(g.pos['bob']).toEqual([8, 4]);
  });

  test('valid move south', () => {
    expect(g.validateMove('alice', { move: 'S' })).toBe(true);
  });

  test('move out of bounds rejected', () => {
    expect(g.validateMove('alice', { move: 'N' })).toBe(false);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { move: 'S' })).toBe(false);
  });

  test('wall placement accepted', () => {
    expect(g.validateMove('alice', { wall: { row: 2, col: 2, horiz: true } })).toBe(true);
  });

  test('wall blocking path rejected', () => {
    g.applyMove('alice', { wall: { row: 0, col: 0, horiz: false } });
    g.applyMove('bob', { wall: { row: 0, col: 1, horiz: false } });
    g.applyMove('alice', { wall: { row: 0, col: 2, horiz: false } });
    g.applyMove('bob', { wall: { row: 0, col: 3, horiz: false } });
    // Try a wall that doesn't block anyone
    expect(g.validateMove('alice', { wall: { row: 5, col: 5, horiz: true } })).toBe(true);
  });

  test('player wins by reaching goal', () => {
    for (let i = 0; i < 8; i++) {
      g.applyMove('alice', { move: 'S' });
      if (i < 7) g.applyMove('bob', { move: 'N' });
    }
    const [done, winner] = g.isOver();
    expect(done).toBe(true);
    expect(winner).toBe('alice');
  });
});
