# CLI P2P Board Game Framework — Bun/TypeScript Client

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Bun/TypeScript client so the framework core lives in `framework/`, game implementations live in `games/`, and `main.ts` is a ~60-line thin shell.

**Architecture:** Mirrors the Node.js plan exactly, in TypeScript. A new `GameEngine` class in `framework/engine.ts` owns the game loop. Each game gains `parseInput` and `getHelp` methods. `main.ts` creates an engine, wires client networking, and calls `engine.run()`. TypeScript interfaces enforce the contract.

**Tech Stack:** Bun 1.0+, TypeScript, `bun:test`

---

## File Map

**New files:**
- `clients/bun/src/framework/engine.ts` — GameEngine class

**Moved files (git mv):**
- `src/net/` → `src/framework/net/`
- `src/lobby/` → `src/framework/lobby/`
- `src/ui/` → `src/framework/ui/`
- `src/i18n.ts` → `src/framework/i18n.ts`
- `src/chat.ts` → `src/framework/chat.ts`
- `src/config.ts` → `src/framework/config.ts`

**Modified files:**
- `src/games/base.ts` — add `parseInput`, `getHelp`, `loadState` to interface
- `src/main.ts` — rewrite as thin shell
- All 11 game files — add `parseInput`, `getHelp`; fix `import '../i18n'` → `import '../framework/i18n'`

---

### Task 1: Create `framework/` and move existing modules

- [ ] **Step 1: Move files**

```bash
cd clients/bun/src
mkdir -p framework/net framework/lobby framework/ui
git mv net/host.ts framework/net/host.ts
git mv net/client.ts framework/net/client.ts
git mv net/protocol.ts framework/net/protocol.ts
git mv lobby/discovery.ts framework/lobby/discovery.ts
git mv lobby/session.ts framework/lobby/session.ts
git mv ui/terminal.ts framework/ui/terminal.ts
git mv ui/lobby_screen.ts framework/ui/lobby_screen.ts
git mv i18n.ts framework/i18n.ts
git mv chat.ts framework/chat.ts
git mv config.ts framework/config.ts
rmdir net lobby ui 2>/dev/null || true
```

- [ ] **Step 2: Fix import paths inside moved files**

In `src/framework/ui/lobby_screen.ts`:
```typescript
// imports are relative within framework/, adjust if needed:
import { header, hr, BOLD, RESET, DIM, GREEN } from './terminal';
import { GAMES } from '../lobby/session';
import { t } from '../i18n';
```

In `src/framework/lobby/session.ts`, game class imports change from `../games/nim` to `../../games/nim`:
```typescript
// OLD: import { Nim } from '../games/nim';
// NEW: import { Nim } from '../../games/nim';
// Repeat for all 11 games
```

- [ ] **Step 3: Fix imports in `main.ts`**

```typescript
// OLD
import i18n, { t, setLocale } from './i18n';
import { loadPort } from './config';
import { Host } from './net/host';
import { Client } from './net/client';
import { MsgType } from './net/protocol';
import { Beacon, Listener } from './lobby/discovery';
import { ChatLog } from './chat';
import { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } from './ui/terminal';
import { showLobby, promptHost, promptJoin, promptChat, renderGame } from './ui/lobby_screen';

// NEW
import i18n, { t, setLocale } from './framework/i18n';
import { loadPort } from './framework/config';
import { Host } from './framework/net/host';
import { Client } from './framework/net/client';
import { MsgType } from './framework/net/protocol';
import { Beacon, Listener } from './framework/lobby/discovery';
import { ChatLog } from './framework/chat';
import { clear, header, getch, getchTimeout, question, enableAnsiWindows, BOLD, RESET, DIM } from './framework/ui/terminal';
import { showLobby, promptHost, promptJoin, promptChat, renderGame } from './framework/ui/lobby_screen';
```

- [ ] **Step 4: Fix imports in all 11 game files**

In every file under `src/games/`, replace:
```typescript
import { t } from '../i18n';
// with:
import { t } from '../framework/i18n';
```

- [ ] **Step 5: Run tests to verify nothing broke**

```bash
cd clients/bun
bun test
```

Expected: 77 tests pass.

- [ ] **Step 6: Commit**

```bash
git add clients/bun/
git commit -m "refactor(bun): move framework modules into framework/ directory"
```

---

### Task 2: Update `games/base.ts` with new interface

**Files:**
- Modify: `clients/bun/src/games/base.ts`

- [ ] **Step 1: Write updated `base.ts`**

```typescript
export interface BaseGame {
  players: string[];
  _over: boolean;
  _winner: string | null;

  start(players: string[]): void;
  validateMove(playerId: string, moveData: Record<string, unknown>): boolean;
  applyMove(playerId: string, moveData: Record<string, unknown>): void;
  render(perspective?: string): string;
  getState(perspective?: string): Record<string, unknown>;
  loadState(data: Record<string, unknown>, perspective?: string): void;
  isOver(): [boolean, string | null];
  currentTurn(): string | null;
  parseInput(raw: string): Record<string, unknown> | null;
  getHelp(): string[];
}

export abstract class BaseGameImpl implements BaseGame {
  players: string[] = [];
  _over = false;
  _winner: string | null = null;

  start(players: string[]): void {
    this.players = players;
    this._over = false;
    this._winner = null;
  }

  abstract validateMove(playerId: string, moveData: Record<string, unknown>): boolean;
  abstract applyMove(playerId: string, moveData: Record<string, unknown>): void;
  abstract render(perspective?: string): string;
  abstract getState(perspective?: string): Record<string, unknown>;
  abstract loadState(data: Record<string, unknown>, perspective?: string): void;
  abstract isOver(): [boolean, string | null];
  abstract currentTurn(): string | null;
  abstract parseInput(raw: string): Record<string, unknown> | null;
  abstract getHelp(): string[];
}
```

- [ ] **Step 2: Update all game files to extend `BaseGameImpl` instead of any old base**

In each game file, change:
```typescript
// OLD (if it exists)
import { BaseGame } from './base';
class Nim extends BaseGame { ... }

// NEW
import { BaseGameImpl } from './base';
class Nim extends BaseGameImpl { ... }
```

- [ ] **Step 3: Run tests**

```bash
cd clients/bun && bun test
```

Expected: 77 tests pass.

- [ ] **Step 4: Commit**

```bash
git add clients/bun/src/games/base.ts
git commit -m "refactor(bun): update BaseGame interface with parseInput, getHelp, loadState"
```

---

### Task 3: Write `framework/engine.ts`

**Files:**
- Create: `clients/bun/src/framework/engine.ts`

- [ ] **Step 1: Write the engine**

```typescript
import { MsgType } from './net/protocol';
import { loadGameClasses } from './lobby/session';
import { clear, header, question, getchTimeout, BOLD, RESET, DIM } from './ui/terminal';
import { renderGame } from './ui/lobby_screen';
import { t } from './i18n';
import type { ChatLog } from './chat';
import type { BaseGame } from '../games/base';

interface EngineOptions {
  name: string;
  chatLog: ChatLog;
}

export class GameEngine {
  name: string;
  chatLog: ChatLog;
  sendMove: ((data: unknown) => void) | null = null;
  sendChat: ((text: string) => void) | null = null;
  gameObj: BaseGame | null = null;
  players: string[] = [];
  private _lastSnap: string | null = null;

  constructor({ name, chatLog }: EngineOptions) {
    this.name = name;
    this.chatLog = chatLog;
  }

  onMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    if (type === MsgType.CHAT) {
      this.chatLog.add((msg.from as string) || '?', (msg.text as string) || '');
    } else if (type === MsgType.PLAYER_LIST) {
      const newPlayers = (msg.players as string[]) || [];
      if (this.gameObj && !this.gameObj._over && this.players.length > newPlayers.length) {
        const leaver = this.players.find(p => !newPlayers.includes(p));
        if (leaver) {
          this.gameObj._over = true;
          this.gameObj._winner = newPlayers[0] || null;
          (this.gameObj as any)._forfeitedBy = leaver;
        }
      }
      this.players = newPlayers;
    } else if (type === MsgType.GAME_START) {
      const classes = loadGameClasses();
      const gname = msg.game as string;
      if (classes[gname]) {
        this.gameObj = new classes[gname]();
        this.gameObj!.start((msg.players as string[]) || []);
      }
    } else if (type === MsgType.STATE) {
      if (this.gameObj) {
        this.gameObj.loadState((msg.data as Record<string, unknown>) || {}, this.name);
      }
    } else if (type === MsgType.GAME_OVER) {
      if (this.gameObj) {
        this.gameObj._over = true;
        this.gameObj._winner = (msg.winner as string) || null;
      }
    }
  }

  async run(): Promise<void> {
    this._lastSnap = null;
    while (true) {
      const gameObj = this.gameObj;
      if (!gameObj) {
        const s = this._snap();
        if (s !== this._lastSnap) { clear(); header(t('game.waiting')); this._lastSnap = s; }
        await Bun.sleep(500);
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
        const forfeitedBy = (gameObj as any)._forfeitedBy as string | undefined;
        const endMsg = forfeitedBy
          ? `${forfeitedBy} disconnected. ${winner ? winner + ' wins by forfeit!' : ''}`
          : winner ? t('game.winner', { winner }) : t('game.draw');
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
            await Bun.sleep(60);
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
          await Bun.sleep(1200);
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
            await Bun.sleep(60);
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

  private _snap(): string {
    const g = this.gameObj;
    if (!g) return '__waiting__';
    const chats = this.chatLog.recent(3).map((e: any) => `${e.from}:${e.text}`).join('|');
    return JSON.stringify(g.getState(this.name)) + '|' + chats;
  }

  private _showHelp(gameObj: BaseGame): void {
    clear();
    header('? Help');
    gameObj.getHelp().forEach(l => console.log(`  ${l}`));
    console.log();
    console.log(`  ${DIM}t = chat   ? = this help${RESET}`);
    console.log();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add clients/bun/src/framework/engine.ts
git commit -m "feat(bun): add GameEngine"
```

---

### Task 4: Rewrite `main.ts` as thin shell

**Files:**
- Modify: `clients/bun/src/main.ts`

- [ ] **Step 1: Write thin `main.ts`**

```typescript
import i18n, { t, setLocale } from './framework/i18n';
import { loadPort } from './framework/config';
import { Host } from './framework/net/host';
import { Client } from './framework/net/client';
import { MsgType } from './framework/net/protocol';
import { Beacon, Listener } from './framework/lobby/discovery';
import { ChatLog } from './framework/chat';
import { clear, header, getch, question, enableAnsiWindows } from './framework/ui/terminal';
import { showLobby, promptHost, promptJoin, promptChat } from './framework/ui/lobby_screen';
import { GameEngine } from './framework/engine';

async function runGame(ip: string, port: number, name: string, chatLog: ChatLog): Promise<void> {
  const engine = new GameEngine({ name, chatLog });
  const clientObj = new Client(ip, port, name, (msg: any) => engine.onMessage(msg));
  engine.sendMove = (data: unknown) => clientObj.send({ type: MsgType.MOVE, from: name, data });
  engine.sendChat = (text: string) => clientObj.send({ type: MsgType.CHAT, from: name, text });
  await clientObj.connect();
  await Bun.sleep(200);
  await engine.run();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  if (langIdx !== -1 && args[langIdx + 1]) setLocale(args[langIdx + 1]);

  enableAnsiWindows();

  const port = loadPort(args);
  let playerName: string | null = null;
  const nameIdx = args.indexOf('--name');
  if (nameIdx !== -1 && args[nameIdx + 1]) playerName = args[nameIdx + 1];
  if (!playerName) {
    playerName = await question(t('prompt.name'));
    playerName = playerName.trim() || t('prompt.default_name');
  }

  const chatLog = new ChatLog();
  const listener = new Listener({ port });
  listener.start();

  // --host / --join fast-path
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

  let running = true;
  while (running) {
    clear();
    const sessions = listener.getSessions();
    showLobby(sessions, playerName, chatLog.recent(5));
    const ch = await getch();

    if (ch === 'h') {
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
cd clients/bun && bun test
```

Expected: 77 tests pass.

- [ ] **Step 3: Commit**

```bash
git add clients/bun/src/main.ts
git commit -m "refactor(bun): rewrite main.ts as thin shell using GameEngine"
```

---

### Tasks 5–15: Add `parseInput` and `getHelp` to all 11 games

For each game, the pattern is identical: add `parseInput` and `getHelp` methods, fix the `i18n` import path, add a `loadState` implementation if missing.

The logic for each game mirrors the Node.js plan exactly (same behavior, just TypeScript syntax). Return type annotations: `parseInput` returns `Record<string, unknown> | null`, `getHelp` returns `string[]`, `loadState` returns `void`.

---

### Task 5: `games/nim.ts`

- [ ] **Step 1: Add tests** (in existing nim test file)

```typescript
test('parseInput pile count', () => {
  const g = new Nim(); g.start(['a','b']);
  expect(g.parseInput('0 2')).toEqual({ pile: 0, count: 2 });
});
test('parseInput invalid returns null', () => {
  const g = new Nim(); g.start(['a','b']);
  expect(g.parseInput('xyz')).toBeNull();
});
test('getHelp nonempty', () => {
  const g = new Nim(); g.start(['a','b']);
  expect(g.getHelp().length).toBeGreaterThanOrEqual(2);
});
test('loadState round-trips', () => {
  const g = new Nim(); g.start(['a','b']);
  g.applyMove('a', { pile: 0, count: 2 });
  const state = g.getState() as any;
  const g2 = new Nim(); g2.start(['a','b']);
  g2.loadState(state);
  expect(g2.currentTurn()).toBe('b');
});
```

- [ ] **Step 2: Run new tests, confirm fail** — `bun test`

- [ ] **Step 3: Add methods to `games/nim.ts`**

```typescript
// Fix import: import { t } from '../framework/i18n';

  loadState(data: Record<string, unknown>, perspective?: string): void {
    if (!data) return;
    if (Array.isArray(data.piles)) this.piles = [...(data.piles as number[])];
    if (Array.isArray(data.players)) this.players = data.players as string[];
    if (data.turn != null) {
      const idx = this.players.indexOf(data.turn as string);
      this._turnIdx = idx >= 0 ? idx : 0;
    }
  }

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const pile = Number(parts[0]), count = Number(parts[1]);
      if (!isNaN(pile) && !isNaN(count)) return { pile, count };
    }
    return null;
  }

  getHelp(): string[] {
    return [
      'Take ≥1 stone from exactly one pile each turn. Last to take wins.',
      'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `bun test`

- [ ] **Step 5: Commit** — `git add clients/bun/src/games/nim.ts && git commit -m "feat(bun): add parseInput, getHelp, loadState to Nim"`

---

### Task 6: `games/mastermind.ts`

- [ ] **Step 1: Add tests**

```typescript
test('parseInput spaced digits returns guess', () => {
  const g = new Mastermind(); g.start(['a','b']); (g as any)._code = [1,2,3,4];
  expect(g.parseInput('1 2 3 4')).toEqual({ guess: [1,2,3,4] });
});
test('parseInput compact 4-digit', () => {
  const g = new Mastermind(); g.start(['a','b']); (g as any)._code = [1,2,3,4];
  expect(g.parseInput('5612')).toEqual({ guess: [5,6,1,2] });
});
test('parseInput code phase', () => {
  const g = new Mastermind(); g.start(['a','b']);
  expect(g.parseInput('1 2 3 4')).toEqual({ code: [1,2,3,4] });
});
test('parseInput invalid returns null', () => {
  const g = new Mastermind(); g.start(['a','b']);
  expect(g.parseInput('abc')).toBeNull();
});
test('getHelp nonempty', () => {
  expect(new Mastermind().getHelp().length).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 2: Run new tests, confirm fail**

- [ ] **Step 3: Add methods to `games/mastermind.ts`**

```typescript
// Fix import: import { t } from '../framework/i18n';

  parseInput(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { const obj = JSON.parse(trimmed); if (obj && typeof obj === 'object') return obj; } catch {}
    }
    const parts = trimmed.split(/\s+/);
    let digits: number[] | null = null;
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

  getHelp(): string[] {
    return [
      'Guess the secret 4-digit code (digits 1–6).',
      'B = right digit + right position.  W = right digit, wrong position.',
      'Move: <d1> <d2> <d3> <d4>   e.g. "1 2 3 4"  or  "1234"',
    ];
  }
```

- [ ] **Step 4: Run tests, confirm pass** — `bun test`

- [ ] **Step 5: Commit** — `git add clients/bun/src/games/mastermind.ts && git commit -m "feat(bun): add parseInput, getHelp to Mastermind"`

---

### Tasks 7–15: Remaining 9 games

For each of the remaining games, follow the same 5-step pattern (add tests → fail → implement → pass → commit). The `parseInput` / `getHelp` logic is identical to the Node.js plan (Task 7–15 in `2026-06-15-framework-node.md`), just with TypeScript type annotations added.

**Task 7: `games/connect_four.ts`**

parseInput: single number → `{ col: n }`. getHelp: 2 lines about Connect Four.
Commit: `"feat(bun): add parseInput, getHelp to ConnectFour"`

**Task 8: `games/othello.ts`**

parseInput: "pass" → `{ pass: true }`, two numbers → `{ row, col }`. getHelp: 3 lines.
Commit: `"feat(bun): add parseInput, getHelp to Othello"`

**Task 9: `games/checkers.ts`**

parseInput: four numbers → `{ from: [r,c], to: [r,c] }`. getHelp: 3 lines.
Commit: `"feat(bun): add parseInput, getHelp to Checkers"`

**Task 10: `games/chess.ts`**

parseInput: two tokens → `{ from: parts[0], to: parts[1] }`. getHelp: 2 lines.
Commit: `"feat(bun): add parseInput, getHelp to Chess"`

**Task 11: `games/battleship.ts`**

parseInput: 3 tokens with h/v → `{ place }`, 2 numbers → `{ shot }` or `{ place }` based on phase. getHelp: 3 lines.
Commit: `"feat(bun): add parseInput, getHelp to Battleship"`

**Task 12: `games/go.ts`**

parseInput: "pass" → `{ pass: true }`, two numbers → `{ row, col }`. getHelp: 3 lines.
Commit: `"feat(bun): add parseInput, getHelp to Go"`

**Task 13: `games/hex_game.ts`**

parseInput: two numbers → `{ row, col }`. getHelp: 2 lines.
Commit: `"feat(bun): add parseInput, getHelp to Hex"`

**Task 14: `games/quoridor.ts`**

parseInput: single n/s/e/w → `{ move: "N" }`, three tokens with h/v → `{ wall }`. getHelp: 4 lines.
Commit: `"feat(bun): add parseInput, getHelp to Quoridor"`

**Task 15: `games/mancala.ts`**

parseInput: single number → `{ pit: n }`. getHelp: 4 lines.
Commit: `"feat(bun): add parseInput, getHelp to Mancala"`

For each task, the test template is:
```typescript
import { describe, test, expect } from 'bun:test';
import { GameClass } from '../src/games/game_file';

test('parseInput valid', () => {
  const g = new GameClass(); g.start(['a','b']);
  // assert the expected output
});
test('parseInput invalid returns null', () => {
  const g = new GameClass(); g.start(['a','b']);
  expect(g.parseInput('xyz')).toBeNull();
});
test('getHelp nonempty', () => {
  expect(new GameClass().getHelp().length).toBeGreaterThanOrEqual(2);
});
```

---

### Task 16: Run full test suite, verify build

- [ ] **Step 1: Run all tests**

```bash
cd clients/bun
bun test
```

Expected: all tests pass (original 77 + new tests). Count should be ≥ 100.

- [ ] **Step 2: Build standalone exe**

```bash
bun run build
```

Expected: `dist/game-hub` binary created without errors.

- [ ] **Step 3: Smoke test**

```bash
bun run src/main.ts --name alice --port 9001
```

Verify: lobby appears, host a game, `?` shows per-game help.

- [ ] **Step 4: Final commit**

```bash
git add clients/bun/
git commit -m "feat(bun): complete framework restructure — GameEngine + 11 games with full interface"
```
