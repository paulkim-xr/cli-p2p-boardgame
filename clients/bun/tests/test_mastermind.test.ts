import { describe, test, expect, beforeEach } from 'bun:test';
import { Mastermind } from '../src/games/mastermind';

describe('Mastermind', () => {
  let g: Mastermind;
  beforeEach(() => { g = new Mastermind(); g.start(['alice', 'bob']); });

  test('alice sets code first', () => {
    expect(g.currentTurn()).toBe('alice');
    expect(g.validateMove('alice', { code: [1,2,3,4] })).toBe(true);
  });

  test('invalid code rejected', () => {
    expect(g.validateMove('alice', { code: [1,2,3,7] })).toBe(false);
    expect(g.validateMove('alice', { code: [1,2,3] })).toBe(false);
  });

  test('bob guesses after code set', () => {
    g.applyMove('alice', { code: [1,2,3,4] });
    expect(g.currentTurn()).toBe('bob');
    expect(g.validateMove('bob', { guess: [1,2,3,4] })).toBe(true);
  });

  test('correct guess wins for bob', () => {
    g.applyMove('alice', { code: [1,2,3,4] });
    g.applyMove('bob', { guess: [1,2,3,4] });
    const [done, winner] = g.isOver();
    expect(done).toBe(true);
    expect(winner).toBe('bob');
  });

  test('render shows guesses', () => {
    g.applyMove('alice', { code: [1,2,3,4] });
    g.applyMove('bob', { guess: [5,6,5,6] });
    const out = g.render();
    expect(out.length).toBeGreaterThan(0);
  });

  test('parseInput: space-separated sets code when no code yet', () => {
    expect(g.parseInput('1 2 3 4')).toEqual({ code: [1,2,3,4] });
  });

  test('parseInput: compact 4-digit sets guess after code', () => {
    g.applyMove('alice', { code: [1,2,3,4] });
    expect(g.parseInput('5656')).toEqual({ guess: [5,6,5,6] });
  });

  test('parseInput: invalid returns null', () => {
    expect(g.parseInput('abc')).toBeNull();
    expect(g.parseInput('1 2 3')).toBeNull();
  });

  test('getHelp: returns non-empty array', () => {
    const help = g.getHelp();
    expect(help.length).toBeGreaterThan(0);
  });
});
