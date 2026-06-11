#!/usr/bin/env python3
"""CLI P2P Board Game Hub — Python client"""

import sys
import threading
import time

from config import load_port
from net.host import Host
from net.client import Client
from net.protocol import MsgType, encode, decode
from lobby.discovery import Beacon, Listener
from lobby.session import GAMES, Session
from chat import ChatLog
from ui.terminal import clear, header, getch, BOLD, RESET, DIM, GREEN, YELLOW, CYAN
from ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat, render_game
from ui import boss_key


def main():
    import argparse
    ap = argparse.ArgumentParser(description='CLI P2P Board Game Hub')
    ap.add_argument('--port', type=int, default=None)
    ap.add_argument('--name', default=None)
    args = ap.parse_args()

    port = load_port(['--port', str(args.port)] if args.port else [])
    name = args.name or input('Your name: ').strip() or 'player'

    chat_log = ChatLog()
    sessions = {}
    listener = Listener(port=port + 1)
    listener_thread = threading.Thread(target=listener.run, daemon=True)
    listener_thread.start()

    host_obj = None
    client_obj = None
    game_obj = None
    players = []
    in_boss_key = False
    running = True

    def on_message(msg):
        nonlocal game_obj, players
        t = msg.get('type')
        if t == MsgType.CHAT:
            chat_log.add(msg.get('from', '?'), msg.get('text', ''))
        elif t == MsgType.PLAYER_LIST:
            players[:] = msg.get('players', [])
        elif t == MsgType.GAME_START:
            game_name = msg.get('game')
            if game_name in GAMES:
                game_obj = GAMES[game_name].cls()
                game_obj.start(msg.get('players', []))
        elif t == MsgType.STATE:
            if game_obj:
                state = msg.get('state', {})
                game_obj.load_state(state)

    def send_chat(text):
        if client_obj:
            client_obj.send({'type': MsgType.CHAT, 'from': name, 'text': text})

    def send_move(move):
        if client_obj:
            client_obj.send({'type': MsgType.MOVE, 'move': move, 'player': name})

    while running:
        sessions = {k: v for k, v in listener.sessions.items()}

        if in_boss_key:
            ch = getch()
            if ch == '\x1b':
                boss_key.deactivate()
                in_boss_key = False
            continue

        show_lobby(sessions, name, chat_log.recent(5))

        ch = getch().lower()

        if ch == '\x1b':
            boss_key.activate()
            in_boss_key = True
            continue

        if ch == 't':
            msg = prompt_chat(name)
            if msg:
                send_chat(msg)
            continue

        if ch == 'h':
            game_name, max_players = prompt_host(name)
            if not game_name:
                continue
            host_obj = Host(port=port, game_name=game_name, max_players=max_players)
            beacon = Beacon(host=name, game=game_name, port=port,
                            players=[], max_players=max_players)
            beacon_thread = threading.Thread(target=beacon.run, daemon=True)
            beacon_thread.start()
            host_obj.start()
            client_obj = Client('127.0.0.1', port, name, on_message)
            client_obj.connect()
            time.sleep(0.2)
            game_loop(name, client_obj, game_obj, players, chat_log,
                      send_move, send_chat)
            continue

        if ch == 'j':
            sid = prompt_join(sessions)
            if not sid:
                continue
            s = sessions[sid]
            client_obj = Client(s.host_ip or s.host, s.port, name, on_message)
            client_obj.connect()
            time.sleep(0.2)
            game_loop(name, client_obj, game_obj, players, chat_log,
                      send_move, send_chat)
            continue

        if ch == 'q':
            running = False


def game_loop(name, client_obj, game_obj, players, chat_log, send_move, send_chat):
    in_boss = False
    while True:
        if in_boss:
            ch = getch()
            if ch == '\x1b':
                boss_key.deactivate()
                in_boss = False
            continue

        if game_obj:
            render_game(game_obj, players, chat_log.recent(3))
        else:
            clear()
            header('waiting for game to start')
            time.sleep(0.5)
            continue

        if game_obj.is_over()[0]:
            done, winner = game_obj.is_over()
            clear()
            header('game over')
            print(f'\n  Winner: {BOLD}{winner}{RESET}\n')
            getch()
            return

        if game_obj.current_turn() == name:
            raw = input('move> ').strip()
            if not raw:
                continue
            if raw.lower() == 't':
                msg = prompt_chat(name)
                if msg:
                    send_chat(msg)
                continue
            send_move(raw)
        else:
            time.sleep(0.2)

        ch_check = _nonblocking_char()
        if ch_check == '\x1b':
            boss_key.activate()
            in_boss = True
        elif ch_check == 't':
            msg = input('chat> ').strip()
            if msg:
                send_chat(msg)


def _nonblocking_char():
    if sys.platform == 'win32':
        import msvcrt
        if msvcrt.kbhit():
            return msvcrt.getwch()
    return None


if __name__ == '__main__':
    main()
