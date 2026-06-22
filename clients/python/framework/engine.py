import time
import sys
import json

from framework.net.protocol import MsgType
from framework.lobby.session import _load_game_classes
from framework.ui.terminal import clear, header, read_line_with_refresh, DIM, BOLD, RESET
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
                def _snap_check():
                    s = self._snap()
                    if s != self._last_snap:
                        clear()
                        render_game(game, self.players, self.chat_log.recent(3), self.name)
                        self._last_snap = s
                        return True
                    return False

                raw = read_line_with_refresh(t('game.move_prompt'), on_check=_snap_check).strip()
                if not raw:
                    self._last_snap = None
                    continue
                cmd = raw.lower()
                if cmd == 'q':
                    return
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
                if ch == 'q':
                    return
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
