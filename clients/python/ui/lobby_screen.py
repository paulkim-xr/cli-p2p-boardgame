from lobby.session import GAMES
from ui.terminal import header, hr, BOLD, RESET, DIM, CYAN, GREEN, YELLOW
from i18n import t


def show_lobby(sessions, my_name, chat_log):
    header(t('lobby.title'))
    print()
    if sessions:
        print(BOLD + '  ' + t('lobby.sessions_header') + RESET)
        for i, (sid, s) in enumerate(sessions.items(), 1):
            player_str = ', '.join(s.players)
            print('  ' + t('lobby.session_row', i=i, game=s.game,
                            host=s.host, players=player_str, port=s.port))
    else:
        print(DIM + '  ' + t('lobby.no_sessions') + RESET)
    print()
    hr()
    if chat_log:
        print(BOLD + '  ' + t('lobby.chat_header') + RESET)
        for entry in chat_log[-5:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print('  ' + t('lobby.menu'))
    print()


def prompt_host(my_name):
    print()
    print(BOLD + t('host.games_header') + RESET)
    game_list = sorted(GAMES.keys())
    for i, g in enumerate(game_list, 1):
        info = GAMES[g]
        print(f'  {DIM}[{i}]{RESET} {info["name"]}  ({info["min"]}~{info["max"]}명)')
    choice = input(t('host.pick_game')).strip()
    try:
        game = game_list[int(choice) - 1]
    except (ValueError, IndexError):
        return None, None
    max_p = GAMES[game].get('max', 2)
    raw = input(t('host.max_players', max=max_p)).strip()
    try:
        n = min(max(2, int(raw)), max_p)
    except ValueError:
        n = 2
    return game, n


def prompt_join(sessions):
    keys = list(sessions.keys())
    raw = input(t('host.join_session')).strip()
    try:
        return keys[int(raw) - 1]
    except (ValueError, IndexError):
        return None


def prompt_chat(my_name):
    msg = input(t('host.chat_prompt', name=my_name)).strip()
    return msg or None


def render_game(game_obj, players, chat_log):
    header(t('game.header'))
    print()
    print(game_obj.render())
    print()
    hr()
    if chat_log:
        print(BOLD + '  ' + t('game.chat_header') + RESET)
        for entry in chat_log[-3:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print(f'  {GREEN}{t("game.your_turn")}{RESET}   {DIM}{t("game.chat_hint")}{RESET}')
    print()
