import { describe, test, expect } from 'bun:test';
import { loadPort, DEFAULT_PORT } from '../src/framework/config';

describe('config', () => {
  test('default port', () => {
    expect(loadPort([])).toBe(DEFAULT_PORT);
  });

  test('--port flag', () => {
    expect(loadPort(['--port', '9999'])).toBe(9999);
  });

  test('ignores invalid --port', () => {
    expect(loadPort(['--port', 'abc'])).toBe(DEFAULT_PORT);
  });

  test('PORT env', () => {
    process.env['PORT'] = '8888';
    expect(loadPort([])).toBe(8888);
    delete process.env['PORT'];
  });

  test('--port takes precedence over env', () => {
    process.env['PORT'] = '8888';
    expect(loadPort(['--port', '7777'])).toBe(7777);
    delete process.env['PORT'];
  });
});
