# 기여 가이드

> [English](CONTRIBUTING.md)

## 개발 환경 설정

저장소를 클론한 뒤 작업할 클라이언트 디렉토리를 선택하세요. 각 클라이언트는 독립적으로 구성되어 있습니다.

```bash
git clone https://github.com/paulkim-xr/cli-p2p-boardgame.git
cd cli-p2p-boardgame
```

## 브랜치 전략

모든 작업은 기능 브랜치에서 진행합니다. 브랜치 이름은 `feat/<주제>` 또는 `fix/<주제>` 형식을 따릅니다.

```bash
git checkout -b feat/my-feature
# ... 변경 및 테스트 ...
git push origin feat/my-feature
# main으로 PR 오픈
```

`main`에 직접 커밋하지 마세요.

## 게임 추가

게임을 추가하려면 세 클라이언트 모두에 구현해야 합니다. 인터페이스는 다음과 같습니다:

| 메서드 | 시그니처 | 역할 |
|--------|---------|------|
| `start` | `(players: string[]) → void` | 플레이어 목록으로 상태 초기화 |
| `validateMove` | `(playerId, data) → bool` | 불법 이동 시 false 반환 |
| `applyMove` | `(playerId, data) → void` | 검증 통과 후 상태 변경 |
| `render` | `(perspective?) → str` | 출력 가능한 보드 문자열 반환 |
| `getState` | `(perspective) → object` | 와이어 전송용 JSON 직렬화 가능 상태 반환 |
| `isOver` | `() → [bool, winner\|null]` | `[true, winnerId]` 또는 `[false, null]` 반환 |
| `currentTurn` | `() → str\|null` | 현재 차례인 플레이어 ID 반환 |

`session.py` / `session.js` / `session.ts`에 클래스를 등록하세요.

6개의 `locales/*.json` 파일 모두에 로케일 키를 추가하세요:
- `game.<name>` — 표시 이름
- `game.<name>.help` — 로비에 표시되는 한 줄 설명

## 언어 추가

1. `clients/python/locales/en.json`을 `clients/python/locales/<코드>.json`으로 복사
2. `clients/node/locales/`, `clients/bun/locales/`에도 동일하게 반복
3. 48개 값 모두 번역. 키를 추가하거나 삭제하지 마세요.
4. `--lang <코드>`로 동작 확인.

## 테스트 실행

```bash
# Python (99개 테스트)
cd clients/python && pytest

# Node.js (83개 테스트)
cd clients/node && node --test

# Bun (77개 테스트)
cd clients/bun && bun test
```

PR을 오픈하기 전에 모든 테스트가 통과해야 합니다.

## 와이어 프로토콜 변경

와이어 프로토콜을 변경하려면 세 클라이언트 모두와 `protocol/messages.md`를 함께 업데이트해야 합니다. 세 `protocol.*` 파일에 새 `MsgType` 상수를 동시에 추가하세요 — 프로토콜은 클라이언트 간의 계약입니다.

## 커밋 스타일

```
type(scope): 짧은 설명
```

타입: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`  
스코프: `python`, `node`, `bun`, `protocol`, `i18n`

예시:
```
feat(bun): 쿼리도 벽 배치 검증 추가
fix(python): 오델로 뒤집기 방향 수정
docs(i18n): 일본어 로케일 추가
```
