import os
import sys

if sys.platform == 'win32':
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

RESET  = '\x1b[0m'
BOLD   = '\x1b[1m'
DIM    = '\x1b[2m'
RED    = '\x1b[31m'
GREEN  = '\x1b[32m'
YELLOW = '\x1b[33m'
CYAN   = '\x1b[36m'
WHITE  = '\x1b[37m'

def clear():
    print('\x1b[2J\x1b[H', end='', flush=True)

def move(row, col):
    print(f'\x1b[{row};{col}H', end='', flush=True)

def hide_cursor():
    print('\x1b[?25l', end='', flush=True)

def show_cursor():
    print('\x1b[?25h', end='', flush=True)

def print_at(row, col, text):
    print(f'\x1b[{row};{col}H{text}', end='', flush=True)

def hr(width=60, char='─'):
    print(DIM + char * width + RESET)

def header(title):
    clear()
    width = 60
    pad = (width - len(title) - 2) // 2
    print(DIM + '╔' + '═' * width + '╗' + RESET)
    print(DIM + '║' + ' ' * pad + RESET + BOLD + title + RESET + ' ' * (width - pad - len(title)) + DIM + '║' + RESET)
    print(DIM + '╚' + '═' * width + '╝' + RESET)

def menu(options, prompt='> '):
    for i, opt in enumerate(options, 1):
        print(f'  {DIM}[{i}]{RESET} {opt}')
    return input(prompt).strip()

def getch():
    if sys.platform == 'win32':
        import msvcrt
        return msvcrt.getwch()
    import tty, termios
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        return sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def read_line_with_refresh(prompt: str, on_check=None) -> str:
    """Read a line of input, calling on_check() every ~200ms.

    If on_check returns True (snap changed and screen was re-rendered),
    the prompt and accumulated buffer are redrawn. Windows-only polling;
    falls back to plain input() on other platforms.
    """
    import time
    if sys.platform != 'win32':
        sys.stdout.write(prompt)
        sys.stdout.flush()
        return input()
    import msvcrt
    buf = ''
    sys.stdout.write(prompt)
    sys.stdout.flush()
    last_check = time.monotonic()
    while True:
        if msvcrt.kbhit():
            ch = msvcrt.getwch()
            if ch in ('\r', '\n'):
                sys.stdout.write('\n')
                sys.stdout.flush()
                return buf
            elif ch in ('\x08', '\x7f'):  # backspace
                if buf:
                    buf = buf[:-1]
                    sys.stdout.write('\b \b')
                    sys.stdout.flush()
            elif ch == '\x03':  # Ctrl+C
                sys.stdout.write('\n')
                sys.exit(0)
            elif ch in ('\x00', '\xe0'):  # special key prefix (arrow keys etc.)
                msvcrt.getwch()  # consume scan code
            else:
                ch_lower = ch.lower()
                sys.stdout.write(ch_lower)
                sys.stdout.flush()
                buf += ch_lower
        else:
            time.sleep(0.02)
            now = time.monotonic()
            if now - last_check >= 0.2:
                last_check = now
                if on_check and on_check():
                    sys.stdout.write(prompt + buf)
                    sys.stdout.flush()
