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
