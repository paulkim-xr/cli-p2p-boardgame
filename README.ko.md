# CLI P2P 보드게임 허브

> [English](README.md)

터미널에서 완전히 동작하는 P2P 멀티플레이어 보드게임 허브입니다. 별도의 서버 없이 LAN에서 자동으로 세션을 발견하고 참가할 수 있습니다.

## 주요 기능

- **11가지 게임** — 님, 마스터마인드, 커넥트 포, 오델로, 체커스, 체스, 배틀십, 바둑, 헥스, 쿼리도, 만칼라
- **3가지 클라이언트** — Python, Node.js, Bun/TypeScript (동일한 와이어 프로토콜로 상호 호환)
- **LAN 자동 발견** — UDP 비콘 브로드캐스트, IP 입력 불필요
- **다국어 지원(i18n)** — 영어·한국어, 시스템 로케일 자동 감지
- **Windows 독립 실행 파일** — Bun 클라이언트를 단일 바이너리로 빌드 가능

## 아키텍처

```
[호스트 클라이언트] ──TCP──► [호스트 서버]
[게스트 클라이언트] ──TCP──► [호스트 서버]
                             (모든 메시지 릴레이)

UDP 비콘 (port+1): 2초마다 LAN에 세션 정보 브로드캐스트
```

스타 토폴로지: 호스트 플레이어는 TCP 서버(릴레이)와 클라이언트를 동시에 실행합니다. 모든 게스트는 호스트의 TCP 포트에 접속합니다. 와이어 프로토콜은 TCP 위의 JSON 라인(줄바꿈 구분)입니다.

## 게임 목록

| 게임 | 인원 | 설명 |
|------|------|------|
| 님(Nim) | 2–6 | 돌무더기에서 돌 제거, 마지막으로 이동한 플레이어 승리 |
| 마스터마인드 | 2 | 코드 제작자 vs 추리자, 4자리 숫자 코드 |
| 커넥트 포 | 2 | 말을 떨어뜨려 4개를 연속으로 연결 |
| 오델로 | 2 | 상대방의 돌을 뒤집어 보드를 장악 |
| 체커스 | 2 | 상대방의 모든 말을 잡아 승리 |
| 체스 | 2 | 캐슬링·앙파상·프로모션 포함 정식 체스 |
| 배틀십 | 2 | 함선 배치 후 상대방 함대 격침 |
| 바둑(Go) | 2 | 9×9 바둑판에서 영역 확보 (패 규칙 포함) |
| 헥스(Hex) | 2 | 11×11 보드에서 양쪽 끝을 연결 |
| 쿼리도 | 2–4 | 반대편으로 이동, 벽을 놓아 상대 방해 |
| 만칼라 | 2–4 | 씨앗을 뿌려 상대방 구멍을 점령 |

## 클라이언트 사용법

### Python

```bash
cd clients/python
pip install pytest        # 테스트 의존성만 필요
python main.py            # 실행
python main.py --lang ko  # 한국어 UI
python main.py --port 9000

# 테스트 실행 (99개 통과)
pytest
```

### Node.js

Node.js 18 이상 필요.

```bash
cd clients/node
node src/main.js
node src/main.js --lang ko
node src/main.js --port 9000 --name alice

# 테스트 실행 (83개 통과)
node --test
```

### Bun / Windows 실행 파일

[Bun](https://bun.sh) 1.0 이상 필요.

```bash
cd clients/bun
bun run src/main.ts
bun run src/main.ts --lang ko

# 테스트 실행 (77개 통과)
bun test

# 현재 플랫폼용 독립 실행 파일 빌드
bun run build

# Windows exe 빌드 (크로스 컴파일)
bun run build:win
# → dist/game-hub.exe  (~117 MB, 런타임 불필요)
```

## 와이어 프로토콜

TCP 위의 JSON 라인(`\n` 구분). 모든 클라이언트가 동일한 프로토콜을 사용하므로, Python 호스트와 Node.js 게스트 간에도 플레이 가능합니다.

| 메시지 | 방향 | 필드 |
|--------|------|------|
| `JOIN` | 클라이언트 → 호스트 | `from` |
| `LEAVE` | 클라이언트 → 호스트 | `from` |
| `MOVE` | 클라이언트 → 호스트 | `from`, `data` |
| `CHAT` | 클라이언트 ↔ 호스트 | `from`, `text` |
| `PLAYER_LIST` | 호스트 → 클라이언트 | `players[]` |
| `GAME_START` | 호스트 → 클라이언트 | `game`, `players[]` |
| `STATE` | 호스트 → 클라이언트 | `data` |
| `GAME_OVER` | 호스트 → 클라이언트 | `winner` |
| `ERROR` | 호스트 → 클라이언트 | `message` |

전체 명세: [`protocol/messages.md`](protocol/messages.md)

## 다국어 지원(i18n)

로케일 파일은 `locales/` 디렉토리의 JSON 키-값 맵입니다. 자동 감지 순서:

1. `--lang` 플래그
2. `LANGUAGE` / `LC_ALL` / `LC_MESSAGES` / `LANG` 환경 변수
3. Windows UI 언어 (PowerShell)
4. `Intl.DateTimeFormat` (Node.js / Bun)
5. 기본값: `en`

새 언어 추가 시 `locales/en.json`, `locales/ko.json` 옆에 `locales/<코드>.json`을 추가하면 됩니다.

## 라이선스

MIT — [LICENSE](LICENSE) 참조
