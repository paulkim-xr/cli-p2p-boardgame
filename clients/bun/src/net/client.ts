import * as net from 'net';
import { encode, decode, MsgType, WireMsg } from './protocol';

export class Client {
  readonly hostIp: string;
  readonly port: number;
  readonly playerId: string;
  onMessage: ((msg: WireMsg) => void) | null;
  private _sock: net.Socket | null;

  constructor(hostIp: string, port: number, playerId: string, onMessage: ((msg: WireMsg) => void) | null = null) {
    this.hostIp = hostIp;
    this.port = port;
    this.playerId = playerId;
    this.onMessage = onMessage;
    this._sock = null;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._sock = net.createConnection({ host: this.hostIp, port: this.port }, () => {
        this.send({ type: MsgType.JOIN, from: this.playerId });
        resolve();
      });

      let buf = '';
      this._sock.on('data', (chunk: Buffer) => {
        buf += chunk.toString('utf8');
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: WireMsg;
          try { msg = decode(line); } catch (_) { continue; }
          if (this.onMessage) this.onMessage(msg);
        }
      });

      this._sock.on('error', (err: Error) => reject(err));
      this._sock.on('close', () => { this._sock = null; });
    });
  }

  send(msg: WireMsg): void {
    if (this._sock && !this._sock.destroyed) {
      try { this._sock.write(encode(msg)); } catch (_) {}
    }
  }

  disconnect(): void {
    this.send({ type: MsgType.LEAVE, from: this.playerId });
    if (this._sock) {
      try { this._sock.destroy(); } catch (_) {}
      this._sock = null;
    }
  }
}
