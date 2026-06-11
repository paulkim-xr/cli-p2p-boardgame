# CLI P2P Board Game Hub — Design Spec

**Date:** 2026-06-10
**Updated:** 2026-06-11
**Status:** Approved

---

## Overview

A multi-client CLI platform that lets coworkers on the same LAN play classic board games in a multiplayer P2P fashion. Four client implementations share one wire protocol — Python, Node.js, Bun.js, and a Windows standalone `.exe` (compiled from the Bun client). Any client can host or join any other client's session. No external runtime dependencies per client.

---

## Goals

- Clone and run with zero setup per client
- LAN session discovery with no IP addresses to share
- Cross-client interoperability — Python host, Node.js joiner, Bun joiner all in the same game
- 10+ classic board games
- In-game + lobby chat
- Clean terminal UI with Korean language support
- Configurable port to avoid conflicts with dev tools
- Windows standalone `.exe` — no runtime needed, single file download

---

## Architecture

### Topology: Star (host-relayed)

One player hosts a session. All other players connect to the host via TCP. The host validates and relays all messages (moves, chat, state updates) to every connected client. This supports 2–6 players depending on the game, with no mesh complexity.

The host peer runs both the TCP server and the game state authority. Any client implementation (Python, Node.js, Bun) can be the host.

```
        ┌──────────┐
        │   HOST   │  ← owns game state authority (any client impl)
        └────┬─────┘
      ┌──────┼──────┐
  ┌───▼──┐ ┌─▼───┐ ┌▼────┐
  │ P2   │ │ P3  │ │ P4  │  ← TCP clients (any client impl)
  └──────┘ └─────┘ └─────┘
```

### Discovery: UDP Broadcast

- Host sends a UDP beacon every 2 seconds on `port + 1`
- Beacon payload: `{ session_name, game, current_players, max_players, host_ip }`
- Clients listen on `port + 1`, display discovered sessions as a list
- Client selects a session → TCP connection to `host_ip:port`
- No IPs to copy-paste, no configuration required

---

## Client Implementations

Four clients, one protocol. Each is fully self-contained — can host or join.

| Client | Runtime requirement | How to run | Notes |
|---|---|---|---|
| Python | Python 3.8+, stdlib only | `python main.py` | Most likely pre-installed |
| Node.js | Node.js 18+ | `node main.js` | No npm install needed (stdlib only) |
| Bun.js | Bun 1.0+ | `bun main.ts` | Fastest startup, TypeScript native |
| Windows `.exe` | None | `gamehub.exe` | Compiled from Bun client via `bun build --compile` |

Cross-client play is fully supported: a Python host can have a Node.js player and a Bun player in the same session. The protocol is the contract.

### Project Structure

```
p2p-cli-games/
├── protocol/                    # language-agnostic wire protocol spec
│   └── messages.md              # canonical message type definitions
├── clients/
│   ├── python/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── net/
│   │   │   ├── host.py          # TCP server + relay
│   │   │   ├── client.py        # TCP client
│   │   │   └── protocol.py      # message encode/decode
│   │   ├── lobby/
│   │   │   ├── discovery.py     # UDP beacon + listener
│   │   │   └── session.py
│   │   ├── games/
│   │   │   ├── base.py
│   │   │   ├── chess.py
│   │   │   ├── checkers.py
│   │   │   ├── battleship.py
│   │   │   ├── mastermind.py
│   │   │   ├── nim.py
│   │   │   ├── mancala.py
│   │   │   ├── go.py
│   │   │   ├── quoridor.py
│   │   │   ├── hex.py
│   │   │   ├── connect_four.py
│   │   │   └── othello.py
│   │   ├── ui/
│   │   │   ├── terminal.py
│   │   │   ├── lobby_screen.py
│   │   │   └── boss_key.py
│   │   └── chat.py
│   ├── nodejs/
│   │   ├── main.js
│   │   ├── config.js
│   │   ├── net/
│   │   │   ├── host.js
│   │   │   ├── client.js
│   │   │   └── protocol.js
│   │   ├── lobby/
│   │   │   ├── discovery.js
│   │   │   └── session.js
│   │   ├── games/
│   │   │   └── (same 11 games as .js files)
│   │   ├── ui/
│   │   │   ├── terminal.js
│   │   │   ├── lobby_screen.js
│   │   │   └── boss_key.js
│   │   └── chat.js
│   └── bun/
│       ├── main.ts
│       ├── config.ts
│       ├── net/
│       │   ├── host.ts
│       │   ├── client.ts
│       │   └── protocol.ts
│       ├── lobby/
│       │   ├── discovery.ts
│       │   └── session.ts
│       ├── games/
│       │   └── (same 11 games as .ts files)
│       ├── ui/
│       │   ├── terminal.ts
│       │   ├── lobby_screen.ts
│       │   └── boss_key.ts
│       └── chat.ts
└── dist/
    └── gamehub.exe              # compiled via: bun build --compile clients/bun/main.ts
```

### Build Order

1. **Python client** — reference implementation. Establishes all game logic and protocol behavior.
2. **Node.js client** — port from Python. Most widely used runtime in the team, highest priority after the reference.
3. **Bun client** — port from Node.js. TypeScript native; mostly a type-annotated version with Bun API differences.
4. **Windows `.exe`** — `bun build --compile clients/bun/main.ts --outfile dist/gamehub.exe`. Bun embeds its runtime into the binary — the resulting `.exe` is fully self-contained, no Bun, Node.js, or any other runtime required on the target machine.

---

## Port Configuration

Single port number controls both channels:
- TCP game traffic: `port`
- UDP discovery: `port + 1`

**Default: `47777`** — above the noisy dev range (3000–18080), not used by any common service or tool.

Priority order (highest to lowest):
1. CLI flag: `--port 55555`
2. Environment variable: `PORT=55555`
3. Config file: `config.json` → `{ "port": 55555 }`
4. Default: `47777`

Applies identically across all four clients.

---

## Message Protocol

Plain JSON lines over TCP. Each message is a single line terminated by `\n`. Defined canonically in `protocol/messages.md`.

| Type | Direction | Fields |
|---|---|---|
| `JOIN` | client → host | `from` |
| `LEAVE` | client → host | `from` |
| `MOVE` | client → host | `from`, `data` (game-specific) |
| `CHAT` | client ↔ host | `from`, `body` |
| `STATE` | host → all | `data` (full game state) |
| `PLAYER_LIST` | host → all | `players` |
| `GAME_START` | host → all | `game`, `players`, `turn` |
| `GAME_OVER` | host → all | `winner` |
| `ERROR` | host → client | `message` |

Host broadcasts all messages to every connected client after validation.

---

## Games

| Game | Min Players | Max Players | Notes |
|---|---|---|---|
| Chess | 2 | 2 | Spectators allowed (connect after game starts → receive STATE updates, cannot send MOVE) |
| Checkers | 2 | 2 | |
| Othello/Reversi | 2 | 2 | |
| Connect Four | 2 | 2 | |
| Battleship | 2 | 2 | Hidden boards — each player only sees own board + hit/miss on enemy |
| Mastermind | 2 | 2 | One codemaker, one codebreaker |
| Go | 2 | 2 | Board size set by host at session creation: 9×9 (default), 13×13, or 19×19 |
| Hex | 2 | 2 | 11×11 board |
| Quoridor | 2 | 4 | |
| Nim | 2 | 6 | |
| Mancala | 2 | 4 | |

### Game Interface

Every game in every client implements the same logical interface:

```
validate_move(player_id, move_data) → bool
apply_move(player_id, move_data) → void
render(perspective) → string       # perspective = player_id for hidden-state games
is_over() → (done: bool, winner: string | null)
current_turn() → string            # player_id whose turn it is
min_players: int
max_players: int
```

---

## UI

- **터미널 UI** — ANSI 색상, 한국어 지원
- **보드는 간결한 그리드로 렌더링**
- **상태 표시줄**: `[47777] 세션: alpha | 게임: chess | 차례: dan`

### Chat

- Available in lobby (while waiting for players to join) and during a game
- Press **`T`** → opens a one-line input at the bottom; game input pauses
- Press **`Enter`** → sends message; press **`Esc`** → cancel without sending
- Chat history scrolls in the right panel; older lines scroll off the top

---

## Error Handling

- **Host disconnects:** all clients display `[connection lost]` and return to lobby screen
- **Client disconnects mid-game:** host broadcasts `LEAVE`, game ends or pauses depending on game rules
- **Invalid move:** host rejects with `ERROR` message, client re-prompts
- **Port in use:** startup prints a clear message with a suggested alternative port
- **No sessions found:** lobby shows `Listening for sessions on LAN... (none yet)` and keeps polling

---

## Running

**Python**
```bash
git clone <repo> && cd p2p-cli-games/clients/python
python main.py [host|join] [--port N]
```

**Node.js**
```bash
cd p2p-cli-games/clients/nodejs
node main.js [host|join] [--port N]
```

**Bun**
```bash
cd p2p-cli-games/clients/bun
bun main.ts [host|join] [--port N]
```

**Windows standalone**
```
gamehub.exe [host|join] [--port N]
```
Built via: `bun build --compile clients/bun/main.ts --outfile dist/gamehub.exe`
