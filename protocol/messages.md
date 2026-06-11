# Wire Protocol

All messages are JSON objects, one per line, terminated by `\n`, sent over TCP.

## Message Types

| type | direction | required fields | optional fields |
|---|---|---|---|
| JOIN | client→host | from | |
| LEAVE | client→host | from | |
| MOVE | client→host | from, data | |
| CHAT | client↔host | from, body | |
| STATE | host→all | data | |
| PLAYER_LIST | host→all | players | |
| GAME_START | host→all | game, players, turn | options |
| GAME_OVER | host→all | winner | (null = draw) |
| ERROR | host→client | message | |

## Discovery Beacon (UDP)

JSON payload broadcast every 2s on port+1:
`{ "session": "<name>", "game": "<id>", "players": N, "max": N, "host_ip": "<ip>" }`
