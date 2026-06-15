import { describe, test, expect, beforeEach } from 'bun:test';
import { Chess } from '../src/games/chess';

describe('Chess', () => {
  let g: Chess;
  beforeEach(() => { g = new Chess(); g.start(['alice', 'bob']); });

  test('initial pieces set up', () => {
    expect(g.board['e1']).toEqual(['w', 'K']);
    expect(g.board['e8']).toEqual(['b', 'K']);
    expect(g.board['a2']).toEqual(['w', 'P']);
  });

  test('pawn move forward', () => {
    expect(g.validateMove('alice', { from: 'e2', to: 'e4' })).toBe(true);
  });

  test('pawn double move from start', () => {
    expect(g.validateMove('alice', { from: 'e2', to: 'e4' })).toBe(true);
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { from: 'e7', to: 'e5' })).toBe(false);
  });

  test('illegal move rejected', () => {
    expect(g.validateMove('alice', { from: 'e2', to: 'e5' })).toBe(false);
  });

  test('move applies and switches turn', () => {
    g.applyMove('alice', { from: 'e2', to: 'e4' });
    expect(g.currentTurn()).toBe('bob');
    expect(g.board['e4']).toEqual(['w', 'P']);
    expect(g.board['e2']).toBeUndefined();
  });

  test('render shows board', () => {
    const out = g.render();
    expect(out).toContain('K');
    expect(out).toContain('a b c d e f g h');
  });

  test('parseInput: from-to algebraic', () => {
    expect(g.parseInput('e2 e4')).toEqual({ from: 'e2', to: 'e4' });
  });

  test('parseInput: invalid returns null', () => {
    expect(g.parseInput('e2')).toBeNull();
    expect(g.parseInput('abc xyz def')).toBeNull();
  });

  test('getHelp: returns non-empty array', () => {
    expect(g.getHelp().length).toBeGreaterThan(0);
  });
});
