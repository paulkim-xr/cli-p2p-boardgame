"""
Cross-client interop helper: Python Bob client.
Bob plays moves 2 (pile 1, count 5) and 4 (pile 2, count 1 — last stone, wins).
Alice is expected to be hosting separately (any client implementation).

Usage: python py_bob_join.py <PORT>
Output: lines beginning with PASS: or FAIL:
"""
import sys, os, time, threading

PORT = int(sys.argv[1])

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'clients', 'python'))

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

time.sleep(0.4)  # wait for host to start

c = Client('127.0.0.1', PORT, 'bob', on_msg)
c.connect()

if not wait_for_count('GAME_START', 1):
    print('FAIL: no GAME_START within 8s', flush=True)
    sys.exit(1)
print('PASS: got GAME_START', flush=True)

# wait for alice's first move STATE, then play move 2
if not wait_for_count('STATE', 1):
    print('FAIL: no STATE x1 (alice did not move)', flush=True)
    sys.exit(1)

c.send({'type': MsgType.MOVE, 'from': 'bob', 'data': {'pile': 1, 'count': 5}})

# wait for alice's second move STATE (STATE count 3), then take last stone
if not wait_for_count('STATE', 3):
    print('FAIL: no STATE x3 (alice did not play move 3)', flush=True)
    sys.exit(1)

c.send({'type': MsgType.MOVE, 'from': 'bob', 'data': {'pile': 2, 'count': 1}})

# wait for GAME_OVER
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

print('JOIN done', flush=True)
time.sleep(0.3)
