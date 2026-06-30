# codex-app-control

gjc가 **이미 실행 중인 Codex 데스크톱 App**에 내장 `browser` 도구로 **CDP attach**해서
프롬프트 1개를 보내고 **최신 응답 1개**를 받아오게 하는 skill 중심 플러그인 (v1, attach-only).

대상: OpenAI Codex 데스크톱 App + `HaD0Yun/codex-app-in-linux`의 비공식 Linux Electron 래퍼.
App 내부 엔진은 Codex `app-server`이고, 이 플러그인은 그 위의 **GUI를 CDP/DOM으로** 제어한다.
(모델/에이전트 성능은 app-server와 동일하다. 이 플러그인의 가치는 **App GUI를 직접 모는 것**.)

## 설치

`gjc` 인터랙티브 세션 안에서 `/plugin`으로 관리한다(셸 `gjc plugin install`은 마켓플레이스 플러그인에 동작하지 않음).

```
/plugin marketplace add devswha/oh-my-gjc
/plugin install codex-app-control@oh-my-gjc
```

## 사용

```
/codex-app-control:ask cdp_url=http://127.0.0.1:9222 prompt="reply with PONG"
```

| 인자 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `cdp_url` | ✅ | — | Codex App의 CDP 엔드포인트 (loopback 권장) |
| `prompt` | ✅ | — | 보낼 프롬프트 1개 |
| `target` | ❌ | — | 여러 창 중 선택할 url/title substring (예: `Codex`, `5175`) |
| `timeout_ms` | ❌ | `120000` | 응답 완료 대기 전체 타임아웃 |
| `stable_ms` | ❌ | `3000` | 응답 DOM 무변화 지속 시 완료 간주(폴백) |

## v1 전제 (충족 안 되면 명확히 실패)

1. Codex App이 **이미 실행 중**이다.
2. App이 **원격 디버깅(CDP)** 이 켜진 채 떠 있다.
3. 사용자가 `cdp_url`을 **명시**로 제공한다.

v1은 앱을 **빌드/기동/재시작하지 않으며 CDP 포트를 자동탐색하지 않는다.**

## 원격 디버깅 포트 준비

CDP attach가 되려면 Codex App(Electron)이 `--remote-debugging-port`로 떠 있어야 한다.

- **확인됨:** 래퍼의 `./codex-app/start.sh`는 `--` 뒤 인자를 Electron으로 전달한다. CDP를 켜고 띄우는 검증된 방법:

  ```sh
  # 디스플레이가 있으면:
  ./codex-app/start.sh -- --remote-debugging-port=9222
  # 헤드리스(서버/원격)면 가상 디스플레이로:
  xvfb-run -a ./codex-app/start.sh -- --remote-debugging-port=9222 --use-gl=swiftshader --enable-unsafe-swiftshader
  ```
  포트는 `cdp_url`과 일치해야 한다.

- attach 확인:

  ```sh
  curl -s http://127.0.0.1:9222/json/version
  ```

## ⚠️ 안전

프롬프트 전송은 채팅이 아니라 **Codex가 로컬 파일·셸·자격증명 권한으로 작업을 실행하는 특권 동작**이다.
- 신뢰할 수 없는 지시/비밀값을 프롬프트로 보내지 마라.
- `cdp_url`은 **loopback(127.0.0.1)** 만 — CDP 엔드포인트는 그 브라우저의 풀 제어 권한이다.
- 비공식 래퍼는 고신뢰 코드다. disposable 프로젝트에서 먼저 검증하라.

## 범위

- **v1:** 실행 중 App에 cdp_url attach → 프롬프트 1개 → 하이브리드 턴-완료 감지 → 최신 응답 1개.
- **Non-Goal(후속):** 앱 빌드/기동/재시작/헬스, CDP 자동탐색, MCP 서버·hooks·sub-agent,
  다중 프롬프트 대화 루프·세션 관리, screenshot/ydotool Computer Use, `app-server` JSON-RPC 직접 제어.

## 검증 상태

- **정적(완료 가능):** plugin/marketplace JSON 유효성, 컨벤션 경로, marketplace 등록 일치, 문서.
- **라이브 제어(검증 완료):** wrapper(`ilysenko/codex-desktop-linux`)를 OpenAI 공개 DMG로 빌드 → `xvfb-run`으로 헤드리스 기동(CDP :9222) → gjc `browser`로 attach → 온보딩 Skip → `.ProseMirror`에 프롬프트 입력 → Enter 전송 → 하이브리드 완료 감지 → `[data-local-conversation-final-assistant]`에서 **"PONG"** 응답 읽기 성공(Codex app 26.623.70822, 계정 로그인 상태). 확정 셀렉터는 `SKILL.md`의 "확정 셀렉터" 참고.

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `cdp_url is required` 에러 | `cdp_url=http://127.0.0.1:<port>` 와 `prompt=` 를 함께 전달 |
| attach 실패 | App이 떠 있고 `--remote-debugging-port`가 켜졌는지, 포트가 `cdp_url`과 일치하는지 확인 |
| 여러 창에 붙음/엉뚱한 창 | `target=Codex` 또는 `target=5175` 로 창 지정 |
| 부분/잘린 응답 | `timeout_ms`/`stable_ms`를 늘려 완료 감지 여유 확보 |
| 긴 프롬프트 파싱 오류 | `prompt="..."` 따옴표로 감싸기 |
