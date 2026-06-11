import * as fs from 'fs';
import * as net from 'net';

export const DEFAULT_PORT = 47777;

export function loadPort(argv?: string[]): number {
  const args = argv ?? process.argv.slice(2);
  const idx = args.indexOf('--port');
  if (idx !== -1 && args[idx + 1]) {
    const n = parseInt(args[idx + 1], 10);
    if (!isNaN(n)) return n;
  }
  if (process.env['PORT']) {
    const n = parseInt(process.env['PORT'], 10);
    if (!isNaN(n)) return n;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8')) as { port?: unknown };
    const n = parseInt(String(cfg.port), 10);
    if (!isNaN(n)) return n;
  } catch (_) {}
  return DEFAULT_PORT;
}

export function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    function tryPort(p: number): void {
      const srv = net.createServer();
      srv.once('error', () => tryPort(p + 2));
      srv.once('listening', () => { srv.close(() => resolve(p)); });
      srv.listen(p);
    }
    tryPort(start);
  });
}
