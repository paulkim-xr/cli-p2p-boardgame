from lobby.session import GAMES
from ui.terminal import header, hr, BOLD, RESET, DIM, CYAN, GREEN, YELLOW


def show_lobby(sessions, my_name, chat_log):
    header('P2P 보드게임 허브')
    print()
    if sessions:
        print(BOLD + '  진행 중인 세션' + RESET)
        for i, (sid, s) in enumerate(sessions.items(), 1):
            player_str = ', '.join(s.players)
            print(f'  {DIM}[{i}]{RESET} {CYAN}{s.game}{RESET} — 호스트={s.host}  플레이어=[{player_str}]  포트={s.port}')
    else:
        print(DIM + '  LAN에서 세션을 찾을 수 없습니다' + RESET)
    print()
    hr()
    if chat_log:
        print(BOLD + '  채팅' + RESET)
        for entry in chat_log[-5:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print(f'  {DIM}[H]{RESET} 게임 호스트    {DIM}[J]{RESET} 번호로 참가    {DIM}[T]{RESET} 채팅    {DIM}[Q]{RESET} 종료')
    print()


def prompt_host(my_name):
    print()
    print(BOLD + '게임 목록:' + RESET)
    game_list = sorted(GAMES.keys())
    for i, g in enumerate(game_list, 1):
        info = GAMES[g]
        print(f'  {DIM}[{i}]{RESET} {info["name"]}  ({info["min"]}~{info["max"]}명)')
    choice = input('게임 번호를 선택하세요: ').strip()
    try:
        game = game_list[int(choice) - 1]
    except (ValueError, IndexError):
        return None, None
    max_p = GAMES[game].get('max', 2)
    raw = input(f'최대 플레이어 수 (2~{max_p}): ').strip()
    try:
        n = min(max(2, int(raw)), max_p)
    except ValueError:
        n = 2
    return game, n


def prompt_join(sessions):
    keys = list(sessions.keys())
    raw = input('세션 번호를 입력하세요: ').strip()
    try:
        return keys[int(raw) - 1]
    except (ValueError, IndexError):
        return None


def prompt_chat(my_name):
    msg = input(f'{YELLOW}{my_name}{RESET} 채팅> ').strip()
    return msg or None


def render_game(game_obj, players, chat_log):
    header('게임 중')
    print()
    print(game_obj.render())
    print()
    hr()
    if chat_log:
        print(BOLD + '  채팅' + RESET)
        for entry in chat_log[-3:]:
            print(f'  {DIM}{entry["from"]}{RESET}: {entry["text"]}')
    print()
    print(f'  {GREEN}내 차례{RESET}   {DIM}[T]{RESET} 채팅')
    print()
