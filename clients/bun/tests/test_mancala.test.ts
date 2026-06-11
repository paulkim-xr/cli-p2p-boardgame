import { describe, test, expect, beforeEach } from 'bun:test';
import { Mancala } from '../src/games/mancala';

describe('Mancala', () => {
  let g: Mancala;
  beforeEach(() => { g = new Mancala(); g.start(['alice', 'bob']); });

  test('initial setup', () => {
    expect(g.pits['alice']).toEqual([4,4,4,4,4,4]);
    expect(g.store['alice']).toBe(0);
  });

  test('valid move', () => {
    expect(g.validateMove('alice', { pit: 0 })).toBe(true);
  });

  test('empty pit rejected', () => {
    g.pits['alice'][0] = 0;
    expect(g.validateMove('alice', { pit: 0 })).toBe(false);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { pit: 0 })).toBe(false);
  });

  test('move distributes seeds', () => {
    g.applyMove('alice', { pit: 0 });
    expect(g.pits['alice'][0]).toBe(0);
  });

  test('render shows players', () => {
    const out = g.render();
    expect(out).toContain('alice');
    expect(out).toContain('bob');
  });
});
