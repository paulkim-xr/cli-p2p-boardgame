'use strict';
const net = require('net');
const { encode, decode, MsgType } = require('./protocol');

class Host {
  constructor({ port, gameName = null, maxPlayers = 2 }) {
    this.port = port;
    this._gameName = gameName;
    this._maxPlayers = maxPlayers;
    this._clients = new Map();   // playerId -> socket
    this._server = null;
    this._running = false;
    this.game = null;
  }

  start() {
    this._server = net.createServer(sock => this._handleClient(sock));
    this._running = true;
    return new Promise((resolve, reject) => {
      this._server.once('error', reject);
      this._server.once('listening', () => { this._server.removeListener('error', reject); resolve(); });
      this._server.listen(this.port);
    });
  }

  stop() {
    this._running = false;
    if (this._server) this._server.close();
    for (const sock of this._clients.values()) {
      try { sock.destroy(); } catch (_) {}
    }
  }

  _handleClient(sock) {
    let buf = '';
    let playerId = null;

    sock.on('data', chunk => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try { msg = decode(line); } catch (_) { continue; }
        this._handleMessage(sock, msg, (pid) => { playerId = pid; });
      }
    });

    sock.on('close', () => {
      if (playerId) {
        this._clients.delete(playerId);
        this.broadcast({ type: MsgType.PLAYER_LIST, players: [...this._clients.keys()] });
      }
    });

    sock.on('error', () => {});
  }

  _handleMessage(sock, msg, setId) {
    const type = msg.type;
    if (type === MsgType.JOIN) {
      const pid = msg.from;
      setId(pid);
      this._clients.set(pid, sock);
      const players = [...this._clients.keys()];
      this.broadcast({ type: MsgType.PLAYER_LIST, players });
      if (!this.game && this._gameName && players.length >= this._maxPlayers) {
        try {
          const { loadGameClasses } = require('../lobby/session');
          const classes = loadGameClasses();
          if (classes[this._gameName]) {
            this.game = new classes[this._gameName]();
            this.game.start(players);
            this.broadcast({ type: MsgType.GAME_START, game: this._gameName, players });
          }
        } catch (e) {
          process.stderr.write(`[host] game start error: ${e.message}\n`);
        }
      }
    } else if (type === MsgType.MOVE) {
      this._handleMove(msg);
    } else if (type === MsgType.CHAT) {
      this.broadcast(msg);
    } else if (type === MsgType.LEAVE) {
      sock.destroy();
    }
  }

  _handleMove(msg) {
    const { t } = require('../i18n');
    const pid = msg.from;
    if (!this.game) return;
    if (this.game.currentTurn() !== pid) {
      this._sendTo(pid, { type: MsgType.ERROR, message: t('error.not_your_turn') });
      return;
    }
    if (!this.game.validateMove(pid, msg.data || {})) {
      this._sendTo(pid, { type: MsgType.ERROR, message: t('error.invalid_move') });
      return;
    }
    this.game.applyMove(pid, msg.data || {});
    for (const p of this._clients.keys()) {
      this._sendTo(p, { type: MsgType.STATE, data: this.game.getState(p) });
    }
    const [done, winner] = this.game.isOver();
    if (done) {
      this.broadcast({ type: MsgType.GAME_OVER, winner });
    }
  }

  broadcast(msg) {
    const data = encode(msg);
    for (const sock of this._clients.values()) {
      try { sock.write(data); } catch (_) {}
    }
  }

  _sendTo(playerId, msg) {
    const sock = this._clients.get(playerId);
    if (sock) {
      try { sock.write(encode(msg)); } catch (_) {}
    }
  }
}

module.exports = { Host };
