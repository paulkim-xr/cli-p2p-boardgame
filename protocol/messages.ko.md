# 와이어 프로토콜

> [English](messages.md)

모든 메시지는 JSON 객체이며, 한 줄에 하나씩 `\n`으로 구분되어 TCP로 전송됩니다.

## 메시지 타입

| type | 방향 | 필수 필드 | 선택 필드 |
|------|------|----------|----------|
| JOIN | 클라이언트→호스트 | from | |
| LEAVE | 클라이언트→호스트 | from | |
| MOVE | 클라이언트→호스트 | from, data | |
| CHAT | 클라이언트↔호스트 | from, body | |
| STATE | 호스트→전체 | data | |
| PLAYER_LIST | 호스트→전체 | players | |
| GAME_START | 호스트→전체 | game, players, turn | options |
| GAME_OVER | 호스트→전체 | winner | (null = 무승부) |
| ERROR | 호스트→클라이언트 | message | |

## 발견 비콘 (UDP)

매 2초마다 port+1로 JSON 페이로드를 브로드캐스트:  
`{ "session": "<이름>", "game": "<id>", "players": N, "max": N, "host_ip": "<ip>" }`
