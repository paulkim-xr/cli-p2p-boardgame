import random
import time
import threading
from ui.terminal import clear, RESET, DIM, GREEN

_FAKE_LINES = [
    "PASSED tests/test_config.py::test_port_default",
    "PASSED tests/test_protocol.py::test_encode_decode",
    "PASSED tests/test_host_client.py::test_join_leave",
    "PASSED tests/test_discovery.py::test_beacon",
    "INFO  [2026-06-11 09:12:33] worker-1: task completed in 142ms",
    "INFO  [2026-06-11 09:12:34] scheduler: queue depth=3",
    "DEBUG [2026-06-11 09:12:34] cache: hit ratio=0.91 evictions=4",
    "PASSED tests/test_nim.py::test_validate",
    "PASSED tests/test_chess.py::test_scholars_mate",
    "INFO  [2026-06-11 09:12:35] gc: collected 0 objects",
    "PASSED tests/test_mastermind.py::test_exact_match",
    "WARNING api_client: retry 1/3 (connection reset)",
    "INFO  [2026-06-11 09:12:36] http: GET /api/health 200 12ms",
    "PASSED tests/test_connect_four.py::test_gravity",
    "DEBUG [2026-06-11 09:12:37] thread-pool: 4/8 workers active",
    "INFO  [2026-06-11 09:12:37] db: query took 8ms rows=42",
    "PASSED tests/test_othello.py::test_flip",
    "PASSED tests/test_quoridor.py::test_wall",
    "INFO  [2026-06-11 09:12:38] cache: pruned 12 expired keys",
]

_active = False
_thread = None


def _run():
    clear()
    print(DIM + '$ pytest tests/ -v --tb=short' + RESET)
    time.sleep(0.3)
    idx = 0
    while _active:
        line = _FAKE_LINES[idx % len(_FAKE_LINES)]
        idx += 1
        color = GREEN if line.startswith('PASSED') else DIM
        print(color + line + RESET)
        time.sleep(random.uniform(0.06, 0.22))


def activate():
    global _active, _thread
    _active = True
    _thread = threading.Thread(target=_run, daemon=True)
    _thread.start()


def deactivate():
    global _active
    _active = False
    clear()
