'use strict';
const dgram = require('dgram');

class Beacon {
  constructor({ port, host, game, players, maxPlayers }) {
    this._udpPort = port + 1;
    this._info = { host, game, players: players || [], maxPlayers, port };
    this._timer = null;
  }

  start() {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.bind(() => {
      try { sock.setBroadcast(true); } catch (_) {}
    });
    const data = Buffer.from(JSON.stringify(this._info), 'utf8');
    this._timer = setInterval(() => {
      try { sock.send(data, this._udpPort, '255.255.255.255'); } catch (_) {}
    }, 2000);
    this._sock = sock;
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._sock) { try { this._sock.close(); } catch (_) {} this._sock = null; }
  }
}

class Listener {
  constructor({ port }) {
    this._udpPort = port + 1;
    this._sessions = new Map();
    this._sock = null;
  }

  start() {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.on('message', (msg, rinfo) => {
      try {
        const info = JSON.parse(msg.toString('utf8'));
        info.hostIp = rinfo.address;
        this._sessions.set(rinfo.address, info);
      } catch (_) {}
    });
    sock.on('error', () => {});
    sock.bind(this._udpPort);
    this._sock = sock;
  }

  stop() {
    if (this._sock) { try { this._sock.close(); } catch (_) {} this._sock = null; }
  }

  getSessions() {
    return [...this._sessions.values()];
  }
}

module.exports = { Beacon, Listener };
