import socket, threading
from framework.net.protocol import encode, decode, MsgType


class Host:
    def __init__(self, port, game=None, session_name='', game_name=None, max_players=2):
        self.port = port
        self.game = game
        self.session_name = session_name or game_name or ''
        self._game_name = game_name
        self._max_players = max_players
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

    def serve(self):
        self.start()
        while self._running:
            threading.Event().wait(0.1)

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
                    players_now = list(self.clients.keys())
                    self.broadcast({'type': MsgType.PLAYER_LIST, 'players': players_now})
                    if (self.game is None and self._game_name and
                            len(players_now) >= self._max_players):
                        from framework.lobby.session import _load_game_classes
                        classes = _load_game_classes()
                        if self._game_name in classes:
                            self.game = classes[self._game_name]()
                            self.game.start(players_now)
                            self.broadcast({'type': MsgType.GAME_START,
                                            'game': self._game_name,
                                            'players': players_now})
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
            from framework.i18n import t
            self._send_to(player_id, {'type': MsgType.ERROR, 'message': t('error.not_your_turn')})
            return
        if not self.game.validate_move(player_id, move_data):
            from framework.i18n import t
            self._send_to(player_id, {'type': MsgType.ERROR, 'message': t('error.invalid_move')})
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
