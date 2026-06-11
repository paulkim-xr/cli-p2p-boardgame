import socket, threading
from net.protocol import encode, decode, MsgType


class Host:
    def __init__(self, port, game, session_name):
        self.port = port
        self.game = game
        self.session_name = session_name
        self.clients = {}   # player_id -> socket
        self._lock = threading.Lock()
        self._server = None
        self._running = False

    def start(self):
        self._server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server.bind(('', self.port))
        self._server.listen(8)
        self._server.settimeout(1.0)
        self._running = True
        threading.Thread(target=self._accept_loop, daemon=True).start()

    def stop(self):
        self._running = False
        if self._server:
            self._server.close()

    def _accept_loop(self):
        while self._running:
            try:
                conn, _ = self._server.accept()
                threading.Thread(target=self._handle, args=(conn,), daemon=True).start()
            except socket.timeout:
                continue
            except OSError:
                break

    def _handle(self, conn):
        player_id = None
        try:
            for line in conn.makefile('rb'):
                if not line.strip():
                    continue
                try:
                    msg = decode(line)
                except Exception:
                    continue
                t = msg.get('type')
                if t == MsgType.JOIN:
                    player_id = msg['from']
                    with self._lock:
                        self.clients[player_id] = conn
                    self.broadcast({'type': MsgType.PLAYER_LIST,
                                    'players': list(self.clients.keys())})
                elif t == MsgType.MOVE:
                    self._handle_move(msg)
                elif t == MsgType.CHAT:
                    self.broadcast(msg)
                elif t == MsgType.LEAVE:
                    break
        finally:
            if player_id:
                with self._lock:
                    self.clients.pop(player_id, None)
                self.broadcast({'type': MsgType.PLAYER_LIST,
                                'players': list(self.clients.keys())})
            try:
                conn.close()
            except Exception:
                pass

    def _handle_move(self, msg):
        player_id = msg['from']
        move_data = msg.get('data', {})
        if self.game.current_turn() != player_id:
            self._send_to(player_id, {'type': MsgType.ERROR, 'message': 'not your turn'})
            return
        if not self.game.validate_move(player_id, move_data):
            self._send_to(player_id, {'type': MsgType.ERROR, 'message': 'invalid move'})
            return
        self.game.apply_move(player_id, move_data)
        with self._lock:
            pids = list(self.clients.keys())
        for pid in pids:
            state_msg = {'type': MsgType.STATE,
                         'data': self.game.get_state(perspective=pid)}
            self._send_to(pid, state_msg)
        done, winner = self.game.is_over()
        if done:
            self.broadcast({'type': MsgType.GAME_OVER, 'winner': winner})

    def broadcast(self, msg):
        data = encode(msg)
        with self._lock:
            conns = list(self.clients.values())
        for c in conns:
            self._send_raw(c, data)

    def _send_to(self, player_id, msg):
        with self._lock:
            conn = self.clients.get(player_id)
        if conn:
            self._send_raw(conn, encode(msg))

    def _send_raw(self, conn, data):
        try:
            conn.sendall(data)
        except Exception:
            pass
