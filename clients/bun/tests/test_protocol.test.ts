import { describe, test, expect } from 'bun:test';
import { MsgType, encode, decode } from '../src/framework/net/protocol';

describe('protocol', () => {
  test('encode produces JSON line', () => {
    const line = encode({ type: MsgType.JOIN, from: 'alice' });
    expect(line.endsWith('\n')).toBe(true);
    const obj = JSON.parse(line.trim());
    expect(obj.type).toBe('JOIN');
    expect(obj.from).toBe('alice');
  });

  test('decode parses JSON line', () => {
    const msg = decode('{"type":"CHAT","from":"bob","text":"hi"}\n');
    expect(msg.type).toBe(MsgType.CHAT);
    expect(msg.from).toBe('bob');
    expect(msg.text).toBe('hi');
  });

  test('encode/decode roundtrip', () => {
    const orig = { type: MsgType.MOVE, from: 'alice', data: { pile: 0, count: 3 } };
    const decoded = decode(encode(orig));
    expect(decoded.type).toBe(orig.type);
    expect(decoded.from).toBe(orig.from);
  });

  test('MsgType constants', () => {
    expect(MsgType.JOIN).toBe('JOIN');
    expect(MsgType.GAME_START).toBe('GAME_START');
    expect(MsgType.GAME_OVER).toBe('GAME_OVER');
  });
});
