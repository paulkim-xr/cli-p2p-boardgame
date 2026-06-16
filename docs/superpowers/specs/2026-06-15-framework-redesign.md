# CLI P2P Board Game Framework — Redesign Spec

**Date:** 2026-06-15
**Status:** Approved

---

## Goal

Reshape the existing CLI P2P board game hub into a clean framework for local-network turn-based CLI games with chat support. The framework core (networking, lobby, turn management, rendering) is separated from game implementations. All 11 existing games are rewritten as examples against the new framework API. Three clients (Python, Node.js, Bun/TypeScript) are restructured in parallel, identically.

---

## Architecture

### Separation of Concerns

```
framework/    ← networking, lobby, engine, UI, i18n, chat
              knows nothing about any specific game
              stable code — rarely changes

games/        ← 11 game implementations + BaseGame interface
              knows nothing about networking
              pure state machine + renderer + input parser per game

main.*        ← ~30 lines: register games, instantiate engine, call run()
```

### Data Flow

```
Host side:   raw input
               → game.parseInput(raw)          → move object | null
               → game.validateMove(id, move)   → bool
               → game.applyMove(id, move)
               → engine broadcasts STATE to all clients

Client side: STATE received
               → game.loadState(data, perspective)
               → game.render(perspective)
```

The engine owns all protocol communication. Games never touch the network.

---

## Directory Structure

Identical layout across all three clients:

```
clients/node/src/
  framework/
    engine.js          ← game loop orchestrator (see Engine section)
    net/
      host.js          ← TCP server + relay
      client.js        ← TCP client
      protocol.js      ← MsgType constants
    lobby/
      discovery.js     ← UDP beacon + listener
      session.js       ← game class registry + loader
    ui/
      terminal.js      ← ANSI helpers, getch, question, clear, header
      lobby_screen.js  ← lobby render, promptHost, promptJoin, promptChat
    i18n.js
    chat.js
    config.js
  games/
    base.js            ← BaseGame interface + default implementations
    nim.js
    connect_four.js
    othello.js
    checkers.js
    chess.js
    battleship.js
    go.js
    hex_game.js
    quoridor.js
    mastermind.js
    mancala.js
  main.js              ← thin: import games, new GameEngine(...), engine.run()

clients/python/
  framework/           ← same structure
  games/               ← same structure
  main.py

clients/bun/src/
  framework/           ← same structure
  games/               ← same structure
  main.ts
```

---

## Game Interface (BaseGame)

Every game extends BaseGame and implements all methods. The framework calls these; games never call the framework.

```
start(players: string[]) → void
  Initialize all game state for this player list.

validateMove(playerId: string, moveData: object) → boolean
  Return true if the move is legal for this player in the current state.
  Called on the host only. Must not mutate state.

applyMove(playerId: string, moveData: object) → void
  Apply a validated move. Mutate state.
  Called on the host only, always after validateMove returns true.

getState(perspective: string) → object
  Return a JSON-serializable snapshot of game state for this player's perspective.
  Used by the host to broadcast state after each move.

loadState(data: object, perspective: string) → void
  Apply a received state snapshot. Replace internal state entirely.
  Called on clients when a STATE message arrives.

currentTurn() → string
  Return the player name whose turn it is.

isOver() → [boolean, string | null]
  Return [true, winnerName] when the game is over, [true, null] for a draw,
  [false, null] if still in progress.

render(perspective: string) → void
  Print the current board/game state to the terminal.
  Called after every state change on the client side.

parseInput(raw: string) → object | null
  Parse a player's natural text input into a move data object.
  Return null if the input is not recognized — the engine will show "type ? for help".
  Examples: "3" → {col:3} for Connect Four; "e2 e4" → {from:"e2",to:"e4"} for Chess.
  Still accepts raw JSON objects/arrays (lines starting with { or [) as a fallback.

getHelp() → string[]
  Return an array of help lines shown when the player types ?.
  Cover: game objective, move format with examples, any special inputs (pass, etc).
```

**BaseGame default behavior:**
- `start()` stores `this.players = players`
- All other methods throw `Error('not implemented')`

---

## GameEngine

`GameEngine` is the central orchestrator extracted from `main.js`. It handles all framework responsibilities so game code stays pure.

**Constructor:**
```
new GameEngine({ name, clientObj, getGame, players, chatLog, sendMove, sendChat })
```

**Responsibilities:**

1. **Lobby wait loop** — polls `getGame()` until a game object exists; renders "Waiting for game…" header without flickering (snapshot-based re-render, same pattern as current code).

2. **Game loop** — on each tick:
   - Compute state snapshot; only re-render when it changes (prevents flicker on waiting player)
   - Check `isOver()` — display result, handle forfeit message, await keypress, return
   - If `currentTurn() === name`: accept input via `question()`
     - Empty input → re-render
     - `t` → chat flow
     - `?` → call `game.getHelp()`, display, await keypress
     - Otherwise → call `game.parseInput(raw)`:
       - `null` → show dim "Unrecognized input — type ? for help", 1.2s pause
       - object → `sendMove(parsed)`
   - If not our turn: `getchTimeout(150)` — accept `t` (chat) and `?` (help) only

3. **Message routing** — `onMessage(msg)`:
   - `CHAT` → add to chatLog
   - `PLAYER_LIST` → update players list; detect forfeit (player left mid-game)
   - `GAME_START` → instantiate game from registry, call `game.start(players)`
   - `STATE` → call `game.loadState(data, perspective)`
   - `GAME_OVER` → set `game._over = true`, `game._winner`

4. **Forfeit detection** — when `PLAYER_LIST` shrinks during an active game, mark the leaver, set `game._over = true`, `game._winner = remaining[0]`

**Engine does NOT:**
- Know any game-specific move formats
- Display game-specific help (delegates to `game.getHelp()`)
- Parse moves (delegates to `game.parseInput()`)

---

## main.* (thin shell)

```javascript
// Node.js example
const { GameEngine } = require('./framework/engine');
const games = require('./games');   // re-exports all 11 game classes

async function main() {
  // parse args, prompt name, start listener (same as today)
  // lobby loop (same as today)
  // on host/join: new GameEngine({...}).run()
}
main();
```

The only game-specific knowledge in `main.*` is the import. Adding a new game = add one file to `games/`, export it from `games/index.*`.

---

## Game Rewrites

All 11 games are rewritten from scratch against the new interface. The known bugs in the original implementations make migration (copy + adapt) higher risk than a clean rewrite with tests.

**Each game file must:**
- Extend BaseGame
- Implement all 10 methods
- Pass its existing test suite (tests are kept and updated to match new interface)
- Include `parseInput` (no central dispatcher needed)
- Include `getHelp` (no central GAME_HELP map needed)

**Game list:** Nim, Mastermind, Connect Four, Othello, Checkers, Chess, Battleship, Go, Hex, Quoridor, Mancala

---

## Testing

No change to test strategy — existing test suites per client are kept. Tests that tested game logic continue to test game logic. Tests for `main.js` integration can now test `GameEngine` directly.

Each game's test file verifies: `start`, `validateMove`, `applyMove`, `getState`/`loadState` round-trip, `isOver`, `currentTurn`, `parseInput` (sample inputs), `getHelp` (non-empty).

---

## Migration Strategy

1. Create `framework/` and `games/` directories in each client
2. Move existing `net/`, `lobby/`, `ui/`, `i18n`, `chat`, `config` into `framework/` (no logic changes)
3. Create `framework/engine.*` by extracting the game loop from `main.*`
4. Rewrite `games/base.*` to add `parseInput` and `getHelp` to the interface
5. Rewrite each game file (one at a time) to implement the full interface
6. Update `main.*` to be the thin shell
7. Update all imports and run test suites after each game

Clients are restructured independently. Python first (most tests), then Node.js, then Bun.
