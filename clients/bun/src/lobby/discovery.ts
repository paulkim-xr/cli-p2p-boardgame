import * as dgram from 'dgram';

export interface SessionInfo {
  host: string;
  game: string;
  players: string[];
  maxPlayers: number;
  port: number;
  hostIp?: string;
}

export class Beacon {
  private _udpPort: number;
  private _info: SessionInfo;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _sock: dgram.Socket | null = null;

  constructor({ port, host, game, players, maxPlayers }: { port: number; host: string; game: string; players?: string[]; maxPlayers: number }) {
    this._udpPort = port + 1;
    this._info = { host, game, players: players ?? [], maxPlayers, port };
  }

  start(): void {
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

  stop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._sock) { try { this._sock.close(); } catch (_) {} this._sock = null; }
  }
}

export class Listener {
  private _udpPort: number;
  private _sessions: Map<string, SessionInfo>;
  private _sock: dgram.Socket | null = null;

  constructor({ port }: { port: number }) {
    this._udpPort = port + 1;
    this._sessions = new Map();
  }

  start(): void {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      try {
        const info = JSON.parse(msg.toString('utf8')) as SessionInfo;
        info.hostIp = rinfo.address;
        this._sessions.set(rinfo.address, info);
      } catch (_) {}
    });
    sock.on('error', () => {});
    sock.bind(this._udpPort);
    this._sock = sock;
  }

  stop(): void {
    if (this._sock) { try { this._sock.close(); } catch (_) {} this._sock = null; }
  }

  getSessions(): SessionInfo[] {
    return [...this._sessions.values()];
  }
}
