'use strict';
const net = require('net');
const { encode, decode, MsgType } = require('./protocol');

class Client {
  constructor(hostIp, port, playerId, onMessage = null) {
    this.hostIp = hostIp;
    this.port = port;
    this.playerId = playerId;
    this.onMessage = onMessage;
    this._sock = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this._sock = net.createConnection({ host: this.hostIp, port: this.port }, () => {
        this.send({ type: MsgType.JOIN, from: this.playerId });
        resolve();
      });

      let buf = '';
      this._sock.on('data', chunk => {
        buf += chunk.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg;
          try { msg = decode(line); } catch (_) { continue; }
          if (this.onMessage) this.onMessage(msg);
        }
      });

      this._sock.on('error', (err) => reject(err));
      this._sock.on('close', () => { this._sock = null; });
    });
  }

  send(msg) {
    if (this._sock && !this._sock.destroyed) {
      try { this._sock.write(encode(msg)); } catch (_) {}
    }
  }

  disconnect() {
    this.send({ type: MsgType.LEAVE, from: this.playerId });
    if (this._sock) {
      try { this._sock.destroy(); } catch (_) {}
      this._sock = null;
    }
  }
}

module.exports = { Client };
