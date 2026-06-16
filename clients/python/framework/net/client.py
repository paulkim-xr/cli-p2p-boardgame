import socket, threading
from framework.net.protocol import encode, decode, MsgType


class Client:
    def __init__(self, host_ip, port, player_id, on_message=None):
        self.host_ip = host_ip
        self.port = port
        self.player_id = player_id
        self.on_message = on_message
        self._sock = None

    def run(self):
        self.connect()
        while self._sock:
            threading.Event().wait(0.1)

    def connect(self):
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.connect((self.host_ip, self.port))
        self.send({'type': MsgType.JOIN, 'from': self.player_id})
        threading.Thread(target=self._recv_loop, daemon=True).start()

    def _recv_loop(self):
        try:
            for line in self._sock.makefile('rb'):
                if not line.strip():
                    continue
                try:
                    msg = decode(line)
                except Exception:
                    continue
                if self.on_message:
                    self.on_message(msg)
        except Exception:
            pass

    def send(self, msg):
        if self._sock:
            try:
                self._sock.sendall(encode(msg))
            except Exception:
                pass

    def disconnect(self):
        self.send({'type': MsgType.LEAVE, 'from': self.player_id})
        if self._sock:
            self._sock.close()
