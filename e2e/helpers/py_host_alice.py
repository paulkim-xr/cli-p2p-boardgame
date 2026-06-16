"""
Cross-client interop helper: Python Host + Python Alice client.
Alice plays moves 1 (pile 0, count 3) and 3 (pile 2, count 6).
Bob is expected to join separately (any client implementation).

Usage: python py_host_alice.py <PORT>
Output: lines beginning with PASS: or FAIL:
"""
import sys, os, time, threading

PORT = int(sys.argv[1])

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'clients', 'python'))

from framework.net.host import Host
from framework.net.client import Client
from framework.net.protocol import MsgType

received = []
_lock = threading.Lock()

def on_msg(msg):
    with _lock:
        received.append(msg)

def count(mtype):
    with _lock:
        return sum(1 for m in received if m.get('type') == mtype)

def wait_for_count(mtype, n, timeout=8):
    end = time.time() + timeout
    while time.time() < end:
        if count(mtype) >= n:
            return True
        time.sleep(0.04)
    return False

h = Host(port=PORT, game_name='nim', max_players=2)
h.start()
time.sleep(0.15)

c = Client('127.0.0.1', PORT, 'alice', on_msg)
c.connect()

# wait for bob to join and game to start
if not wait_for_count('GAME_START', 1):
    print('FAIL: no GAME_START within 8s', flush=True)
    sys.exit(1)
print('PASS: got GAME_START', flush=True)

time.sleep(0.05)

# move 1: take 3 from pile 0 → [0,5,7]
c.send({'type': MsgType.MOVE, 'from': 'alice', 'data': {'pile': 0, 'count': 3}})

# wait for STATE 2 (after bob's response move)
if not wait_for_count('STATE', 2):
    print('FAIL: no STATE x2 (bob did not move)', flush=True)
    sys.exit(1)

time.sleep(0.05)

# move 3: take 6 from pile 2 → [0,0,1]
c.send({'type': MsgType.MOVE, 'from': 'alice', 'data': {'pile': 2, 'count': 6}})

# wait for GAME_OVER (bob takes last stone)
if not wait_for_count('GAME_OVER', 1, timeout=10):
    print('FAIL: no GAME_OVER within 10s', flush=True)
    sys.exit(1)

with _lock:
    go = next((m for m in received if m.get('type') == 'GAME_OVER'), None)

if go and go.get('winner') == 'bob':
    print(f"PASS: GAME_OVER winner=bob", flush=True)
else:
    print(f"FAIL: unexpected GAME_OVER: {go}", flush=True)
    sys.exit(1)

print('HOST done', flush=True)
time.sleep(0.3)
