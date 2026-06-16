# CLI P2P Board Game Framework — Python Client

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Python client so the framework core lives in `framework/`, game implementations live in `games/`, and `main.py` is a ~50-line thin shell.

**Architecture:** A new `GameEngine` class in `framework/engine.py` owns the game loop, turn management, move parsing, and chat — extracted from `main.py`. Each game gains `load_state`, `parse_input`, and `get_help` methods so all game-specific knowledge stays inside the game file. `main.py` creates an engine, wires client networking, and calls `engine.run()`.

**Tech Stack:** Python 3.8+, stdlib only (threading, json, sys, time), pytest

---

## File Map

**New files:**
- `clients/python/framework/__init__.py` — empty package marker
- `clients/python/framework/engine.py` — GameEngine class

**Moved files (git mv):**
- `net/` → `framework/net/`
- `lobby/` → `framework/lobby/`
- `ui/` → `framework/ui/`
- `i18n.py` → `framework/i18n.py`
- `chat.py` → `framework/chat.py`
- `config.py` → `framework/config.py`

**Modified files:**
- `games/base.py` — add `load_state`, `parse_input`, `get_help` abstract methods
- `main.py` — rewrite as thin shell
- `framework/ui/lobby_screen.py` — add `perspective` param to `render_game`
- All 11 game files — add `load_state`, `parse_input`, `get_help`; fix `from i18n` → `from framework.i18n`
- `tests/test_i18n.py` — update import path

---

### Task 1: Create `framework/` and move existing modules

**Files:**
- Create: `clients/python/framework/__init__.py`
- Move: `clients/python/net/` → `clients/python/framework/net/`
- Move: `clients/python/lobby/` → `clients/python/framework/lobby/`
- Move: `clients/python/ui/` → `clients/python/framework/ui/`
- Move: `clients/python/i18n.py` → `clients/python/framework/i18n.py`
- Move: `clients/python/chat.py` → `clients/python/framework/chat.py`
- Move: `clients/python/config.py` → `clients/python/framework/config.py`

- [ ] **Step 1: Create framework package and move files**

```bash
cd clients/python
mkdir -p framework/net framework/lobby framework/ui
touch framework/__init__.py
git mv net/host.py framework/net/host.py
git mv net/client.py framework/net/client.py
git mv net/protocol.py framework/net/protocol.py
git mv net/__init__.py framework/net/__init__.py
git mv lobby/discovery.py framework/lobby/discovery.py
git mv lobby/session.py framework/lobby/session.py
git mv lobby/__init__.py framework/lobby/__init__.py
git mv ui/terminal.py framework/ui/terminal.py
git mv ui/lobby_screen.py framework/ui/lobby_screen.py
git mv ui/boss_key.py framework/ui/boss_key.py
git mv ui/__init__.py framework/ui/__init__.py
git mv i18n.py framework/i18n.py
git mv chat.py framework/chat.py
git mv config.py framework/config.py
rmdir net lobby ui
```

- [ ] **Step 2: Fix imports inside moved files**

In `framework/ui/lobby_screen.py`, replace:
```python
from lobby.session import GAMES
from ui.terminal import header, hr, BOLD, RESET, DIM, CYAN, GREEN, YELLOW
from i18n import t
```
with:
```python
from framework.lobby.session import GAMES
from framework.ui.terminal import header, hr, BOLD, RESET, DIM, CYAN, GREEN, YELLOW
from framework.i18n import t
```

In `framework/lobby/session.py`, replace:
```python
from dataclasses import dataclass, field
```
No framework imports needed — it lazy-imports game classes, which are under `games/` (found via sys.path from `clients/python/`). No change needed.

In `framework/lobby/discovery.py`, if it imports `from net.` replace with `from framework.net.`.

In `framework/net/host.py` and `framework/net/client.py`, replace any `from lobby.` or `from net.` imports with `from framework.lobby.` and `from framework.net.`.

- [ ] **Step 3: Fix imports in `main.py`**

Replace all old-style framework imports:
```python
# OLD
from config import load_port
from net.host import Host
from net.client import Client
from net.protocol import MsgType
from lobby.discovery import Beacon, Listener
from lobby.session import GAMES
from chat import ChatLog
from ui.terminal import clear, header, getch, BOLD, RESET, DIM, GREEN, YELLOW
from ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat, render_game
import i18n
from i18n import t

# NEW
from framework.config import load_port
from framework.net.host import Host
from framework.net.client import Client
from framework.net.protocol import MsgType
from framework.lobby.discovery import Beacon, Listener
from framework.lobby.session import GAMES
from framework.chat import ChatLog
from framework.ui.terminal import clear, header, getch, BOLD, RESET, DIM, GREEN, YELLOW
from framework.ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat, render_game
import framework.i18n as i18n
from framework.i18n import t
```

- [ ] **Step 4: Fix imports in all 11 game files**

In every file under `clients/python/games/` that has `from i18n import t`, replace with:
```python
from framework.i18n import t
```

- [ ] **Step 5: Fix import in `tests/test_i18n.py`**

```python
# OLD
import sys
sys.path.insert(0, 'clients/python')
import i18n

# NEW
import sys
sys.path.insert(0, 'clients/python')
from framework import i18n
```

- [ ] **Step 6: Run tests to verify nothing broke**

```bash
cd clients/python
pytest -x -q
```

Expected: all 99 tests pass (same as before this task). If imports fail, fix the remaining `from xxx import` that still reference old paths.

- [ ] **Step 7: Commit**

```bash
git add clients/python/
git commit -m "refactor(python): move framework modules into framework/ directory"
```

---

### Task 2: Update `games/base.py` with new abstract methods

**Files:**
- Modify: `clients/python/games/base.py`

- [ ] **Step 1: Write the updated `base.py`**

```python
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional


class BaseGame(ABC):
    min_players: int = 2
    max_players: int = 2

    def start(self, players: List[str]) -> None:
        self.players = players
        self._over = False
        self._winner = None

    @abstractmethod
    def validate_move(self, player_id: str, move_data: dict) -> bool: ...

    @abstractmethod
    def apply_move(self, player_id: str, move_data: dict) -> None: ...

    @abstractmethod
    def render(self, perspective: Optional[str] = None) -> str:
        """Return a string representation of the current game state."""
        ...

    @abstractmethod
    def get_state(self, perspective: Optional[str] = None) -> dict:
        """Return a JSON-serializable snapshot of state for this player."""
        ...

    @abstractmethod
    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        """Apply a received state snapshot, replacing internal state."""
        ...

    @abstractmethod
    def is_over(self) -> Tuple[bool, Optional[str]]: ...

    @abstractmethod
    def current_turn(self) -> Optional[str]: ...

    @abstractmethod
    def parse_input(self, raw: str) -> Optional[dict]:
        """Parse natural text input into a move dict. Return None if unrecognized."""
        ...

    @abstractmethod
    def get_help(self) -> List[str]:
        """Return help lines shown when player types ?."""
        ...
```

- [ ] **Step 2: Run tests to confirm they now fail with NotImplementedError for unimplemented methods**

```bash
cd clients/python
pytest tests/test_nim.py -x -q
```

Expected: tests PASS (Nim already has these methods except `load_state`, `parse_input`, `get_help` which are abstract but not yet implemented → will raise `TypeError: Can't instantiate abstract class`).

- [ ] **Step 3: Commit**

```bash
git add clients/python/games/base.py
git commit -m "refactor(python): add load_state, parse_input, get_help to BaseGame"
```

---

### Task 3: Write `framework/engine.py`

**Files:**
- Create: `clients/python/framework/engine.py`

- [ ] **Step 1: Write the engine**

```python
import time
import sys
import json

from framework.net.protocol import MsgType
from framework.lobby.session import _load_game_classes
from framework.ui.terminal import clear, header, DIM, BOLD, RESET
from framework.ui.lobby_screen import render_game
from framework.i18n import t


class GameEngine:
    """Owns the game loop: turn management, input dispatch, state sync, chat."""

    def __init__(self, *, name: str, chat_log):
        self.name = name
        self.chat_log = chat_log
        self.send_move = None   # set by caller after construction
        self.send_chat = None   # set by caller after construction
        self.game_obj = None
        self.players: list = []
        self._last_snap = None

    # ── network callback (called from TCP receive thread) ──────────────────

    def on_message(self, msg: dict) -> None:
        msg_type = msg.get('type')
        if msg_type == MsgType.CHAT:
            self.chat_log.add(msg.get('from', '?'), msg.get('text', ''))
        elif msg_type == MsgType.PLAYER_LIST:
            new_players = list(msg.get('players', []))
            if (self.game_obj is not None
                    and not getattr(self.game_obj, '_over', False)
                    and len(self.players) > len(new_players)):
                leaver = next((p for p in self.players if p not in new_players), None)
                if leaver:
                    self.game_obj._over = True
                    self.game_obj._winner = new_players[0] if new_players else None
                    self.game_obj._forfeited_by = leaver
            self.players = new_players
        elif msg_type == MsgType.GAME_START:
            classes = _load_game_classes()
            game_name = msg.get('game')
            if game_name in classes:
                self.game_obj = classes[game_name]()
                self.game_obj.start(msg.get('players', []))
        elif msg_type == MsgType.STATE:
            if self.game_obj is not None:
                self.game_obj.load_state(msg.get('data', {}), self.name)
        elif msg_type == MsgType.GAME_OVER:
            if self.game_obj is not None:
                self.game_obj._over = True
                self.game_obj._winner = msg.get('winner')

    # ── main loop (runs on main thread) ────────────────────────────────────

    def run(self) -> None:
        self._last_snap = None
        while True:
            game = self.game_obj
            if game is None:
                s = self._snap()
                if s != self._last_snap:
                    clear()
                    header(t('game.waiting'))
                    self._last_snap = s
                time.sleep(0.5)
                continue

            s = self._snap()
            if s != self._last_snap:
                clear()
                render_game(game, self.players, self.chat_log.recent(3), self.name)
                self._last_snap = s

            done, winner = game.is_over()
            if done:
                clear()
                header(t('game.over'))
                forfeited_by = getattr(game, '_forfeited_by', None)
                if forfeited_by:
                    end_msg = (f'{forfeited_by} disconnected. '
                               f'{winner + " wins by forfeit!" if winner else ""}')
                else:
                    end_msg = t('game.winner', winner=winner) if winner else t('game.draw')
                print(f'\n  {BOLD}{end_msg}{RESET}\n')
                input('  ' + t('game.continue'))
                return

            if game.current_turn() == self.name:
                raw = input(t('game.move_prompt')).strip()
                if not raw:
                    self._last_snap = None
                    continue
                cmd = raw.lower()
                if cmd == 't':
                    msg = input(t('game.chat_prompt')).strip()
                    if msg and self.send_chat:
                        self.send_chat(msg)
                        time.sleep(0.06)
                    self._last_snap = None
                    continue
                if cmd == '?':
                    self._show_help(game)
                    input('  ' + t('game.continue'))
                    self._last_snap = None
                    continue
                parsed = game.parse_input(raw)
                if parsed is None:
                    print(f'\n  {DIM}Unrecognized input — type ? for help{RESET}\n')
                    time.sleep(1.2)
                    self._last_snap = None
                    continue
                if self.send_move:
                    self.send_move(parsed)
                self._last_snap = None
            else:
                ch = self._peek_char()
                if ch == 't':
                    msg = input(t('game.chat_prompt')).strip()
                    if msg and self.send_chat:
                        self.send_chat(msg)
                        time.sleep(0.06)
                    self._last_snap = None
                elif ch == '?':
                    self._show_help(game)
                    input('  ' + t('game.continue'))
                    self._last_snap = None
                else:
                    time.sleep(0.15)

    # ── helpers ─────────────────────────────────────────────────────────────

    def _snap(self) -> str:
        g = self.game_obj
        if g is None:
            return '__waiting__'
        chats = '|'.join(
            f"{e['from']}:{e['text']}" for e in self.chat_log.recent(3)
        )
        return json.dumps(g.get_state(self.name), default=str) + '|' + chats

    def _show_help(self, game) -> None:
        clear()
        header('? Help')
        for line in game.get_help():
            print(f'  {line}')
        print()
        print(f'  {DIM}t = chat   ? = this help{RESET}')
        print()

    @staticmethod
    def _peek_char() -> str | None:
        if sys.platform == 'win32':
            import msvcrt
            if msvcrt.kbhit():
                return msvcrt.getwch().lower()
        return None
```

- [ ] **Step 2: Update `framework/ui/lobby_screen.py` — add `perspective` to `render_game`**

Replace the current `render_game` function:
```python
def render_game(game_obj, players, chat_log, perspective=None):
    header(t('game.header'))
    print()
    print(game_obj.render(perspective))
    print()
    hr()
    if chat_log:
        print(BOLD + '  ' + t('game.chat_header') + RESET)
        for entry in chat_log[-3:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    if game_obj.current_turn() == perspective:
        print(f'  {GREEN}{t("game.your_turn")}{RESET}   {DIM}[T] chat   [?] help{RESET}')
    else:
        turn = game_obj.current_turn()
        print(f'  {DIM}Waiting for {turn}...   [T] chat   [?] help{RESET}')
    print()
```

- [ ] **Step 3: Commit**

```bash
git add clients/python/framework/engine.py clients/python/framework/ui/lobby_screen.py
git commit -m "feat(python): add GameEngine; update render_game with perspective"
```

---

### Task 4: Rewrite `main.py` as thin shell

**Files:**
- Modify: `clients/python/main.py`

- [ ] **Step 1: Write thin `main.py`**

```python
#!/usr/bin/env python3
"""CLI P2P Board Game Framework — Python client"""

import sys
import threading
import time

import framework.i18n as i18n
from framework.i18n import t
from framework.config import load_port
from framework.net.host import Host
from framework.net.client import Client
from framework.net.protocol import MsgType
from framework.lobby.discovery import Beacon, Listener
from framework.lobby.session import GAMES
from framework.chat import ChatLog
from framework.ui.terminal import clear, header, getch
from framework.ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat
from framework.engine import GameEngine


def _run_game(ip: str, port: int, name: str, chat_log: ChatLog) -> None:
    engine = GameEngine(name=name, chat_log=chat_log)
    client_obj = Client(ip, port, name, engine.on_message)
    engine.send_move = lambda data: client_obj.send(
        {'type': MsgType.MOVE, 'from': name, 'data': data})
    engine.send_chat = lambda text: client_obj.send(
        {'type': MsgType.CHAT, 'from': name, 'text': text})
    client_obj.connect()
    time.sleep(0.2)
    engine.run()


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser(description='CLI P2P Board Game Framework')
    ap.add_argument('--port', type=int, default=None)
    ap.add_argument('--name', default=None)
    ap.add_argument('--lang', default=None, choices=['ko', 'en'])
    args = ap.parse_args()

    if args.lang:
        i18n.set_locale(args.lang)

    port = load_port(['--port', str(args.port)] if args.port else [])
    name = args.name or input(t('prompt.name')).strip() or t('prompt.default_name')

    chat_log = ChatLog()
    listener = Listener(port=port + 1)
    threading.Thread(target=listener.run, daemon=True).start()

    running = True
    while running:
        sessions = dict(listener.sessions)
        show_lobby(sessions, name, chat_log.recent(5))
        ch = getch().lower()

        if ch == 'h':
            game_name, max_players = prompt_host(name)
            if not game_name:
                continue
            host_obj = Host(port=port, game_name=game_name, max_players=max_players)
            beacon = Beacon(host=name, game=game_name, port=port,
                            players=[], max_players=max_players)
            threading.Thread(target=beacon.run, daemon=True).start()
            host_obj.start()
            _run_game('127.0.0.1', port, name, chat_log)

        elif ch == 'j':
            sid = prompt_join(sessions)
            if not sid:
                continue
            s = sessions[sid]
            _run_game(s.host_ip or s.host, s.port, name, chat_log)

        elif ch == 'q':
            running = False

    sys.exit(0)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run tests to make sure nothing regressed**

```bash
cd clients/python
pytest -x -q
```

Expected: all currently-passing tests still pass. (Some game tests will now fail with `TypeError: Can't instantiate abstract class` because `parse_input` and `get_help` are not yet implemented.)

- [ ] **Step 3: Commit**

```bash
git add clients/python/main.py
git commit -m "refactor(python): rewrite main.py as thin shell using GameEngine"
```

---

### Task 5: Rewrite `games/nim.py`

**Files:**
- Modify: `clients/python/games/nim.py`
- Test: `clients/python/tests/test_nim.py`

- [ ] **Step 1: Add tests for new interface methods**

Add to `clients/python/tests/test_nim.py`:
```python
def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'pile': 0, 'count': 2})
    state = g.get_state()
    g2 = Nim()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.piles == g.piles
    assert g2.current_turn() == 'bob'


def test_parse_input_pile_count():
    assert make().parse_input('0 2') == {'pile': 0, 'count': 2}


def test_parse_input_invalid():
    assert make().parse_input('xyz') is None


def test_parse_input_json_fallback():
    assert make().parse_input('{"pile": 1, "count": 3}') == {'pile': 1, 'count': 3}


def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm they fail**

```bash
cd clients/python
pytest tests/test_nim.py -x -q
```

Expected: FAIL (load_state / parse_input / get_help not yet implemented)

- [ ] **Step 3: Write the full `games/nim.py`**

```python
from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json


class Nim(BaseGame):
    min_players = 2
    max_players = 6

    def __init__(self, piles: Optional[List[int]] = None):
        self.piles = list(piles) if piles else [3, 5, 7]
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if player_id != self.current_turn():
            return False
        pile = move_data.get('pile')
        count = move_data.get('count')
        if pile is None or count is None:
            return False
        if not (0 <= pile < len(self.piles)):
            return False
        return 1 <= count <= self.piles[pile]

    def apply_move(self, player_id: str, move_data: dict) -> None:
        self.piles[move_data['pile']] -= move_data['count']
        self._turn_idx = (self._turn_idx + 1) % len(self.players)

    def is_over(self):
        if all(p == 0 for p in self.piles):
            last = (self._turn_idx - 1) % len(self.players)
            return True, self.players[last]
        return False, None

    def render(self, perspective: Optional[str] = None) -> str:
        lines = [t('nim.title')]
        for i, p in enumerate(self.piles):
            lines.append(t('nim.pile', i=i, bar='I' * p, count=p))
        lines.append(t('nim.turn', player=self.current_turn()))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'piles': self.piles[:], 'turn': self.current_turn(),
                'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'piles' in data:
            self.piles = list(data['piles'])
        if 'players' in data:
            self.players = list(data['players'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith(('{', '[')):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'pile': int(parts[0]), 'count': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Take ≥1 stone from exactly one pile each turn. Last to take wins.',
            'Move: <pile> <count>   e.g. "0 2"  (take 2 stones from pile 0)',
        ]
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
cd clients/python
pytest tests/test_nim.py -v
```

Expected: all 11 tests pass (8 original + 5 new).

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/nim.py clients/python/tests/test_nim.py
git commit -m "feat(python): rewrite Nim with load_state, parse_input, get_help"
```

---

### Task 6: Rewrite `games/mastermind.py`

**Files:**
- Modify: `clients/python/games/mastermind.py`
- Test: `clients/python/tests/test_mastermind.py`

- [ ] **Step 1: Add tests**

Add to `tests/test_mastermind.py`:
```python
def test_load_state_restores_guesses():
    g = make_with_code()
    g.apply_move('breaker', {'guess': [1, 2, 3, 4]})
    state = g.get_state('breaker')
    g2 = Mastermind()
    g2.start(['maker', 'breaker'])
    g2.load_state(state, 'breaker')
    assert len(g2._guesses) == 1

def test_parse_input_spaced():
    g = Mastermind()
    g.start(['a', 'b'])
    g._code = [1, 2, 3, 4]
    assert g.parse_input('1 2 3 4') == {'guess': [1, 2, 3, 4]}

def test_parse_input_compact():
    g = Mastermind()
    g.start(['a', 'b'])
    g._code = [1, 2, 3, 4]
    assert g.parse_input('5612') == {'guess': [5, 6, 1, 2]}

def test_parse_input_code_phase():
    g = Mastermind()
    g.start(['a', 'b'])
    assert g.parse_input('1 2 3 4') == {'code': [1, 2, 3, 4]}

def test_parse_input_invalid():
    g = Mastermind()
    g.start(['a', 'b'])
    assert g.parse_input('abc') is None

def test_get_help_nonempty():
    g = Mastermind()
    g.start(['a', 'b'])
    assert len(g.get_help()) >= 3
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_mastermind.py -x -q
```

- [ ] **Step 3: Write `games/mastermind.py`**

```python
from collections import Counter
from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json


class Mastermind(BaseGame):
    MAX_GUESSES = 10

    def __init__(self):
        self.players: List[str] = []
        self._code: Optional[List[int]] = None
        self._guesses: List = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._code = None
        self._guesses = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        if self._code is None:
            code = move_data.get('code', [])
            return len(code) == 4 and all(isinstance(d, int) and 1 <= d <= 6 for d in code)
        guess = move_data.get('guess', [])
        return len(guess) == 4 and all(isinstance(d, int) and 1 <= d <= 6 for d in guess)

    def apply_move(self, player_id: str, move_data: dict) -> None:
        if self._code is None:
            self._code = move_data['code']
            self._turn_idx = 1
        else:
            guess = move_data['guess']
            exact, mis = self._score(guess)
            self._guesses.append((guess, exact, mis))
            if exact == 4:
                self._over = True
                self._winner = self.players[1]
            elif len(self._guesses) >= self.MAX_GUESSES:
                self._over = True
                self._winner = self.players[0]

    def _score(self, guess):
        exact = sum(g == c for g, c in zip(guess, self._code))
        mis = sum((Counter(self._code) & Counter(guess)).values()) - exact
        return exact, mis

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        lines = [t('mastermind.title')]
        for i, (g, e, m) in enumerate(self._guesses):
            lines.append(t('mastermind.guess', n=i + 1, guess=g, exact=e, mis=m))
        if not self._over:
            lines.append(t('mastermind.remaining', n=self.MAX_GUESSES - len(self._guesses)))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        state = {'guesses': self._guesses, 'turn': self.current_turn(),
                 'players': self.players, 'over': self._over}
        if perspective == self.players[0] or self._over:
            state['code'] = self._code
        return state

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'guesses' in data:
            self._guesses = list(data['guesses'])
        if 'code' in data:
            self._code = data['code']
        if 'over' in data:
            self._over = bool(data['over'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith(('{', '[')):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        digits = None
        if len(parts) == 4:
            try:
                digits = [int(p) for p in parts]
            except ValueError:
                return None
        elif len(parts) == 1 and len(parts[0]) == 4 and parts[0].isdigit():
            digits = [int(c) for c in parts[0]]
        if digits is not None and len(digits) == 4:
            return {'code': digits} if self._code is None else {'guess': digits}
        return None

    def get_help(self) -> List[str]:
        return [
            'Guess the secret 4-digit code (digits 1–6).',
            'B = right digit + right position.  W = right digit, wrong position.',
            'Move: <d1> <d2> <d3> <d4>   e.g. "1 2 3 4"  or  "1234"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_mastermind.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/mastermind.py clients/python/tests/test_mastermind.py
git commit -m "feat(python): rewrite Mastermind with load_state, parse_input, get_help"
```

---

### Task 7: Rewrite `games/connect_four.py`

**Files:**
- Modify: `clients/python/games/connect_four.py`
- Test: `clients/python/tests/test_connect_four.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores_board():
    g = make()
    g.apply_move('alice', {'col': 3})
    state = g.get_state()
    g2 = ConnectFour()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.board[5][3] == 'alice'
    assert g2.current_turn() == 'bob'

def test_parse_input_col():
    assert make().parse_input('3') == {'col': 3}

def test_parse_input_invalid():
    assert make().parse_input('abc') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_connect_four.py -x -q
```

- [ ] **Step 3: Write `games/connect_four.py`**

```python
from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json

ROWS, COLS = 6, 7


class ConnectFour(BaseGame):
    def __init__(self):
        self.board = [[None] * COLS for _ in range(ROWS)]
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.players = players
        self._turn_idx = 0
        self._over = False
        self._winner = None
        self.board = [[None] * COLS for _ in range(ROWS)]

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        col = move_data.get('col')
        return isinstance(col, int) and 0 <= col < COLS and self.board[0][col] is None

    def apply_move(self, player_id: str, move_data: dict) -> None:
        col = move_data['col']
        for row in range(ROWS - 1, -1, -1):
            if self.board[row][col] is None:
                self.board[row][col] = player_id
                break
        if self._check_win(player_id):
            self._over = True
            self._winner = player_id
        elif all(self.board[0][c] is not None for c in range(COLS)):
            self._over = True
        else:
            self._turn_idx = 1 - self._turn_idx

    def _check_win(self, pid: str) -> bool:
        dirs = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for r in range(ROWS):
            for c in range(COLS):
                if self.board[r][c] != pid:
                    continue
                for dr, dc in dirs:
                    if all(0 <= r + dr * i < ROWS and 0 <= c + dc * i < COLS and
                           self.board[r + dr * i][c + dc * i] == pid for i in range(1, 4)):
                        return True
        return False

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        syms = {None: '.'}
        if self.players:
            syms[self.players[0]] = 'X'
            if len(self.players) > 1:
                syms[self.players[1]] = 'O'
        lines = [t('connect4.title')]
        for row in self.board:
            lines.append('  ' + ' '.join(syms.get(c, '?') for c in row))
        lines.append('  ' + ' '.join(str(i) for i in range(COLS)))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'board': [row[:] for row in self.board],
                'turn': self.current_turn(), 'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        try:
            return {'col': int(raw.split()[0])}
        except (ValueError, IndexError):
            return None

    def get_help(self) -> List[str]:
        return [
            'Drop a piece into a column. First to connect 4 in a row wins.',
            'Move: <col>   e.g. "3"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_connect_four.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/connect_four.py clients/python/tests/test_connect_four.py
git commit -m "feat(python): rewrite ConnectFour with load_state, parse_input, get_help"
```

---

### Task 8: Rewrite `games/othello.py`

**Files:**
- Modify: `clients/python/games/othello.py`
- Test: `clients/python/tests/test_othello.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'row': 2, 'col': 3})
    state = g.get_state()
    g2 = Othello()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.board[2][3] == 'alice'

def test_parse_input_row_col():
    assert make().parse_input('3 4') == {'row': 3, 'col': 4}

def test_parse_input_pass():
    assert make().parse_input('pass') == {'pass': True}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_othello.py -x -q
```

- [ ] **Step 3: Write `games/othello.py`**

```python
from typing import List, Optional
from games.base import BaseGame
from framework.i18n import t
import json

SIZE = 8
DIRS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


class Othello(BaseGame):
    def __init__(self):
        self.board = [[None] * SIZE for _ in range(SIZE)]
        mid = SIZE // 2
        self.board[mid - 1][mid - 1] = 'white'
        self.board[mid][mid] = 'white'
        self.board[mid - 1][mid] = 'black'
        self.board[mid][mid - 1] = 'black'
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None

    def start(self, players: List[str]) -> None:
        self.__init__()
        self.players = players

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def _opponent(self, pid: str) -> str:
        return self.players[1 - self.players.index(pid)]

    def _flips(self, pid: str, r: int, c: int) -> list:
        if self.board[r][c] is not None:
            return []
        opp = self._opponent(pid)
        all_flips = []
        for dr, dc in DIRS:
            line = []
            nr, nc = r + dr, c + dc
            while 0 <= nr < SIZE and 0 <= nc < SIZE and self.board[nr][nc] == opp:
                line.append((nr, nc))
                nr += dr
                nc += dc
            if line and 0 <= nr < SIZE and 0 <= nc < SIZE and self.board[nr][nc] == pid:
                all_flips.extend(line)
        return all_flips

    def _has_moves(self, pid: str) -> bool:
        return any(self._flips(pid, r, c)
                   for r in range(SIZE) for c in range(SIZE))

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        if move_data.get('pass'):
            return not self._has_moves(player_id)
        r, c = move_data.get('row'), move_data.get('col')
        if r is None or c is None:
            return False
        return bool(self._flips(player_id, r, c))

    def apply_move(self, player_id: str, move_data: dict) -> None:
        if not move_data.get('pass'):
            r, c = move_data['row'], move_data['col']
            for fr, fc in self._flips(player_id, r, c):
                self.board[fr][fc] = player_id
            self.board[r][c] = player_id
        self._turn_idx = 1 - self._turn_idx
        nxt = self.current_turn()
        if not self._has_moves(nxt):
            self._turn_idx = 1 - self._turn_idx
            if not self._has_moves(self.current_turn()):
                self._finish()

    def _finish(self) -> None:
        self._over = True
        counts = {p: sum(c == p for row in self.board for c in row) for p in self.players}
        best = max(counts, key=counts.get)
        self._winner = best if counts[self.players[0]] != counts[self.players[1]] else None

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        p0 = self.players[0] if self.players else 'black'
        p1 = self.players[1] if len(self.players) > 1 else 'white'
        syms = {None: '.', p0: 'B', p1: 'W'}
        lines = [t('othello.title')]
        lines.append('  ' + ' '.join(str(i) for i in range(SIZE)))
        for i, row in enumerate(self.board):
            lines.append(f'{i} ' + ' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'board': [row[:] for row in self.board],
                'turn': self.current_turn(), 'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.lower() == 'pass':
            return {'pass': True}
        if raw.startswith('{'):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'row': int(parts[0]), 'col': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Place a disc to flip opponent pieces sandwiched between yours.',
            'Player with the most discs when the board is full wins.',
            'Move: <row> <col>   e.g. "3 4"   or   "pass"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_othello.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/othello.py clients/python/tests/test_othello.py
git commit -m "feat(python): rewrite Othello with load_state, parse_input, get_help"
```

---

### Task 9: Rewrite `games/checkers.py`

**Files:**
- Modify: `clients/python/games/checkers.py`
- Test: `clients/python/tests/test_checkers.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores():
    g = make()
    state = g.get_state()
    g2 = Checkers()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.current_turn() == 'alice'

def test_parse_input_four_numbers():
    assert make().parse_input('2 3 4 5') == {'from': [2, 3], 'to': [4, 5]}

def test_parse_input_invalid():
    assert make().parse_input('abc') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_checkers.py -x -q
```

- [ ] **Step 3: Write `games/checkers.py`**

```python
from typing import List, Optional, Tuple
from games.base import BaseGame
from framework.i18n import t
import json


class Checkers(BaseGame):
    def __init__(self):
        self.board = [[None] * 8 for _ in range(8)]
        self.players: List[str] = []
        self._turn_idx = 0
        self._over = False
        self._winner = None
        self._init_board()

    def _init_board(self) -> None:
        for r in range(8):
            for c in range(8):
                if (r + c) % 2 == 1:
                    if r < 3:
                        self.board[r][c] = ('black', False)
                    elif r > 4:
                        self.board[r][c] = ('red', False)

    def start(self, players: List[str]) -> None:
        self.__init__()
        self.players = players

    def current_turn(self) -> Optional[str]:
        return self.players[self._turn_idx] if self.players else None

    def _opponent(self, color: str) -> str:
        return 'black' if color == 'red' else 'red'

    def _get_moves(self, color: str) -> list:
        moves = []
        fwd = [(-1, -1), (-1, 1)] if color == 'red' else [(1, -1), (1, 1)]
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if not p or p[0] != color:
                    continue
                dirs = fwd if not p[1] else [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                for dr, dc in dirs:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 8 and 0 <= nc < 8 and self.board[nr][nc] is None:
                        moves.append(((r, c), (nr, nc)))
        return moves

    def _get_jumps(self, color: str) -> list:
        jumps = []
        opp = self._opponent(color)
        fwd = [(-1, -1), (-1, 1)] if color == 'red' else [(1, -1), (1, 1)]
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if not p or p[0] != color:
                    continue
                dirs = fwd if not p[1] else [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                for dr, dc in dirs:
                    mr, mc = r + dr, c + dc
                    lr, lc = r + 2 * dr, c + 2 * dc
                    if (0 <= lr < 8 and 0 <= lc < 8 and
                            self.board[mr][mc] and self.board[mr][mc][0] == opp and
                            self.board[lr][lc] is None):
                        jumps.append(((r, c), (mr, mc), (lr, lc)))
        return jumps

    def validate_move(self, player_id: str, move_data: dict) -> bool:
        if self._over or player_id != self.current_turn():
            return False
        color = player_id
        frm = tuple(move_data.get('from', []))
        to = tuple(move_data.get('to', []))
        if len(frm) != 2 or len(to) != 2:
            return False
        p = self.board[frm[0]][frm[1]]
        if not p or p[0] != color:
            return False
        jumps = self._get_jumps(color)
        if jumps:
            return any(j[0] == frm and j[2] == to for j in jumps)
        return any(m[0] == frm and m[1] == to for m in self._get_moves(color))

    def apply_move(self, player_id: str, move_data: dict) -> None:
        color = player_id
        frm = tuple(move_data['from'])
        to = tuple(move_data['to'])
        piece = self.board[frm[0]][frm[1]]
        self.board[frm[0]][frm[1]] = None
        jumps = self._get_jumps(color)
        jumped = next((j[1] for j in jumps if j[0] == frm and j[2] == to), None)
        if jumped:
            self.board[jumped[0]][jumped[1]] = None
        is_king = piece[1] or (color == 'red' and to[0] == 0) or (color == 'black' and to[0] == 7)
        self.board[to[0]][to[1]] = (color, is_king)
        opp = self._opponent(color)
        if not any(self.board[r][c] and self.board[r][c][0] == opp
                   for r in range(8) for c in range(8)):
            self._over = True
            self._winner = color
        elif not self._get_jumps(opp) and not self._get_moves(opp):
            self._over = True
            self._winner = color
        else:
            self._turn_idx = 1 - self._turn_idx

    def is_over(self):
        return self._over, self._winner

    def render(self, perspective: Optional[str] = None) -> str:
        syms = {None: '.', ('red', False): 'r', ('red', True): 'R',
                ('black', False): 'b', ('black', True): 'B'}
        lines = [t('checkers.title')]
        for i, row in enumerate(self.board):
            lines.append(f'{i} ' + ' '.join(syms.get(c, '.') for c in row))
        return '\n'.join(lines)

    def get_state(self, perspective: Optional[str] = None) -> dict:
        return {'board': [[list(c) if c else None for c in r] for r in self.board],
                'turn': self.current_turn(), 'players': self.players}

    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [
                [tuple(c) if c else None for c in row]
                for row in data['board']
            ]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 4:
            try:
                nums = [int(p) for p in parts]
                return {'from': [nums[0], nums[1]], 'to': [nums[2], nums[3]]}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Jump over opponent pieces to capture them. Multi-jump if possible.',
            'Reach the far end to become a king (can move backwards).',
            'Move: <fromRow> <fromCol> <toRow> <toCol>   e.g. "2 3 4 5"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_checkers.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/checkers.py clients/python/tests/test_checkers.py
git commit -m "feat(python): rewrite Checkers with load_state, parse_input, get_help"
```

---

### Task 10: Rewrite `games/chess.py`

**Files:**
- Modify: `clients/python/games/chess.py`
- Test: `clients/python/tests/test_chess.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores_board():
    g = make()
    state = g.get_state()
    g2 = Chess()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.current_turn() == 'alice'
    assert ('w', 'K') in g2.board.values()

def test_parse_input_from_to():
    assert make().parse_input('e2 e4') == {'from': 'e2', 'to': 'e4'}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_chess.py -x -q
```

- [ ] **Step 3: Add `load_state`, `parse_input`, `get_help` to the existing chess.py**

Keep ALL the existing Chess logic intact. Add these three methods inside the `Chess` class:

```python
    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'board' in data:
            self.board = {sq: tuple(p) for sq, p in data['board'].items()}
        if 'players' in data:
            self.players = list(data['players'])
            if len(self.players) == 2:
                self._cmap = {self.players[0]: 'w', self.players[1]: 'b'}
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        if 'castle' in data:
            self._castle = data['castle']
        if 'en_passant' in data:
            self._en_passant = data['en_passant']

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            return {'from': parts[0], 'to': parts[1]}
        return None

    def get_help(self) -> List[str]:
        return [
            'Standard chess. Castling, en passant, and promotion all supported.',
            'Move: <from> <to>   e.g. "e2 e4"   castle: "e1 g1"',
        ]
```

Also update the import at the top of chess.py:
```python
# Change: from i18n import t
# To:
from framework.i18n import t
```

And add `get_state` if missing (Chess currently does not serialize castle/en_passant for `load_state`):
```python
    def get_state(self, perspective=None) -> dict:
        return {
            'board': {sq: list(p) for sq, p in self.board.items()},
            'turn': self.current_turn(),
            'players': self.players,
            'castle': self._castle,
            'en_passant': self._en_passant,
        }
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_chess.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/chess.py clients/python/tests/test_chess.py
git commit -m "feat(python): add load_state, parse_input, get_help to Chess"
```

---

### Task 11: Rewrite `games/battleship.py`

**Files:**
- Modify: `clients/python/games/battleship.py`
- Test: `clients/python/tests/test_battleship.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores_phase():
    g = make_placed()   # use existing helper that places all ships
    state = g.get_state('alice')
    g2 = Battleship()
    g2.start(['alice', 'bob'])
    g2.load_state(state, 'alice')
    assert g2._phase == 'battle'

def test_parse_input_place_h():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('3 4 h') == {'place': {'row': 3, 'col': 4, 'horiz': True}}

def test_parse_input_place_v():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('3 4 v') == {'place': {'row': 3, 'col': 4, 'horiz': False}}

def test_parse_input_shot():
    g = Battleship()
    g.start(['alice', 'bob'])
    g._phase = 'battle'
    assert g.parse_input('5 6') == {'shot': {'row': 5, 'col': 6}}

def test_parse_input_invalid():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert g.parse_input('abc') is None

def test_get_help_nonempty():
    g = Battleship()
    g.start(['alice', 'bob'])
    assert len(g.get_help()) >= 3
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_battleship.py -x -q
```

- [ ] **Step 3: Add `load_state`, `parse_input`, `get_help` to `battleship.py`**

Keep all existing Battleship logic. Add inside the class and fix import:

```python
# top of file: change "from i18n import t" → "from framework.i18n import t"

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'phase' in data:
            self._phase = data['phase']
        if 'players' in data:
            self.players = list(data['players'])
            for p in self.players:
                if p not in self._ships:
                    self._ships[p] = []
                    self._placed[p] = 0
                    self._shots[p] = {}
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        # own_ships: list of [row,col] pairs → reconstruct as sets per ship
        # The host broadcasts own ships as flat [r,c] pairs; we store them as sets
        if 'own_ships' in data and perspective in self.players:
            flat = [tuple(c) for c in data['own_ships']]
            ship_sizes = [5, 4, 3, 3, 2]
            ships, i = [], 0
            for size in ship_sizes:
                ships.append(set(flat[i:i + size]))
                i += size
            self._ships[perspective] = ships
            self._placed[perspective] = len(ships)
        if 'my_shots' in data and perspective in self.players:
            self._shots[perspective] = {
                tuple(int(x) for x in k.split(',')): v
                for k, v in data['my_shots'].items()
            }

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 3:
            try:
                r, c = int(parts[0]), int(parts[1])
                horiz = parts[2].lower() != 'v'
                return {'place': {'row': r, 'col': c, 'horiz': horiz}}
            except ValueError:
                return None
        if len(parts) == 2:
            try:
                r, c = int(parts[0]), int(parts[1])
                if self._phase == 'place':
                    return {'place': {'row': r, 'col': c, 'horiz': True}}
                return {'shot': {'row': r, 'col': c}}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Place ships secretly, then take turns calling coordinates to sink them.',
            'Place ship: <row> <col> <h|v>   e.g. "3 4 h"  (or "3 4 v" for vertical)',
            'Shoot:      <row> <col>          e.g. "3 4"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_battleship.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/battleship.py clients/python/tests/test_battleship.py
git commit -m "feat(python): add load_state, parse_input, get_help to Battleship"
```

---

### Task 12: Rewrite `games/go.py`

**Files:**
- Modify: `clients/python/games/go.py`
- Test: `clients/python/tests/test_go.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'row': 3, 'col': 3})
    state = g.get_state()
    g2 = Go()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.board[3][3] == 'alice'

def test_parse_input_row_col():
    assert make().parse_input('3 4') == {'row': 3, 'col': 4}

def test_parse_input_pass():
    assert make().parse_input('pass') == {'pass': True}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_go.py -x -q
```

- [ ] **Step 3: Add `load_state`, `parse_input`, `get_help` to `go.py`**

Keep all existing Go logic. Fix import and add methods:

```python
# top: from i18n import t → from framework.i18n import t

    def get_state(self, perspective=None) -> dict:
        return {
            'board': [row[:] for row in self.board],
            'turn': self.current_turn(),
            'players': self.players,
            'captures': dict(self._captures),
            'passes': self._passes,
        }

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        if 'captures' in data:
            self._captures = dict(data['captures'])
        if 'passes' in data:
            self._passes = data['passes']

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.lower() == 'pass':
            return {'pass': True}
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'row': int(parts[0]), 'col': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Place stones to surround territory on a 9×9 board. Ko rule enforced.',
            'Higher score (territory + captures) wins.',
            'Move: <row> <col>   e.g. "3 4"   or   "pass"',
        ]
```

Also ensure existing Go `get_state` is removed/replaced with the version above (it likely doesn't include captures/passes currently).

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_go.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/go.py clients/python/tests/test_go.py
git commit -m "feat(python): add load_state, parse_input, get_help to Go"
```

---

### Task 13: Rewrite `games/hex_game.py`

**Files:**
- Modify: `clients/python/games/hex_game.py`
- Test: `clients/python/tests/test_hex.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'row': 5, 'col': 5})
    state = g.get_state()
    g2 = Hex()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.board[5][5] == 'alice'

def test_parse_input_row_col():
    assert make().parse_input('3 4') == {'row': 3, 'col': 4}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 2
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_hex.py -x -q
```

- [ ] **Step 3: Add methods to `hex_game.py`**

Keep all existing Hex logic. Fix import and add:

```python
# top: from i18n import t → from framework.i18n import t

    def get_state(self, perspective=None) -> dict:
        return {'board': [row[:] for row in self.board],
                'turn': self.current_turn(), 'players': self.players}

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'board' in data:
            self.board = [list(row) for row in data['board']]
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 2:
            try:
                return {'row': int(parts[0]), 'col': int(parts[1])}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Connect your two opposite sides of the 11×11 board. No draws.',
            'Move: <row> <col>   e.g. "3 4"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_hex.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/hex_game.py clients/python/tests/test_hex.py
git commit -m "feat(python): add load_state, parse_input, get_help to Hex"
```

---

### Task 14: Rewrite `games/quoridor.py`

**Files:**
- Modify: `clients/python/games/quoridor.py`
- Test: `clients/python/tests/test_quoridor.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores_pos():
    g = make()
    state = g.get_state()
    g2 = Quoridor()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.pos == g.pos

def test_parse_input_direction():
    assert make().parse_input('s') == {'move': 'S'}
    assert make().parse_input('N') == {'move': 'N'}

def test_parse_input_wall_h():
    assert make().parse_input('3 2 h') == {'wall': {'row': 3, 'col': 2, 'horiz': True}}

def test_parse_input_wall_v():
    assert make().parse_input('3 2 v') == {'wall': {'row': 3, 'col': 2, 'horiz': False}}

def test_parse_input_invalid():
    assert make().parse_input('xyz') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 3
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_quoridor.py -x -q
```

- [ ] **Step 3: Add methods to `quoridor.py`**

Keep all existing Quoridor logic. Fix import and add:

```python
# top: from i18n import t → from framework.i18n import t

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'pos' in data:
            self.pos = {p: tuple(v) for p, v in data['pos'].items()}
        if 'walls_left' in data:
            self.walls_left = dict(data['walls_left'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])
        if 'h_walls' in data:
            self._h_walls = {tuple(w) for w in data['h_walls']}
        if 'v_walls' in data:
            self._v_walls = {tuple(w) for w in data['v_walls']}

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json, re
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        parts = raw.split()
        if len(parts) == 1 and re.match(r'^[nsewNSEW]$', parts[0]):
            return {'move': parts[0].upper()}
        if len(parts) == 3:
            try:
                r, c = int(parts[0]), int(parts[1])
                horiz = parts[2].lower() == 'h'
                return {'wall': {'row': r, 'col': c, 'horiz': horiz}}
            except ValueError:
                pass
        return None

    def get_help(self) -> List[str]:
        return [
            'Race your pawn to the opposite side of the 9×9 board.',
            'Place walls to block opponents, but never seal off someone completely.',
            'Move pawn: n / s / e / w   e.g. "s"',
            'Place wall: <row> <col> <h|v>   e.g. "3 2 h"  (or "3 2 v" for vertical)',
        ]
```

Also update `get_state` to include wall sets for `load_state`:
```python
    def get_state(self, perspective=None) -> dict:
        return {
            'pos': {p: list(v) for p, v in self.pos.items()},
            'walls_left': dict(self.walls_left),
            'turn': self.current_turn(),
            'players': self.players,
            'h_walls': [list(w) for w in self._h_walls],
            'v_walls': [list(w) for w in self._v_walls],
        }
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_quoridor.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/quoridor.py clients/python/tests/test_quoridor.py
git commit -m "feat(python): add load_state, parse_input, get_help to Quoridor"
```

---

### Task 15: Rewrite `games/mancala.py`

**Files:**
- Modify: `clients/python/games/mancala.py`
- Test: `clients/python/tests/test_mancala.py`

- [ ] **Step 1: Add tests**

```python
def test_load_state_restores():
    g = make()
    g.apply_move('alice', {'pit': 2})
    state = g.get_state()
    g2 = Mancala()
    g2.start(['alice', 'bob'])
    g2.load_state(state)
    assert g2.current_turn() == g.current_turn()

def test_parse_input_pit():
    assert make().parse_input('2') == {'pit': 2}

def test_parse_input_invalid():
    assert make().parse_input('abc') is None

def test_get_help_nonempty():
    assert len(make().get_help()) >= 3
```

- [ ] **Step 2: Run new tests, confirm fail**

```bash
pytest tests/test_mancala.py -x -q
```

- [ ] **Step 3: Add methods to `mancala.py`**

Keep all existing Mancala logic. Fix import and add:

```python
# top: from i18n import t → from framework.i18n import t

    def load_state(self, data: dict, perspective=None) -> None:
        if not data:
            return
        if 'players' in data:
            self.players = list(data['players'])
        if 'pits' in data:
            self.pits = {p: list(v) for p, v in data['pits'].items()}
        if 'store' in data:
            self.store = dict(data['store'])
        if 'turn' in data and data['turn'] in self.players:
            self._turn_idx = self.players.index(data['turn'])

    def parse_input(self, raw: str) -> Optional[dict]:
        import json as _json
        raw = raw.strip()
        if raw.startswith('{'):
            try:
                obj = _json.loads(raw)
                if isinstance(obj, dict):
                    return obj
            except ValueError:
                pass
        try:
            return {'pit': int(raw.split()[0])}
        except (ValueError, IndexError):
            return None

    def get_help(self) -> List[str]:
        return [
            'Board shows  [0]:4  [1]:4  [2]:4  [3]:4  [4]:4  [5]:4  store=N',
            'Pick a pit index 0–5 to sow its seeds counter-clockwise.',
            'Land in your store → free turn.  Land in your own empty pit → capture opposite.',
            'Move: <pit>   e.g. "2"',
        ]
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pytest tests/test_mancala.py -v
```

- [ ] **Step 5: Commit**

```bash
git add clients/python/games/mancala.py clients/python/tests/test_mancala.py
git commit -m "feat(python): add load_state, parse_input, get_help to Mancala"
```

---

### Task 16: Run full test suite and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd clients/python
pytest -v
```

Expected: all tests pass (original 99 + new tests added across tasks 5–15). Count should be ≥ 120.

- [ ] **Step 2: Smoke test the app manually**

```bash
cd clients/python
python main.py --name alice --port 9000
```

Verify: lobby appears, `h` to host a game works, `j` to join works.

- [ ] **Step 3: Final commit**

```bash
git add clients/python/
git commit -m "feat(python): complete framework restructure — GameEngine + 11 games with full interface"
```
