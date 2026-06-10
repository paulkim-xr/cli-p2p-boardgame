# CLI P2P Board Game Hub — Design Spec

**Date:** 2026-06-10  
**Status:** Approved

---

## Overview

A Python CLI application that lets coworkers on the same LAN play classic board games against each other in a multiplayer P2P fashion. The UI is intentionally designed to look like terminal/work output so it passes a casual glance at your screen. No external dependencies — pure Python stdlib only.

---

## Goals

- Clone and run with zero setup (`python main.py`)
- LAN session discovery with no IP addresses to share
- 10+ classic board games
- In-game + lobby chat
- UI that looks like work (monochrome, log-like, boss key)
- Configurable port to avoid conflicts with dev tools

---

## Architecture

### Topology: Star (host-relayed)

One player hosts a session. All other players connect to the host via TCP. The host validates and relays all messages (moves, chat, state updates) to every connected client. This supports 2–6 players depending on the game, with no mesh complexity.

```
        ┌──────────┐
        │   HOST   │  ← owns game state authority
        └────┬─────┘
      ┌──────┼──────┐
  ┌───▼──┐ ┌─▼───┐ ┌▼────┐
  │ P2   │ │ P3  │ │ P4  │  ← TCP clients
  └──────┘ └─────┘ └─────┘
```

### Discovery: UDP Broadcast

- Host sends a UDP beacon every 2 seconds on `port + 1`
- Beacon payload: `{ session_name, game, current_players, max_players, host_ip }`
- Clients listen on `port + 1`, display discovered sessions as a list
- Client selects a session → TCP connection to `host_ip:port`
- No IPs to copy-paste, no configuration required

---

## Port Configuration

Single port number controls both channels:
- TCP game traffic: `port`
- UDP discovery: `port + 1`

**Default: `47777`** — above the noisy dev range (3000–18080), not used by any common service or tool.

Priority order (highest to lowest):
1. CLI flag: `python main.py --port 55555`
2. Environment variable: `PORT=55555 python main.py`
3. Config file: `config.json` → `{ "port": 55555 }`
4. Default: `47777`

---

## Message Protocol

Plain JSON lines over TCP. Each message is a single line terminated by `\n`.

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

## Project Structure

```
p2p-cli-games/
├── main.py                  # entry: host | join | config
├── config.py                # port config (flag > env > file > default)
├── net/
│   ├── host.py              # TCP server, relay, game state authority
│   ├── client.py            # TCP client
│   └── protocol.py          # message types, JSON encode/decode
├── lobby/
│   ├── discovery.py         # UDP beacon + listener
│   └── session.py           # session metadata
├── games/
│   ├── base.py              # abstract: validate_move(), apply_move(), render(), is_over(), min/max players
│   ├── chess.py
│   ├── checkers.py
│   ├── battleship.py
│   ├── mastermind.py
│   ├── nim.py
│   ├── mancala.py
│   ├── go.py
│   ├── quoridor.py
│   ├── hex.py
│   ├── connect_four.py
│   └── othello.py
├── ui/
│   ├── terminal.py          # curses rendering, input loop
│   ├── lobby_screen.py      # session list + create/join
│   └── boss_key.py          # ESC → fake pytest/log overlay
└── chat.py                  # chat panel (T to open input, right-side column)
```

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

### Game Interface (`games/base.py`)

Every game implements:
```python
class BaseGame:
    min_players: int
    max_players: int

    def validate_move(self, player_id, move_data) -> bool: ...
    def apply_move(self, player_id, move_data) -> None: ...
    def render(self, perspective: str) -> str: ...  # perspective = player_id for hidden-state games
    def is_over(self) -> tuple[bool, str | None]: ...  # (done, winner_id)
    def current_turn(self) -> str: ...  # player_id whose turn it is
```

---

## UI & Work Disguise

- **Monochrome by default** — no colors, no emoji, no ASCII art banners
- **Board renders as a plain grid** — looks like a data table or matrix output
- **Status line** reads like a log: `[47777] session: alpha | game: chess | turn: dan | move: 14`
- **Chat panel** occupies the right ~30 columns, renders as a scrolling log tail
- **Boss key** — press `ESC` at any time:
  - Instantly replaces the entire screen with fake scrolling pytest/log output
  - Game state is preserved in memory
  - Press `ESC` again to return to the game

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
- **Port in use:** startup prints a clear message: `Port 47777 is in use. Try: python main.py --port 55555`
- **No sessions found:** lobby shows `Listening for sessions on LAN... (none yet)` and keeps polling

---

## Running

```bash
git clone <repo>
cd p2p-cli-games
python main.py          # interactive: pick host or join
python main.py host     # immediately go to host flow
python main.py join     # immediately go to join flow
python main.py --port 55555 host
```

No pip install. No virtualenv. Python 3.8+ required (stdlib only).
