import sys, time
sys.path.insert(0, 'clients/python')
from tests.conftest import find_free_port
from lobby.discovery import Beacon, Listener


def test_listener_discovers_beacon():
    port = find_free_port()
    beacon = Beacon(port, {'session': 'test', 'game': 'nim', 'players': 1, 'max': 6})
    listener = Listener(port)
    listener.start()
    beacon.start()
    time.sleep(3.0)
    beacon.stop()
    listener.stop()
    sessions = listener.get_sessions()
    assert len(sessions) >= 1
    assert sessions[0]['game'] == 'nim'
