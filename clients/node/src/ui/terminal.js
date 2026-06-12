'use strict';

const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const CYAN  = '\x1b[36m';

function clear() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function header(title) {
  const line = '─'.repeat(50);
  process.stdout.write(`\n${BOLD}${CYAN}  ${title}${RESET}\n  ${DIM}${line}${RESET}\n`);
}

function hr() {
  process.stdout.write(`  ${DIM}${'─'.repeat(50)}${RESET}\n`);
}

function enableAnsiWindows() {
  if (process.platform === 'win32') {
    try {
      process.stdout.write('\x1b[?25h');
    } catch (_) {}
  }
}

function getch() {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (buf) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(buf.toString('utf8').toLowerCase());
    });
  });
}

// Like getch() but resolves null after ms if no key is pressed.
function getchTimeout(ms) {
  if (!process.stdin.isTTY) return new Promise(r => setTimeout(() => r(null), ms));
  return new Promise(resolve => {
    let done = false;
    const onData = buf => {
      if (done) return;
      done = true;
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(buf.toString('utf8').toLowerCase());
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    setTimeout(() => {
      if (done) return;
      done = true;
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(null);
    }, ms);
  });
}

function question(prompt) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

module.exports = { clear, header, hr, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM, GREEN, YELLOW, CYAN };
