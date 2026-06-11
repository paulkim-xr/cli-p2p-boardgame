import { describe, test, expect, beforeEach } from 'bun:test';
import { Battleship } from '../src/games/battleship';

describe('Battleship', () => {
  let g: Battleship;
  beforeEach(() => { g = new Battleship(); g.start(['alice', 'bob']); });

  test('starts in place phase', () => {
    expect(g.currentTurn()).toBe('alice');
  });

  test('valid ship placement', () => {
    expect(g.validateMove('alice', { place: { row: 0, col: 0, horiz: true } })).toBe(true);
  });

  test('ship out of bounds rejected', () => {
    expect(g.validateMove('alice', { place: { row: 0, col: 8, horiz: true } })).toBe(false);
  });

  test('players alternate placement', () => {
    g.applyMove('alice', { place: { row: 0, col: 0, horiz: true } });
    expect(g.currentTurn()).toBe('bob');
  });

  test('all ships placed transitions to battle', () => {
    const ships = [
      { row: 0, col: 0, horiz: true },
      { row: 2, col: 0, horiz: true },
      { row: 4, col: 0, horiz: true },
      { row: 6, col: 0, horiz: true },
      { row: 8, col: 0, horiz: true },
    ];
    for (const player of ['alice', 'bob']) {
      for (const s of ships) {
        const pid = g.currentTurn()!;
        g.applyMove(pid, { place: s });
      }
    }
    expect(g.validateMove('alice', { shot: { row: 0, col: 5 } })).toBe(true);
  });
});
