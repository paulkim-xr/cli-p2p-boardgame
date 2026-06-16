import * as net from 'net';
import { encode, decode, MsgType, WireMsg } from './protocol';
import { loadGameClasses } from '../lobby/session';
import { t } from '../i18n';
import type { BaseGame } from '../../games/base';

export class Host {
  readonly port: number;
  private _gameName: string | null;
  private _maxPlayers: number;
  private _clients: Map<string, net.Socket>;
  private _server: net.Server | null;
  private _running: boolean;
  game: BaseGame | null;

  constructor({ port, gameName = null, maxPlayers = 2 }: { port: number; gameName?: string | null; maxPlayers?: number }) {
    this.port = port;
    this._gameName = gameName;
    this._maxPlayers = maxPlayers;
    this._clients = new Map();
    this._server = null;
    this._running = false;
    this.game = null;
  }

  start(): Promise<void> {
    this._server = net.createServer(sock => this._handleClient(sock));
    this._running = true;
    return new Promise((resolve, reject) => {
      this._server!.once('error', reject);
      this._server!.once('listening', () => {
        this._server!.removeListener('error', reject);
        resolve();
      });
      this._server!.listen(this.port);
    });
  }

  stop(): void {
    this._running = false;
    if (this._server) this._server.close();
    for (const sock of this._clients.values()) {
      try { sock.destroy(); } catch (_) {}
    }
  }

  private _handleClient(sock: net.Socket): void {
    let buf = '';
    let playerId: string | null = null;

    sock.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let msg: WireMsg;
        try { msg = decode(line); } catch (_) { continue; }
        this._handleMessage(sock, msg, (pid: string) => { playerId = pid; });
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

  private _handleMessage(sock: net.Socket, msg: WireMsg, setId: (pid: string) => void): void {
    const type = msg.type;
    if (type === MsgType.JOIN) {
      const pid = msg.from!;
      setId(pid);
      this._clients.set(pid, sock);
      const players = [...this._clients.keys()];
      this.broadcast({ type: MsgType.PLAYER_LIST, players });
      if (!this.game && this._gameName && players.length >= this._maxPlayers) {
        try {
          const classes = loadGameClasses();
          if (classes[this._gameName]) {
            this.game = new classes[this._gameName]();
            this.game.start(players);
            this.broadcast({ type: MsgType.GAME_START, game: this._gameName, players });
          }
        } catch (e: unknown) {
          process.stderr.write(`[host] game start error: ${(e as Error).message}\n`);
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

  private _handleMove(msg: WireMsg): void {
    const pid = msg.from!;
    if (!this.game) return;
    if (this.game.currentTurn() !== pid) {
      this._sendTo(pid, { type: MsgType.ERROR, message: t('error.not_your_turn') });
      return;
    }
    const moveData = (msg.data ?? {}) as Record<string, unknown>;
    if (!this.game.validateMove(pid, moveData)) {
      this._sendTo(pid, { type: MsgType.ERROR, message: t('error.invalid_move') });
      return;
    }
    this.game.applyMove(pid, moveData);
    for (const p of this._clients.keys()) {
      this._sendTo(p, { type: MsgType.STATE, data: this.game.getState(p) as Record<string, unknown> });
    }
    const [done, winner] = this.game.isOver();
    if (done) this.broadcast({ type: MsgType.GAME_OVER, winner });
  }

  broadcast(msg: WireMsg): void {
    const data = encode(msg);
    for (const sock of this._clients.values()) {
      try { sock.write(data); } catch (_) {}
    }
  }

  private _sendTo(playerId: string, msg: WireMsg): void {
    const sock = this._clients.get(playerId);
    if (sock) {
      try { sock.write(encode(msg)); } catch (_) {}
    }
  }
}
