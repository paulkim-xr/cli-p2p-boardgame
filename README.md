# CLI P2P Board Game Hub

> [한국어](README.ko.md)

A peer-to-peer multiplayer board game hub that runs entirely in the terminal. Players host or join sessions over LAN with zero configuration — no server required.

## Features

- **11 games** — Nim, Mastermind, Connect Four, Othello, Checkers, Chess, Battleship, Go, Hex, Quoridor, Mancala
- **3 clients** — Python, Node.js, Bun/TypeScript (cross-compatible, same wire protocol)
- **LAN auto-discovery** — UDP beacon broadcasting; no IP entry needed
- **i18n** — English and Korean, auto-detected from system locale
- **Standalone Windows exe** — Bun client compiles to a single self-contained binary

## Architecture

```
[Host Client] ──TCP──► [Host Server]
[Guest Client] ──TCP──► [Host Server]
                        (relays all messages)

UDP beacon (port+1) broadcasts session info to LAN every 2s
```

Star topology: the hosting player runs both a TCP server (relay) and a client. All guests connect to the host's TCP port. The wire protocol is JSON-lines over TCP.

## Games

| Game | Players | Description |
|------|---------|-------------|
| Nim | 2–6 | Remove stones from piles; last to move wins |
| Mastermind | 2 | Code-maker vs code-breaker, 4-digit code |
| Connect Four | 2 | Drop pieces, connect 4 in a row |
| Othello | 2 | Flip opponent's discs to dominate the board |
| Checkers | 2 | Capture all opponent's pieces |
| Chess | 2 | Full chess with castling, en passant, promotion |
| Battleship | 2 | Place ships, sink the opponent's fleet |
| Go | 2 | Territory capture on a 9×9 board (with ko rule) |
| Hex | 2 | Connect your two sides of an 11×11 board |
| Quoridor | 2–4 | Race to the other side, place walls to block |
| Mancala | 2–4 | Sow seeds, capture opponent's pits |

## Clients

### Python

```bash
cd clients/python
pip install pytest        # test deps only
python main.py            # run
python main.py --lang ko  # Korean UI
python main.py --port 9000

# Tests (99 passing)
pytest
```

### Node.js

Requires Node.js 18+.

```bash
cd clients/node
node src/main.js
node src/main.js --lang ko
node src/main.js --port 9000 --name alice

# Tests (83 passing)
node --test
```

### Bun / Windows exe

Requires [Bun](https://bun.sh) 1.0+.

```bash
cd clients/bun
bun run src/main.ts
bun run src/main.ts --lang ko

# Tests (77 passing)
bun test

# Build standalone exe (current platform)
bun run build

# Build Windows exe (cross-compile)
bun run build:win
# → dist/game-hub.exe  (~117 MB, no runtime required)
```

## Wire Protocol

JSON-lines over TCP (`\n`-terminated). All clients share the same protocol, so a Python host can play against a Node.js guest.

| Message | Direction | Fields |
|---------|-----------|--------|
| `JOIN` | client → host | `from` |
| `LEAVE` | client → host | `from` |
| `MOVE` | client → host | `from`, `data` |
| `CHAT` | client ↔ host | `from`, `text` |
| `PLAYER_LIST` | host → clients | `players[]` |
| `GAME_START` | host → clients | `game`, `players[]` |
| `STATE` | host → clients | `data` |
| `GAME_OVER` | host → clients | `winner` |
| `ERROR` | host → client | `message` |

Full spec: [`protocol/messages.md`](protocol/messages.md)

## i18n

Locale files are JSON key-value maps in `locales/`. Auto-detection order:

1. `--lang` flag
2. `LANGUAGE` / `LC_ALL` / `LC_MESSAGES` / `LANG` env vars
3. Windows UI culture (PowerShell)
4. `Intl.DateTimeFormat` (Node.js / Bun)
5. Fallback: `en`

To add a language, drop `locales/<code>.json` alongside `en.json` and `ko.json`.

## License

MIT — see [LICENSE](LICENSE)
