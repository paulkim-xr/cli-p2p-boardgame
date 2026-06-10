# Noodle Incident — Game Design Spec

**Date:** 2026-06-10  
**Status:** Draft  
**Platform:** Multiplayer async CLI (Rust)

---

## Concept

Two rival ramen shop owners in the same dying strip mall, waging a slow-burn psychological war using their unhinged staff. A turn-based async multiplayer CLI game where the core tension is the **declare-then-react bluff**: one player commits to an operation openly, and the opponent must decide how (or whether) to counter it — knowing the declaration might be a feint.

Designed for stealth play at the workplace. All output looks like restaurant management logs. Runs comfortably in a tmux pane.

---

## Core Loop

The game alternates between an **Attacker** and a **Defender** each turn.

### Turn Flow

1. **Attacker** picks one staff member and declares an operation type
2. **Defender** sees the staff member + operation, picks a response
3. Resolution executes, roles swap
4. Server notifies the next player asynchronously (no both-online requirement)

### Operations (Attacker declares one)

| Op | Effect | Notes |
|----|--------|-------|
| `POACH_RECIPE` | Steal opponent's dish — gain 2 Rep | Contested by strength |
| `SABOTAGE_BROTH` | Damage opponent's kitchen condition | Reduces all their op strength while damaged |
| `BRIBE_FOOD_CRITIC` | Big reputation play — gain 3 Rep | Expensive, telegraphed |
| `HIRE_INFLUENCER` | Safe build — gain 1 Rep | Uncontestable, lower value |
| `BAIT` | Throwaway op — burn opponent's intercept | No value if uncontested; Daisuke is the canonical staff for this |

### Responses (Defender picks one)

| Response | Effect | Notes |
|----------|--------|-------|
| `INTERCEPT` | Deploy one of your staff to contest | Strength matchup determines outcome |
| `SHADOW` | Let it happen, gain a read on that staff member | Tracks op patterns for future reads |
| `STAND DOWN` | Do nothing | Saves response for next turn's threat |

### Resolution Rules

- Op succeeds if attacker's staff strength ≥ defender's intercept staff strength
- Ties go to **attacker** (defender must be strictly stronger to stop it)
- `BAIT` + `INTERCEPT` → bait succeeds: intercept is burned, no points change
- `SHADOW` always lets the op proceed but grants the defender a **Read token** on that staff member (revealed stats or telegraphed tendency)

---

## Staff Roster

Each player starts with the same 3 staff members. Staff can be **Burned** (unavailable for 1 turn) if they lose a confrontation by 3+ strength difference.

| Staff | Strength | Specialty | Notes |
|-------|----------|-----------|-------|
| **Yuki** | 4 | Head Chef | Reliable. Best for POACH_RECIPE / SABOTAGE |
| **Daisuke** | 1 | New Hire | Expendable. The canonical bait unit |
| **Mama-san** | 5 | Owner's Mother | Nuclear option. Can only deploy once per game |

---

## Resources

### Reputation Points (Rep)
- Earned through ops
- Win condition: reach **15 Rep** first
- Opponent's INTERCEPT can deny Rep gain entirely

### Kitchen Condition (0–5)
- Starts at 5
- Reduced by successful `SABOTAGE_BROTH`
- Each point below 5 reduces effective strength of all your ops by 1 (ongoing, not just the next one)
- Recovers 1 per turn automatically (your kitchen never fully dies)

### Read Tokens
- Gained by `SHADOW`
- Can be spent to reveal opponent's staff stats or view their last 2 declared ops
- No direct combat value — pure information

---

## Win Conditions

| Condition | Description |
|-----------|-------------|
| Rep threshold | First player to 15 Reputation Points wins |
| Staff exhaustion | If opponent has all 3 staff Burned simultaneously for 2 consecutive turns, you win |

---

## Architecture

### Components

```
noodle-incident/
├── server/          # Rust — axum HTTP server, game state, auth
├── client/          # Rust — async CLI client
└── shared/          # Rust — shared types, game logic
```

### Server
- **Runtime:** Rust + `axum`
- **Storage:** SQLite via `rusqlite` (single file, easy to deploy)
- **Auth:** Room code + player alias (no accounts, no passwords)
- **Turn notification:** Server-Sent Events (SSE) — client subscribes and receives a push when it's their turn
- **State:** All game state lives server-side; client is stateless

### Client
- **Runtime:** Rust + `tokio` async
- **UX:** Pure terminal text, no TUI libraries — plain `println!` output styled to look like restaurant logs
- **Commands:**

```
noodle status              # show current game state (your staff, their kitchen, scores)
noodle ops                 # list available operations
noodle send <staff> <op>   # declare your operation (attacker turn)
noodle respond <response>  # respond to opponent's op (defender turn)
noodle history             # last 5 turns log
noodle wait                # block until your turn (subscribes to SSE)
```

### Protocol
- REST for game actions (`POST /game/{id}/turn`)
- SSE for turn notifications (`GET /game/{id}/events`)
- JSON payloads, no binary encoding

---

## Disguise / Aesthetics

All output uses restaurant management log framing:

```
[DISPATCH] staff.log — Yuki dispatched → POACH_RECIPE
[KITCHEN]  opponent response: INTERCEPT (Mama-san deployed)
[RESULT]   contested — Yuki (4) vs. Mama-san (5) — operation failed
[STATUS]   Rep: 6 | Kitchen: 4/5 | Next: defender turn
```

In tmux: one pane runs `noodle wait` (shows heartbeat ticks), the other is used for active commands. To any passerby it reads as a service log tail.

---

## Out of Scope (v1)

- Matchmaking / ranked ladder
- More than 2 players
- Spectator mode
- Custom staff / loadouts
- Persistent accounts
- Mobile / web client

---

## Resolved Design Decisions

- **Mama-san visibility:** Visible to opponent before resolution (consistent with the mechanic — defender always sees staff + op type before responding). The nuclear option is telegraphed; the bluff comes from how the opponent responds to it.
- **Kitchen Condition recovery:** Automatic — 1 point per turn. No manual action needed; keeps async pace moving.
- **Turn time limit:** Optional server-side config, default no limit.
