#!/usr/bin/env python3
"""CLI P2P Board Game Hub — Python client"""

import sys
import threading
import time

import i18n
from i18n import t
from config import load_port
from net.host import Host
from net.client import Client
from net.protocol import MsgType
from lobby.discovery import Beacon, Listener
from lobby.session import GAMES
from chat import ChatLog
from ui.terminal import clear, header, getch, BOLD, RESET, DIM, GREEN, YELLOW
from ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat, render_game


def main():
    import argparse
    ap = argparse.ArgumentParser(description='CLI P2P Board Game Hub')
    ap.add_argument('--port', type=int, default=None)
    ap.add_argument('--name', default=None)
    ap.add_argument('--lang', default=None, choices=['ko', 'en'],
                    help='UI language (auto-detected from system if not set)')
    args = ap.parse_args()

    if args.lang:
        i18n.set_locale(args.lang)
    # else: already auto-detected at i18n import time

    port = load_port(['--port', str(args.port)] if args.port else [])
    name = args.name or input(t('prompt.name')).strip() or t('prompt.default_name')

    chat_log = ChatLog()
    listener = Listener(port=port + 1)
    threading.Thread(target=listener.run, daemon=True).start()

    host_obj = None
    client_obj = None
    game_obj = None
    players = []
    running = True

    def on_message(msg):
        nonlocal game_obj, players
        t = msg.get('type')
        if t == MsgType.CHAT:
            chat_log.add(msg.get('from', '?'), msg.get('text', ''))
        elif t == MsgType.PLAYER_LIST:
            players[:] = msg.get('players', [])
        elif t == MsgType.GAME_START:
            from lobby.session import _load_game_classes
            classes = _load_game_classes()
            game_name = msg.get('game')
            if game_name in classes:
                game_obj = classes[game_name]()
                game_obj.start(msg.get('players', []))
        elif t == MsgType.STATE:
            if game_obj and hasattr(game_obj, 'load_state'):
                game_obj.load_state(msg.get('state', {}))

    def send_chat(text):
        if client_obj:
            client_obj.send({'type': MsgType.CHAT, 'from': name, 'text': text})

    def send_move(move):
        if client_obj:
            client_obj.send({'type': MsgType.MOVE, 'from': name, 'data': move})

    while running:
        sessions = dict(listener.sessions)
        show_lobby(sessions, name, chat_log.recent(5))
        ch = getch().lower()

        if ch == 't':
            msg = prompt_chat(name)
            if msg:
                send_chat(msg)

        elif ch == 'h':
            game_name, max_players = prompt_host(name)
            if not game_name:
                continue
            host_obj = Host(port=port, game_name=game_name, max_players=max_players)
            beacon = Beacon(host=name, game=game_name, port=port,
                            players=[], max_players=max_players)
            threading.Thread(target=beacon.run, daemon=True).start()
            host_obj.start()
            client_obj = Client('127.0.0.1', port, name, on_message)
            client_obj.connect()
            time.sleep(0.2)
            game_loop(name, client_obj, game_obj, players, chat_log,
                      send_move, send_chat)

        elif ch == 'j':
            sid = prompt_join(sessions)
            if not sid:
                continue
            s = sessions[sid]
            client_obj = Client(s.host_ip or s.host, s.port, name, on_message)
            client_obj.connect()
            time.sleep(0.2)
            game_loop(name, client_obj, game_obj, players, chat_log,
                      send_move, send_chat)

        elif ch == 'q':
            running = False


def game_loop(name, client_obj, game_obj, players, chat_log, send_move, send_chat):
    while True:
        if game_obj:
            render_game(game_obj, players, chat_log.recent(3))
        else:
            clear()
            header(t('game.waiting'))
            time.sleep(0.5)
            continue

        if game_obj.is_over()[0]:
            _, winner = game_obj.is_over()
            clear()
            header(t('game.over'))
            msg = t('game.winner', winner=winner) if winner else t('game.draw')
            print(f'\n  {BOLD}{msg}{RESET}\n')
            input('  ' + t('game.continue'))
            return

        if game_obj.current_turn() == name:
            raw = input(t('game.move_prompt')).strip()
            if not raw:
                continue
            if raw.lower() == 't':
                msg = prompt_chat(name)
                if msg:
                    send_chat(msg)
                continue
            send_move(raw)
        else:
            ch_check = _nonblocking_char()
            if ch_check == 't':
                msg = input(t('game.chat_prompt')).strip()
                if msg:
                    send_chat(msg)
            time.sleep(0.2)


def _nonblocking_char():
    if sys.platform == 'win32':
        import msvcrt
        if msvcrt.kbhit():
            return msvcrt.getwch()
    return None


if __name__ == '__main__':
    main()
