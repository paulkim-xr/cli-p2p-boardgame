import sys, json
sys.path.insert(0, 'clients/python')
from framework.net.protocol import encode, decode, MsgType


def test_encode_produces_newline_terminated_bytes():
    msg = {'type': MsgType.CHAT, 'from': 'alice', 'body': 'hello'}
    data = encode(msg)
    assert data.endswith(b'\n')
    assert b'"type"' in data


def test_decode_roundtrip():
    msg = {'type': MsgType.MOVE, 'from': 'bob', 'data': {'from': 'e2', 'to': 'e4'}}
    assert decode(encode(msg)) == msg


def test_decode_strips_whitespace():
    raw = json.dumps({'type': 'CHAT', 'from': 'x', 'body': 'y'}).encode() + b'  \n'
    result = decode(raw)
    assert result['body'] == 'y'
