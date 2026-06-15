# CLI P2P Board Game Framework — Node.js Client

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Node.js client so the framework core lives in `framework/`, game implementations live in `games/`, and `main.js` is a ~50-line thin shell.

**Architecture:** A new `GameEngine` class in `framework/engine.js` owns the game loop, turn management, move parsing, and chat — extracted from `main.js`. Each game gains `parseInput` and `getHelp` methods (per-game natural input parsing and help, moved out of `main.js`). `loadState` already exists but is standardized. `main.js` creates an engine, wires client networking, and calls `engine.run()`.

**Tech Stack:** Node.js 18+, stdlib only (`node:test` for tests)

---

## File Map

**New files:**
- `clients/node/src/framework/engine.js` — GameEngine class

**Moved files (git mv):**
- `src/net/` → `src/framework/net/`
- `src/lobby/` → `src/framework/lobby/`
- `src/ui/` → `src/framework/ui/`
- `src/i18n.js` → `src/framework/i18n.js`
- `src/chat.js` → `src/framework/chat.js`
- `src/config.js` → `src/framework/config.js`

**Modified files:**
- `src/games/base.js` — add `parseInput`, `getHelp` to interface
- `src/main.js` — rewrite as thin shell; remove `parseMove`, `GAME_HELP`, `showGameHelp`, `gameLoop`
- `src/framework/ui/lobby_screen.js` — no change needed (already passes `myName` to `renderGame`)
- All 11 game files — add `parseInput`, `getHelp`; standardize `loadState`; fix `require('../i18n')` → `require('../framework/i18n')`

---

### Task 1: Create `framework/` and move existing modules

**Files:**
- Create: `clients/node/src/framework/` directory
- Move: `src/net/` → `src/framework/net/`
- Move: `src/lobby/` → `src/framework/lobby/`
- Move: `src/ui/` → `src/framework/ui/`
- Move: `src/i18n.js` → `src/framework/i18n.js`
- Move: `src/chat.js` → `src/framework/chat.js`
- Move: `src/config.js` → `src/framework/config.js`

- [ ] **Step 1: Move files**

```bash
cd clients/node/src
mkdir -p framework/net framework/lobby framework/ui
git mv net/host.js framework/net/host.js
git mv net/client.js framework/net/client.js
git mv net/protocol.js framework/net/protocol.js
git mv lobby/discovery.js framework/lobby/discovery.js
git mv lobby/session.js framework/lobby/session.js
git mv ui/terminal.js framework/ui/terminal.js
git mv ui/lobby_screen.js framework/ui/lobby_screen.js
git mv i18n.js framework/i18n.js
git mv chat.js framework/chat.js
git mv config.js framework/config.js
rmdir net lobby ui 2>/dev/null || true
```

- [ ] **Step 2: Fix `require` paths inside moved files**

In `src/framework/ui/lobby_screen.js`, replace:
```javascript
const { header, hr, BOLD, RESET, DIM, GREEN } = require('./terminal');
const { GAMES } = require('../lobby/session');
const { t } = require('../i18n');
```
with:
```javascript
const { header, hr, BOLD, RESET, DIM, GREEN } = require('./terminal');
const { GAMES } = require('../lobby/session');
const { t } = require('../i18n');
```
(paths are relative within `framework/`, so `./terminal`, `../lobby/session`, `../i18n` are all correct — no change needed here.)

In `src/framework/lobby/session.js`, the game class `require` paths use relative paths like `../games/nim` — after the move, session.js is at `framework/lobby/session.js`, so game paths become `../../games/nim`. Update all game requires:
```javascript
// OLD: require('../games/nim')
// NEW: require('../../games/nim')
```
Do this for all 11 game imports in `loadGameClasses`.

In `src/framework/net/host.js` and `src/framework/net/client.js`, fix any internal cross-references if they exist (`require('../lobby/session')` → `require('../lobby/session')` stays correct since both are in `framework/`).

- [ ] **Step 3: Fix `require` paths in `main.js`**

```javascript
// OLD
const i18n = require('./i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./config');
const { Host } = require('./net/host');
const { Client } = require('./net/client');
const { MsgType } = require('./net/protocol');
const { Beacon, Listener } = require('./lobby/discovery');
const { loadGameClasses } = require('./lobby/session');
const { ChatLog } = require('./chat');
const { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } = require('./ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat, renderGame } = require('./ui/lobby_screen');

// NEW
const i18n = require('./framework/i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./framework/config');
const { Host } = require('./framework/net/host');
const { Client } = require('./framework/net/client');
const { MsgType } = require('./framework/net/protocol');
const { Beacon, Listener } = require('./framework/lobby/discovery');
const { loadGameClasses } = require('./framework/lobby/session');
const { ChatLog } = require('./framework/chat');
const { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } = require('./framework/ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat, renderGame } = require('./framework/ui/lobby_screen');
```

- [ ] **Step 4: Fix `require` in all game files**

In every file under `src/games/`, replace:
```javascript
const { t } = require('../i18n');
// with:
const { t } = require('../framework/i18n');
```

Also fix BaseGame require in each game file:
```javascript
// stays the same (base.js is still in src/games/)
const { BaseGame } = require('./base');
```

- [ ] **Step 5: Run tests to verify nothing broke**

```bash
cd clients/node
node --test
```

Expected: all 83 tests pass.

- [ ] **Step 6: Commit**

```bash
git add clients/node/
git commit -m "refactor(node): move framework modules into framework/ directory"
```

---

### Task 2: Update `games/base.js` with new interface methods

**Files:**
- Modify: `clients/node/src/games/base.js`

- [ ] **Step 1: Write updated `base.js`**

```javascript
'use strict';

class BaseGame {
  start(players) { this.players = players; this._over = false; this._winner = null; }
  validateMove(playerId, moveData) { throw new Error('not implemented'); }
  applyMove(playerId, moveData) { throw new Error('not implemented'); }
  render(perspective) { throw new Error('not implemented'); }
  getState(perspective) { throw new Error('not implemented'); }
  loadState(data, perspective) { throw new Error('not implemented'); }
  isOver() { throw new Error('not implemented'); }
  currentTurn() { throw new Error('not implemented'); }
  parseInput(raw) { throw new Error('not implemented'); }
  getHelp() { throw new Error('not implemented'); }
}

module.exports = { BaseGame };
```

- [ ] **Step 2: Run tests**

```bash
cd clients/node
node --test
```

Expected: 83 tests pass (existing games override the new methods individually or through their existing impl — the throw only fires if called without override).

- [ ] **Step 3: Commit**

```bash
git add clients/node/src/games/base.js
git commit -m "refactor(node): add parseInput, getHelp, loadState to BaseGame interface"
```

---

### Task 3: Write `framework/engine.js`

**Files:**
- Create: `clients/node/src/framework/engine.js`

- [ ] **Step 1: Write the engine**

```javascript
'use strict';

const { MsgType } = require('./net/protocol');
const { loadGameClasses } = require('./lobby/session');
const { clear, header, question, getchTimeout, BOLD, RESET, DIM } = require('./ui/terminal');
const { renderGame } = require('./ui/lobby_screen');
const { t } = require('./i18n');

class GameEngine {
  constructor({ name, chatLog }) {
    this.name = name;
    this.chatLog = chatLog;
    this.sendMove = null;   // set by caller after construction
    this.sendChat = null;   // set by caller after construction
    this.gameObj = null;
    this.players = [];
    this._lastSnap = null;
  }

  // ── network callback ──────────────────────────────────────────────────

  onMessage(msg) {
    const type = msg.type;
    if (type === MsgType.CHAT) {
      this.chatLog.add(msg.from || '?', msg.text || '');
    } else if (type === MsgType.PLAYER_LIST) {
      const newPlayers = msg.players || [];
      if (this.gameObj && !this.gameObj._over && this.players.length > newPlayers.length) {
        const leaver = this.players.find(p => !newPlayers.includes(p));
        if (leaver) {
          this.gameObj._over = true;
          this.gameObj._winner = newPlayers[0] || null;
          this.gameObj._forfeitedBy = leaver;
        }
      }
      this.players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game;
      if (classes[gname]) {
        this.gameObj = new classes[gname]();
        this.gameObj.start(msg.players || []);
      }
    } else if (type === MsgType.STATE) {
      if (this.gameObj && typeof this.gameObj.loadState === 'function') {
        this.gameObj.loadState(msg.data || {}, this.name);
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = msg.winner || null;
      }
    }
  }

  // ── main loop ─────────────────────────────────────────────────────────

  async run() {
    this._lastSnap = null;
    while (true) {
      const gameObj = this.gameObj;
      if (!gameObj) {
        const s = this._snap();
        if (s !== this._lastSnap) { clear(); header(t('game.waiting')); this._lastSnap = s; }
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const s = this._snap();
      if (s !== this._lastSnap) {
        clear();
        renderGame(gameObj, this.players, this.chatLog.recent(3), this.name);
        this._lastSnap = s;
      }

      const [done, winner] = gameObj.isOver();
      if (done) {
        clear();
        header(t('game.over'));
        let endMsg;
        if (gameObj._forfeitedBy) {
          endMsg = `${gameObj._forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`;
        } else {
          endMsg = winner ? t('game.winner', { winner }) : t('game.draw');
        }
        console.log(`\n  ${BOLD}${endMsg}${RESET}\n`);
        await question('  ' + t('game.continue'));
        return;
      }

      if (gameObj.currentTurn() === this.name) {
        const raw = await question(t('game.move_prompt'));
        if (!raw.trim()) { this._lastSnap = null; continue; }

        const cmd = raw.trim().toLowerCase();
        if (cmd === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await new Promise(r => setTimeout(r, 60));
          }
          this._lastSnap = null;
          continue;
        }
        if (cmd === '?') {
          this._showHelp(gameObj);
          await question(t('game.continue'));
          this._lastSnap = null;
          continue;
        }

        const parsed = gameObj.parseInput(raw.trim());
        if (!parsed) {
          console.log(`\n  ${DIM}Unrecognized input — type ? for help${RESET}\n`);
          await new Promise(r => setTimeout(r, 1200));
          this._lastSnap = null;
          continue;
        }
        if (this.sendMove) this.sendMove(parsed);
        this._lastSnap = null;
      } else {
        const ch = await getchTimeout(150);
        if (ch === 't') {
          const msg = await question(t('game.chat_prompt'));
          if (msg.trim() && this.sendChat) {
            this.sendChat(msg.trim());
            await new Promise(r => setTimeout(r, 60));
          }
          this._lastSnap = null;
        } else if (ch === '?') {
          this._showHelp(gameObj);
          await question(t('game.continue'));
          this._lastSnap = null;
        }
      }
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────

  _snap() {
    const g = this.gameObj;
    if (!g) return '__waiting__';
    const chats = this.chatLog.recent(3).map(e => `${e.from}:${e.text}`).join('|');
    return JSON.stringify(g.getState(this.name)) + '|' + chats;
  }

  _showHelp(gameObj) {
    clear();
    header('? Help');
    const lines = gameObj.getHelp();
    lines.forEach(l => console.log(`  ${l}`));
    console.log();
    console.log(`  ${DIM}t = chat   ? = this help${RESET}`);
    console.log();
  }
}

module.exports = { GameEngine };
```

- [ ] **Step 2: Commit**

```bash
git add clients/node/src/framework/engine.js
git commit -m "feat(node): add GameEngine"
```

---

### Task 4: Rewrite `main.js` as thin shell

**Files:**
- Modify: `clients/node/src/main.js`

- [ ] **Step 1: Write thin `main.js`**

```javascript
#!/usr/bin/env node
'use strict';

const i18n = require('./framework/i18n');
const { t, setLocale } = i18n;
const { loadPort } = require('./framework/config');
const { Host } = require('./framework/net/host');
const { Client } = require('./framework/net/client');
const { MsgType } = require('./framework/net/protocol');
const { Beacon, Listener } = require('./framework/lobby/discovery');
const { ChatLog } = require('./framework/chat');
const { clear, header, getch, question, enableAnsiWindows } = require('./framework/ui/terminal');
const { showLobby, promptHost, promptJoin, promptChat } = require('./framework/ui/lobby_screen');
const { GameEngine } = require('./framework/engine');

async function runGame(ip, port, name, chatLog) {
  const engine = new GameEngine({ name, chatLog });
  const clientObj = new Client(ip, port, name, msg => engine.onMessage(msg));
  engine.sendMove = data => clientObj.send({ type: MsgType.MOVE, from: name, data });
  engine.sendChat = text => clientObj.send({ type: MsgType.CHAT, from: name, text });
  await clientObj.connect();
  await new Promise(r => setTimeout(r, 200));
  await engine.run();
}

async function main() {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  if (langIdx !== -1 && args[langIdx + 1]) setLocale(args[langIdx + 1]);

  enableAnsiWindows();

  const port = loadPort(args);
  let playerName = null;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) playerName = args[nameIdx + 1];
  if (!playerName) {
    playerName = await question(t('prompt.name'));
    playerName = playerName.trim() || t('prompt.default_name');
  }

  const chatLog = new ChatLog();
  const listener = new Listener({ port });
  listener.start();

  // --host / --join fast-path flags
  const hostFlagIdx = args.indexOf('--host');
  if (hostFlagIdx !== -1 && args[hostFlagIdx + 1]) {
    const gameName = args[hostFlagIdx + 1];
    const hostObj = new Host({ port, gameName, maxPlayers: 2 });
    await hostObj.start();
    const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers: 2 });
    beacon.start();
    await runGame('127.0.0.1', port, playerName, chatLog);
    process.exit(0);
  }

  const joinFlagIdx = args.indexOf('--join');
  if (joinFlagIdx !== -1 && args[joinFlagIdx + 1]) {
    const joinPort = parseInt(args[joinFlagIdx + 1], 10);
    await runGame('127.0.0.1', joinPort, playerName, chatLog);
    process.exit(0);
  }

  // lobby loop
  let running = true;
  while (running) {
    clear();
    const sessions = listener.getSessions();
    showLobby(sessions, playerName, chatLog.recent(5));
    const ch = await getch();

    if (ch === 't') {
      const msg = await promptChat(playerName, { question });
      // lobby chat: no client yet; skip

    } else if (ch === 'h') {
      const [gameName, maxPlayers] = await promptHost(playerName, { question });
      if (!gameName) continue;
      const hostObj = new Host({ port, gameName, maxPlayers });
      await hostObj.start();
      const beacon = new Beacon({ port, host: playerName, game: gameName, players: [], maxPlayers });
      beacon.start();
      await runGame('127.0.0.1', port, playerName, chatLog);

    } else if (ch === 'j') {
      const session = await promptJoin(sessions, { question });
      if (!session) continue;
      await runGame(session.hostIp || session.host, session.port, playerName, chatLog);

    } else if (ch === 'q' || ch === '\x03') {
      running = false;
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
```

- [ ] **Step 2: Run tests**

```bash
cd clients/node
node --test
```

Expected: 83 tests pass.

- [ ] **Step 3: Commit**

```bash
git add clients/node/src/main.js
git commit -m "refactor(node): rewrite main.js as thin shell using GameEngine"
```

---

### Task 5: Add `parseInput` and `getHelp` to `games/nim.js`

**Files:**
- Modify: `clients/node/src/games/nim.js`
- Test: `clients/node/test/nim.test.js` (create if doesn't exist, or modify existing)

- [ ] **Step 1: Add tests**

In the existing Nim test file (check `clients/node/test/` for the filename):
```javascript
// Add these test cases
test('parseInput pile count', () => {
  const g = new Nim(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('0 2'), { pile: 0, count: 2 });
});
test('parseInput json fallback', () => {
  const g = new Nim(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('{"pile":1,"count":3}'), { pile: 1, count: 3 });
});
test('parseInput invalid returns null', () => {
  const g = new Nim(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  const g = new Nim(); g.start(['a','b']);
  assert.ok(g.getHelp().length >= 2);
});
test('loadState round-trips', () => {
  const g = new Nim(); g.start(['a','b']);
  g.applyMove('a', { pile: 0, count: 2 });
  const state = g.getState();
  const g2 = new Nim(); g2.start(['a','b']);
  g2.loadState(state);
  assert.deepStrictEqual(g2.piles, g.piles);
  assert.strictEqual(g2.currentTurn(), 'b');
});
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
cd clients/node
node --test 2>&1 | grep -E 'parseInput|getHelp|loadState|fail'
```

- [ ] **Step 3: Add `parseInput` and `getHelp` to `games/nim.js`**

Add inside the `Nim` class (keep all existing methods):
```javascript
  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const pile = Number(parts[0]), count = Number(parts[1]);
      if (!isNaN(pile) && !isNaN(count)) return { pile, count };
    }
    return null;
  }

  getHelp() {
    return [
      'Take ≥1 stone from exactly one pile each turn. Last to take wins.',
      'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
    ];
  }
```

Also fix the `require` at top of nim.js:
```javascript
// const { t } = require('../i18n');
const { t } = require('../framework/i18n');
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
cd clients/node
node --test
```

- [ ] **Step 5: Commit**

```bash
git add clients/node/src/games/nim.js
git commit -m "feat(node): add parseInput, getHelp to Nim"
```

---

### Task 6: Add `parseInput` and `getHelp` to `games/mastermind.js`

**Files:**
- Modify: `clients/node/src/games/mastermind.js`

- [ ] **Step 1: Add tests** (in existing mastermind test file)

```javascript
test('parseInput spaced digits returns guess', () => {
  const g = new Mastermind(); g.start(['a','b']); g._code = [1,2,3,4];
  assert.deepStrictEqual(g.parseInput('1 2 3 4'), { guess: [1,2,3,4] });
});
test('parseInput compact 4-digit string', () => {
  const g = new Mastermind(); g.start(['a','b']); g._code = [1,2,3,4];
  assert.deepStrictEqual(g.parseInput('5612'), { guess: [5,6,1,2] });
});
test('parseInput code phase', () => {
  const g = new Mastermind(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('1 2 3 4'), { code: [1,2,3,4] });
});
test('parseInput invalid returns null', () => {
  const g = new Mastermind(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('abc'), null);
});
test('getHelp returns array', () => {
  const g = new Mastermind(); g.start(['a','b']);
  assert.ok(g.getHelp().length >= 3);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
cd clients/node && node --test 2>&1 | grep -i 'fail\|parseInput\|getHelp'
```

- [ ] **Step 3: Add methods to `games/mastermind.js`**

Fix require and add inside the `Mastermind` class:
```javascript
// const { t } = require('../i18n');
const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    let digits = null;
    if (parts.length === 4) {
      const nums = parts.map(Number);
      if (nums.every(n => !isNaN(n))) digits = nums;
    } else if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
      digits = parts[0].split('').map(Number);
    }
    if (digits && digits.length === 4) {
      return this._code === null ? { code: digits } : { guess: digits };
    }
    return null;
  }

  getHelp() {
    return [
      'Guess the secret 4-digit code (digits 1–6).',
      'B = right digit + right position.  W = right digit, wrong position.',
      'Move: <d1> <d2> <d3> <d4>   e.g. "1 2 3 4"  or  "1234"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
cd clients/node && node --test
```

- [ ] **Step 5: Commit**

```bash
git add clients/node/src/games/mastermind.js
git commit -m "feat(node): add parseInput, getHelp to Mastermind"
```

---

### Task 7: Add `parseInput` and `getHelp` to `games/connect_four.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput col number', () => {
  const g = new ConnectFour(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3'), { col: 3 });
});
test('parseInput invalid returns null', () => {
  const g = new ConnectFour(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('abc'), null);
});
test('getHelp returns array', () => {
  assert.ok(new ConnectFour().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/connect_four.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const n = Number(trimmed.split(/\s+/)[0]);
    return isNaN(n) ? null : { col: n };
  }

  getHelp() {
    return [
      'Drop a piece into a column. First to connect 4 in a row wins.',
      'Move: <col>   e.g. "3"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/connect_four.js && git commit -m "feat(node): add parseInput, getHelp to ConnectFour"`

---

### Task 8: Add `parseInput` and `getHelp` to `games/othello.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput row col', () => {
  const g = new Othello(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 4'), { row: 3, col: 4 });
});
test('parseInput pass', () => {
  const g = new Othello(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('pass'), { pass: true });
});
test('parseInput invalid returns null', () => {
  const g = new Othello(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Othello().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/othello.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === 'pass') return { pass: true };
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const row = Number(parts[0]), col = Number(parts[1]);
      if (!isNaN(row) && !isNaN(col)) return { row, col };
    }
    return null;
  }

  getHelp() {
    return [
      'Place a disc to flip opponent pieces sandwiched between yours.',
      'Player with the most discs when the board is full wins.',
      'Move: <row> <col>   e.g. "3 4"   or   "pass"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/othello.js && git commit -m "feat(node): add parseInput, getHelp to Othello"`

---

### Task 9: Add `parseInput` and `getHelp` to `games/checkers.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput four numbers', () => {
  const g = new Checkers(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('2 3 4 5'), { from: [2,3], to: [4,5] });
});
test('parseInput invalid returns null', () => {
  const g = new Checkers(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('abc'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Checkers().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/checkers.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 4) {
      const nums = parts.map(Number);
      if (nums.every(n => !isNaN(n))) return { from: [nums[0], nums[1]], to: [nums[2], nums[3]] };
    }
    return null;
  }

  getHelp() {
    return [
      'Jump over opponent pieces to capture them. Multi-jump if possible.',
      'Reach the far end to become a king (can move backwards).',
      'Move: <fromRow> <fromCol> <toRow> <toCol>   e.g. "2 3 4 5"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/checkers.js && git commit -m "feat(node): add parseInput, getHelp to Checkers"`

---

### Task 10: Add `parseInput` and `getHelp` to `games/chess.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput from-to squares', () => {
  const g = new Chess(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('e2 e4'), { from: 'e2', to: 'e4' });
});
test('parseInput invalid returns null', () => {
  const g = new Chess(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Chess().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/chess.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) return { from: parts[0], to: parts[1] };
    return null;
  }

  getHelp() {
    return [
      'Standard chess. Castling, en passant, and promotion all supported.',
      'Move: <from> <to>   e.g. "e2 e4"   castle: "e1 g1"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/chess.js && git commit -m "feat(node): add parseInput, getHelp to Chess"`

---

### Task 11: Add `parseInput` and `getHelp` to `games/battleship.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput place h', () => {
  const g = new Battleship(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 4 h'), { place: { row:3, col:4, horiz:true } });
});
test('parseInput place v', () => {
  const g = new Battleship(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 4 v'), { place: { row:3, col:4, horiz:false } });
});
test('parseInput shot in battle phase', () => {
  const g = new Battleship(); g.start(['a','b']); g._phase = 'battle';
  assert.deepStrictEqual(g.parseInput('5 6'), { shot: { row:5, col:6 } });
});
test('parseInput invalid returns null', () => {
  const g = new Battleship(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('abc'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Battleship().getHelp().length >= 3);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/battleship.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 3) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        return { place: { row: r, col: c, horiz: parts[2].toLowerCase() !== 'v' } };
      }
    }
    if (parts.length === 2) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        if (this._phase === 'place') return { place: { row: r, col: c, horiz: true } };
        return { shot: { row: r, col: c } };
      }
    }
    return null;
  }

  getHelp() {
    return [
      'Place ships secretly, then take turns calling coordinates to sink them.',
      'Place ship: <row> <col> <h|v>   e.g. "3 4 h"  (or "3 4 v" for vertical)',
      'Shoot:      <row> <col>          e.g. "3 4"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/battleship.js && git commit -m "feat(node): add parseInput, getHelp to Battleship"`

---

### Task 12: Add `parseInput` and `getHelp` to `games/go.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput row col', () => {
  const g = new Go(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 4'), { row:3, col:4 });
});
test('parseInput pass', () => {
  const g = new Go(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('pass'), { pass: true });
});
test('parseInput invalid returns null', () => {
  const g = new Go(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Go().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/go.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === 'pass') return { pass: true };
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const row = Number(parts[0]), col = Number(parts[1]);
      if (!isNaN(row) && !isNaN(col)) return { row, col };
    }
    return null;
  }

  getHelp() {
    return [
      'Place stones to surround territory on a 9×9 board. Ko rule enforced.',
      'Higher score (territory + captures) wins.',
      'Move: <row> <col>   e.g. "3 4"   or   "pass"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/go.js && git commit -m "feat(node): add parseInput, getHelp to Go"`

---

### Task 13: Add `parseInput` and `getHelp` to `games/hex_game.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput row col', () => {
  const g = new Hex(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 4'), { row:3, col:4 });
});
test('parseInput invalid returns null', () => {
  const g = new Hex(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Hex().getHelp().length >= 2);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/hex_game.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const row = Number(parts[0]), col = Number(parts[1]);
      if (!isNaN(row) && !isNaN(col)) return { row, col };
    }
    return null;
  }

  getHelp() {
    return [
      'Connect your two opposite sides of the 11×11 board. No draws.',
      'Move: <row> <col>   e.g. "3 4"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/hex_game.js && git commit -m "feat(node): add parseInput, getHelp to Hex"`

---

### Task 14: Add `parseInput` and `getHelp` to `games/quoridor.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput direction s', () => {
  const g = new Quoridor(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('s'), { move: 'S' });
});
test('parseInput wall h', () => {
  const g = new Quoridor(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 2 h'), { wall: { row:3, col:2, horiz:true } });
});
test('parseInput wall v', () => {
  const g = new Quoridor(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('3 2 v'), { wall: { row:3, col:2, horiz:false } });
});
test('parseInput invalid returns null', () => {
  const g = new Quoridor(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('xyz'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Quoridor().getHelp().length >= 3);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/quoridor.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1 && /^[nsewNSEW]$/.test(parts[0])) {
      return { move: parts[0].toUpperCase() };
    }
    if (parts.length === 3) {
      const r = Number(parts[0]), c = Number(parts[1]);
      if (!isNaN(r) && !isNaN(c)) {
        return { wall: { row: r, col: c, horiz: parts[2].toLowerCase() === 'h' } };
      }
    }
    return null;
  }

  getHelp() {
    return [
      'Race your pawn to the opposite side of the 9×9 board.',
      'Place walls to block opponents, but never seal off someone completely.',
      'Move pawn: n / s / e / w   e.g. "s"',
      'Place wall: <row> <col> <h|v>   e.g. "3 2 h"  (or "3 2 v" for vertical)',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/quoridor.js && git commit -m "feat(node): add parseInput, getHelp to Quoridor"`

---

### Task 15: Add `parseInput` and `getHelp` to `games/mancala.js`

- [ ] **Step 1: Add tests**

```javascript
test('parseInput pit number', () => {
  const g = new Mancala(); g.start(['a','b']);
  assert.deepStrictEqual(g.parseInput('2'), { pit: 2 });
});
test('parseInput invalid returns null', () => {
  const g = new Mancala(); g.start(['a','b']);
  assert.strictEqual(g.parseInput('abc'), null);
});
test('getHelp returns array', () => {
  assert.ok(new Mancala().getHelp().length >= 3);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/mancala.js`**

```javascript
// Fix require: const { t } = require('../framework/i18n');

  parseInput(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch (_) {}
    }
    const n = Number(trimmed.split(/\s+/)[0]);
    return isNaN(n) ? null : { pit: n };
  }

  getHelp() {
    return [
      'Board shows  [0]:4  [1]:4  [2]:4  [3]:4  [4]:4  [5]:4  store=N',
      'Pick a pit index 0–5 to sow its seeds counter-clockwise.',
      'Land in your store → free turn.  Land in your own empty pit → capture opposite.',
      'Move: <pit>   e.g. "2"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `cd clients/node && node --test`

- [ ] **Step 5: Commit** — `git add clients/node/src/games/mancala.js && git commit -m "feat(node): add parseInput, getHelp to Mancala"`

---

### Task 16: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd clients/node
node --test
```

Expected: all tests pass (original 83 + new tests from tasks 5–15). Count should be ≥ 110.

- [ ] **Step 2: Smoke test**

```bash
node src/main.js --name alice --port 9000
```

Verify: lobby appears, host a game, `?` shows per-game help.

- [ ] **Step 3: Final commit**

```bash
git add clients/node/
git commit -m "feat(node): complete framework restructure — GameEngine + 11 games with full interface"
```
