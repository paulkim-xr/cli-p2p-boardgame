import socket


def find_free_port(start=47777):
    """Find a free port starting from start, stepping by 2 (keeps port+1 free for UDP)."""
    port = start
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                port += 2
