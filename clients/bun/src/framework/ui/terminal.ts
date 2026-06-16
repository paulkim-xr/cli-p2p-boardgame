import * as readline from 'readline';

export const BOLD   = '\x1b[1m';
export const RESET  = '\x1b[0m';
export const DIM    = '\x1b[2m';
export const GREEN  = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const CYAN   = '\x1b[36m';

export function clear(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function header(title: string): void {
  const line = '─'.repeat(50);
  process.stdout.write(`\n${BOLD}${CYAN}  ${title}${RESET}\n  ${DIM}${line}${RESET}\n`);
}

export function hr(): void {
  process.stdout.write(`  ${DIM}${'─'.repeat(50)}${RESET}\n`);
}

export function enableAnsiWindows(): void {
  if (process.platform === 'win32') {
    try { process.stdout.write('\x1b[?25h'); } catch (_) {}
  }
}

export function getch(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (buf: Buffer) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(buf.toString('utf8').toLowerCase());
    });
  });
}

export function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, (ans: string) => {
      rl.close();
      resolve(ans);
    });
  });
}

export function getchTimeout(ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { process.stdin.setRawMode(false); process.stdin.pause(); } catch (_) {}
        resolve(null);
      }
    }, ms);
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', (buf: Buffer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          try { process.stdin.setRawMode(false); process.stdin.pause(); } catch (_) {}
          resolve(buf.toString('utf8').toLowerCase());
        }
      });
    } catch (_) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
