# Contributing

> [한국어](CONTRIBUTING.ko.md)

## Development Setup

Clone the repo and pick a client directory to work in. Each client is self-contained.

```bash
git clone https://github.com/paulkim-xr/cli-p2p-boardgame.git
cd cli-p2p-boardgame
```

## Branching

All work happens on feature branches. Branch names follow the convention `feat/<topic>` or `fix/<topic>`.

```bash
git checkout -b feat/my-feature
# ... make changes, run tests ...
git push origin feat/my-feature
# open a PR to main
```

Never commit directly to `main`.

## Adding a Game

Games must be implemented in all three clients to be included. The interface is:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `start` | `(players: string[]) → void` | Initialize state with ordered player list |
| `validateMove` | `(playerId, data) → bool` | Return false for illegal moves |
| `applyMove` | `(playerId, data) → void` | Mutate state; called only after validation |
| `render` | `(perspective?) → str` | Return a printable board string |
| `getState` | `(perspective) → object` | Return JSON-serializable state for the wire |
| `isOver` | `() → [bool, winner\|null]` | Return `[true, winnerId]` or `[false, null]` |
| `currentTurn` | `() → str\|null` | Return the player ID whose turn it is |

Register the class in `session.py` / `session.js` / `session.ts`.

Add locale keys to all six `locales/*.json` files:
- `game.<name>` — display name
- `game.<name>.help` — one-line description shown in the lobby

## Adding a Language

1. Copy `clients/python/locales/en.json` to `clients/python/locales/<code>.json`
2. Repeat for `clients/node/locales/` and `clients/bun/locales/`
3. Translate all 48 values. Do not add or remove keys.
4. Test with `--lang <code>`.

## Running Tests

```bash
# Python (99 tests)
cd clients/python && pytest

# Node.js (83 tests)
cd clients/node && node --test

# Bun (77 tests)
cd clients/bun && bun test
```

All tests must pass before opening a PR.

## Wire Protocol Changes

Changes to the wire protocol require updating all three clients and `protocol/messages.md`. Add a new `MsgType` constant in all three `protocol.*` files simultaneously — the protocol is the contract between clients.

## Commit Style

```
type(scope): short description
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
Scope: `python`, `node`, `bun`, `protocol`, `i18n`.

Examples:
```
feat(bun): add Quoridor wall validation
fix(python): correct Othello flip direction
docs(i18n): add Japanese locale
```
