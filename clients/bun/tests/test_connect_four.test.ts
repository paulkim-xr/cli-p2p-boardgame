import { describe, test, expect, beforeEach } from 'bun:test';
import { ConnectFour } from '../src/games/connect_four';

describe('ConnectFour', () => {
  let g: ConnectFour;
  beforeEach(() => { g = new ConnectFour(); g.start(['alice', 'bob']); });

  test('valid move drops piece', () => {
    expect(g.validateMove('alice', { col: 0 })).toBe(true);
    g.applyMove('alice', { col: 0 });
    expect(g.board[5][0]).toBe('alice');
  });

  test('wrong player rejected', () => {
    expect(g.validateMove('bob', { col: 0 })).toBe(false);
  });

  test('horizontal win detected', () => {
    for (let c = 0; c < 4; c++) {
      g.applyMove('alice', { col: c });
      if (c < 3) g.applyMove('bob', { col: c });
    }
    const [done, winner] = g.isOver();
    expect(done).toBe(true);
    expect(winner).toBe('alice');
  });

  test('render shows board', () => {
    g.applyMove('alice', { col: 3 });
    const out = g.render();
    expect(out).toContain('X');
  });
});
