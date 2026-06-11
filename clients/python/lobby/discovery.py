import socket, json, threading


class Beacon:
    def __init__(self, port, session_info: dict):
        self.port = port
        self.info = session_info
        self._stop = threading.Event()

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()

    def stop(self):
        self._stop.set()

    def _loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        data = json.dumps(self.info).encode('utf-8')
        while not self._stop.is_set():
            try:
                sock.sendto(data, ('<broadcast>', self.port + 1))
            except Exception:
                pass
            self._stop.wait(2.0)
        sock.close()


class Listener:
    def __init__(self, port):
        self.port = port
        self._sessions = {}   # host_ip -> info
        self._stop = threading.Event()

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()

    def stop(self):
        self._stop.set()

    def _loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('', self.port + 1))
        except OSError:
            return
        sock.settimeout(1.0)
        while not self._stop.is_set():
            try:
                data, addr = sock.recvfrom(2048)
                info = json.loads(data.decode('utf-8'))
                info['host_ip'] = addr[0]
                self._sessions[addr[0]] = info
            except socket.timeout:
                continue
            except Exception:
                continue
        sock.close()

    def get_sessions(self):
        return list(self._sessions.values())
