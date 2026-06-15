#!/usr/bin/env python3
"""CLI P2P Board Game Framework — Python client"""

import sys
import threading
import time
from types import SimpleNamespace

import framework.i18n as i18n
from framework.i18n import t
from framework.config import load_port
from framework.net.host import Host
from framework.net.client import Client
from framework.net.protocol import MsgType
from framework.lobby.discovery import Beacon, Listener
from framework.chat import ChatLog
from framework.ui.terminal import getch
from framework.ui.lobby_screen import show_lobby, prompt_host, prompt_join, prompt_chat
from framework.engine import GameEngine


def _sessions_as_ns(raw_list):
    """Convert list of beacon dicts from Listener.get_sessions() to SimpleNamespace objects
    with the .game, .host, .port, .players attributes that show_lobby expects."""
    result = {}
    for info in raw_list:
        host_ip = info.get('host_ip', '')
        ns = SimpleNamespace(
            game=info.get('game', ''),
            host=info.get('host', host_ip),
            host_ip=host_ip,
            port=info.get('port', 0),
            players=info.get('players', []),
        )
        result[host_ip] = ns
    return result


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
    listener = Listener(port)
    listener.start()

    running = True
    while running:
        sessions = _sessions_as_ns(listener.get_sessions())
        show_lobby(sessions, name, chat_log.recent(5))
        ch = getch().lower()

        if ch == 't':
            msg = prompt_chat(name)
            # pre-game chat: no client yet, so just discard

        elif ch == 'h':
            game_name, max_players = prompt_host(name)
            if not game_name:
                continue
            host_obj = Host(port=port, game_name=game_name, max_players=max_players)
            host_obj.start()
            session_info = {
                'game': game_name,
                'host': name,
                'port': port,
                'players': [],
            }
            beacon = Beacon(port, session_info)
            beacon.start()
            _run_game('127.0.0.1', port, name, chat_log)
            beacon.stop()

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
