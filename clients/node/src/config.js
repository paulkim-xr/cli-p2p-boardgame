'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 47777;

function loadPort(argv) {
  const args = argv || process.argv.slice(2);
  const idx = args.indexOf('--port');
  if (idx !== -1 && args[idx + 1]) {
    const n = parseInt(args[idx + 1], 10);
    if (!isNaN(n)) return n;
  }
  if (process.env.PORT) {
    const n = parseInt(process.env.PORT, 10);
    if (!isNaN(n)) return n;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const n = parseInt(cfg.port, 10);
    if (!isNaN(n)) return n;
  } catch (_) {}
  return DEFAULT_PORT;
}

function findFreePort(start) {
  const net = require('net');
  return new Promise((resolve) => {
    function tryPort(p) {
      const srv = net.createServer();
      srv.once('error', () => tryPort(p + 2));
      srv.once('listening', () => {
        srv.close(() => resolve(p));
      });
      srv.listen(p);
    }
    tryPort(start);
  });
}

module.exports = { loadPort, findFreePort, DEFAULT_PORT };
