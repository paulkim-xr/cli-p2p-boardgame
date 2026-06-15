import json


class MsgType:
    JOIN = 'JOIN'
    LEAVE = 'LEAVE'
    MOVE = 'MOVE'
    CHAT = 'CHAT'
    STATE = 'STATE'
    PLAYER_LIST = 'PLAYER_LIST'
    GAME_START = 'GAME_START'
    GAME_OVER = 'GAME_OVER'
    ERROR = 'ERROR'


def encode(msg: dict) -> bytes:
    return (json.dumps(msg, separators=(',', ':')) + '\n').encode('utf-8')


def decode(data: bytes) -> dict:
    return json.loads(data.strip())
