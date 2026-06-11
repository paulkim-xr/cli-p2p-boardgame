import sys, time
sys.path.insert(0, 'clients/python')
from tests.conftest import find_free_port
from net.host import Host
from net.client import Client
from net.protocol import MsgType
from games.nim import Nim


def make_host(port):
    game = Nim()
    game.start(['alice', 'bob'])
    h = Host(port=port, game=game, session_name='test')
    h.start()
    return h


def test_client_can_connect_and_receive_player_list():
    port = find_free_port()
    host = make_host(port)
    time.sleep(0.1)

    received = []
    c = Client('127.0.0.1', port, 'alice')
    c.on_message = received.append
    c.connect()
    time.sleep(0.3)

    types = [m['type'] for m in received]
    assert MsgType.PLAYER_LIST in types
    c.disconnect()
    host.stop()


def test_chat_is_relayed_to_all_clients():
    port = find_free_port()
    host = make_host(port)
    time.sleep(0.1)

    msgs_bob = []
    ca = Client('127.0.0.1', port, 'alice')
    cb = Client('127.0.0.1', port, 'bob')
    cb.on_message = msgs_bob.append
    ca.connect()
    time.sleep(0.05)
    cb.connect()
    time.sleep(0.2)

    ca.send({'type': MsgType.CHAT, 'from': 'alice', 'body': 'hi'})
    time.sleep(0.3)

    chat = [m for m in msgs_bob if m['type'] == MsgType.CHAT]
    assert any(m['body'] == 'hi' for m in chat)
    ca.disconnect()
    cb.disconnect()
    host.stop()


def test_invalid_move_returns_error():
    port = find_free_port()
    host = make_host(port)
    time.sleep(0.1)

    errs = []
    c = Client('127.0.0.1', port, 'bob')  # bob goes second, not bob's turn
    c.on_message = lambda m: errs.append(m) if m['type'] == MsgType.ERROR else None
    c.connect()
    time.sleep(0.1)

    c.send({'type': MsgType.MOVE, 'from': 'bob', 'data': {'pile': 0, 'count': 1}})
    time.sleep(0.3)

    assert len(errs) > 0
    c.disconnect()
    host.stop()
