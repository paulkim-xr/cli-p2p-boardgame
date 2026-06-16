'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { MsgType, encode, decode } = require('../src/framework/net/protocol');

test('encode produces JSON line', () => {
  const msg = { type: MsgType.JOIN, from: 'alice' };
  const line = encode(msg);
  assert.ok(line.endsWith('\n'));
  const obj = JSON.parse(line.trim());
  assert.strictEqual(obj.type, 'JOIN');
  assert.strictEqual(obj.from, 'alice');
});

test('decode parses JSON line', () => {
  const line = '{"type":"CHAT","from":"bob","text":"hi"}\n';
  const msg = decode(line);
  assert.strictEqual(msg.type, 'CHAT');
  assert.strictEqual(msg.from, 'bob');
  assert.strictEqual(msg.text, 'hi');
});

test('MsgType constants defined', () => {
  for (const k of ['JOIN','LEAVE','MOVE','CHAT','STATE','PLAYER_LIST','GAME_START','GAME_OVER','ERROR']) {
    assert.strictEqual(MsgType[k], k);
  }
});

test('encode/decode round-trip', () => {
  const orig = { type: MsgType.MOVE, from: 'alice', data: { pile: 0, count: 3 } };
  assert.deepStrictEqual(decode(encode(orig)), orig);
});
