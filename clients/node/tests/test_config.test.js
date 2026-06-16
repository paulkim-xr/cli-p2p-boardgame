'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadPort, DEFAULT_PORT } = require('../src/framework/config');

test('default port when no args', () => {
  assert.strictEqual(loadPort([]), DEFAULT_PORT);
});

test('--port flag overrides default', () => {
  assert.strictEqual(loadPort(['--port', '12345']), 12345);
});

test('PORT env var', () => {
  const prev = process.env.PORT;
  process.env.PORT = '9999';
  const p = loadPort([]);
  if (prev === undefined) delete process.env.PORT;
  else process.env.PORT = prev;
  assert.strictEqual(p, 9999);
});
