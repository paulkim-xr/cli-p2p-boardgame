from lobby.session import GAMES
from ui.terminal import header, menu, hr, BOLD, RESET, DIM, CYAN, GREEN, YELLOW


def show_lobby(sessions, my_name, chat_log):
    header('p2p game hub')
    print()
    if sessions:
        print(BOLD + '  Active Sessions' + RESET)
        for i, (sid, s) in enumerate(sessions.items(), 1):
            player_str = ','.join(s.players)
            print(f'  {DIM}[{i}]{RESET} {CYAN}{s.game}{RESET} — host={s.host}  players=[{player_str}]  port={s.port}')
    else:
        print(DIM + '  No sessions found on LAN' + RESET)
    print()
    hr()
    if chat_log:
        print(BOLD + '  Chat' + RESET)
        for entry in chat_log[-5:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print(f'  {DIM}[H]{RESET} Host a game    {DIM}[J]{RESET} Join by number    {DIM}[T]{RESET} Chat    {DIM}[ESC]{RESET} Boss key')
    print()


def prompt_host(my_name):
    print()
    print(BOLD + 'Available games:' + RESET)
    game_list = sorted(GAMES.keys())
    for i, g in enumerate(game_list, 1):
        print(f'  {DIM}[{i}]{RESET} {g}')
    choice = input('Pick game number: ').strip()
    try:
        game = game_list[int(choice) - 1]
    except (ValueError, IndexError):
        return None, None
    max_p = GAMES[game].get('max', 2)
    raw = input(f'Max players (2-{max_p}): ').strip()
    try:
        n = min(max(2, int(raw)), max_p)
    except ValueError:
        n = 2
    return game, n


def prompt_join(sessions):
    keys = list(sessions.keys())
    raw = input('Session number: ').strip()
    try:
        return keys[int(raw) - 1]
    except (ValueError, IndexError):
        return None


def prompt_chat(my_name):
    msg = input(f'{YELLOW}{my_name}{RESET}> ').strip()
    return msg or None


def render_game(game_obj, players, chat_log):
    header('in game')
    print()
    print(game_obj.render())
    print()
    hr()
    if chat_log:
        print(BOLD + '  Chat' + RESET)
        for entry in chat_log[-3:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print(f'  {GREEN}Your move{RESET}   {DIM}[T]{RESET} chat   {DIM}[ESC]{RESET} boss key')
    print()
