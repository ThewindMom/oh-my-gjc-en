# codex-app-control

gjc가 **Codex 데스크톱 App의 GUI**를 직접 모는 플러그인. 두 개의 skill로 나뉜다:

| skill | 커맨드 | 역할 |
|-------|--------|------|
| **codex-app-launch** | `/codex-app-control:launch` | 이미 빌드된 Linux Codex App 래퍼를 **CDP 켠 채 (헤드리스면 xvfb로) 기동**하고 준비될 때까지 대기 → `cdp_url` 반환. 상태확인/종료(status/stop)도. |
| **codex-app-cdp** | `/codex-app-control:ask` | 실행 중인 App에 명시적 `cdp_url`로 **attach → 프롬프트 1개 → 최신 응답 1개** (attach-only). |

대상: OpenAI Codex 데스크톱 App + `HaD0Yun/codex-app-in-linux` 계열 비공식 Linux Electron 래퍼.
App 내부 엔진은 Codex `app-server`이고, 이 플러그인은 그 위의 **GUI를 lifecycle/CDP/DOM으로** 제어한다.
(모델/에이전트 성능은 app-server와 동일하다. 이 플러그인의 가치는 **App GUI를 직접 모는 것**.)

> 이 플러그인은 래퍼를 **OpenAI DMG에서 빌드하지 않는다.** 이미 빌드된 `start.sh`를 띄우고 제어할 뿐이다.

## 설치

`gjc` 인터랙티브 세션 안에서 `/plugin`으로 관리한다(셸 `gjc plugin install`은 마켓플레이스 플러그인에 동작하지 않음).

```
/plugin marketplace add devswha/oh-my-gjc
/plugin install codex-app-control@oh-my-gjc
```

## 사용 (end-to-end)

```
# 1) 앱을 헤드리스로 띄우고 CDP 준비까지 대기 → cdp_url 확보
/codex-app-control:launch start_sh=~/workspace/codex-wrapper-build/wrapper/codex-app/start.sh cdp_port=9222

# 2) 같은 cdp_url로 프롬프트 1개 보내고 응답 받기
/codex-app-control:ask cdp_url=http://127.0.0.1:9222 prompt="reply with PONG"

# 상태확인 / 종료
/codex-app-control:launch action=status cdp_port=9222
/codex-app-control:launch action=stop   cdp_port=9222
```

```
[launch]  start.sh(+xvfb) ──remote-debugging-port──▶ CDP 준비  ──cdp_url──┐
                                                                          ▼
[ask]     attach(cdp_url) ─▶ .ProseMirror 입력 ─▶ Enter ─▶ 완료감지 ─▶ 최신 응답 1개
```

### `/codex-app-control:launch` 인자

| 인자 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `action` | ❌ | `start` | `start` \| `status` \| `stop` |
| `start_sh` | `start`에 ✅ | — | 래퍼의 `codex-app/start.sh` 절대경로 (또는 `wrapper_dir`) |
| `wrapper_dir` | ❌ | — | 래퍼 루트(`<dir>/codex-app/start.sh` 사용) |
| `cdp_port` | ❌ | `9222` | 원격 디버깅(CDP) 포트 |
| `webview_port` | ❌ | `5175` | webview 포트(준비확인 보조) |
| `screen` | ❌ | `1280x900x24` | xvfb 가상 화면 `WxHxD` |
| `ready_timeout_s` | ❌ | `60` | CDP `/json/version` 200 대기 상한 |

### `/codex-app-control:ask` 인자

| 인자 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `cdp_url` | ✅ | — | Codex App의 CDP 엔드포인트 (loopback 권장) |
| `prompt` | ✅ | — | 보낼 프롬프트 1개 |
| `target` | ❌ | — | 여러 창 중 선택할 url/title substring (예: `Codex`, `5175`) |
| `timeout_ms` | ❌ | `120000` | 응답 완료 대기 전체 타임아웃 |
| `stable_ms` | ❌ | `3000` | 응답 DOM 무변화 지속 시 완료 간주(폴백) |

## 전제

- `codex-app-launch`: 래퍼가 **이미 빌드돼 있어야** 한다(`<wrapper>/codex-app/start.sh` 존재). 헤드리스면 `xvfb-run` 설치.
- `codex-app-cdp`: App이 **이미 실행 중 + 원격 디버깅 켜짐 + `cdp_url` 명시 제공**. (이 조건을 `launch`가 만들어 준다.)

## 원격 디버깅 포트 준비

래퍼의 `start.sh`는 `--` 뒤 인자를 Electron으로 전달한다. CDP를 켜고 띄우는 검증된 방법:

```sh
# 디스플레이가 있으면:
./codex-app/start.sh -- --remote-debugging-port=9222
# 헤드리스(서버/원격)면 가상 디스플레이로:
xvfb-run -a -s "-screen 0 1280x900x24" ./codex-app/start.sh -- \
  --remote-debugging-port=9222 --use-gl=swiftshader --enable-unsafe-swiftshader
```

attach 확인: `curl -s http://127.0.0.1:9222/json/version` (→ `Codex/<version>` 포함).
`/codex-app-control:launch`가 이 기동 + 준비대기를 자동화한다.

## ⚠️ 안전

프롬프트 전송도, **앱 기동도** 채팅이 아니라 **Codex가 로컬 파일·셸·자격증명 권한으로 작업을 실행/노출하는 특권 동작**이다.
- 신뢰할 수 없는 지시/비밀값을 프롬프트로 보내지 마라.
- `cdp_url`/원격 디버깅 포트는 **loopback(127.0.0.1)** 만 — CDP 엔드포인트는 그 앱의 풀 제어 권한이다.
- 비공식 래퍼는 고신뢰 코드다. disposable 프로젝트에서 먼저 검증하라.

## 검증 상태

- **정적(완료):** plugin/marketplace JSON 유효성, 컨벤션 경로, marketplace 등록 일치, 문서.
- **라이브 제어(검증 완료):** wrapper를 OpenAI 공개 DMG로 빌드 → `xvfb-run -a -s "-screen 0 1280x900x24" ./start.sh -- --remote-debugging-port=9222 --use-gl=swiftshader --enable-unsafe-swiftshader`로 헤드리스 기동 → `curl /json/version`에서 `Codex/26.623.70822` 확인 → gjc `browser`로 attach → 온보딩 Skip → `.ProseMirror`에 입력 → Enter → 하이브리드 완료 감지 → `[data-local-conversation-final-assistant]`에서 **"PONG"** 읽기 성공. 확정 셀렉터/레시피는 `skills/*/SKILL.md` 참고.

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `start_sh is required` | `start_sh=<.../codex-app/start.sh>` (이미 빌드된 래퍼) 전달 |
| `start.sh not found` | 래퍼를 먼저 빌드(이 플러그인은 DMG 빌드 안 함) |
| 준비 타임아웃 | `ready_timeout_s` 늘리기, `~/.cache/codex-desktop/launcher.log`·`/tmp/codex-app-launch.log` 확인 |
| `cdp_url is required` (ask) | `launch`로 먼저 띄워 `cdp_url` 확보 후 `ask`에 전달 |
| attach 실패 (ask) | App이 떠 있고 포트가 `cdp_url`과 일치하는지 확인 |
| 여러 창에 붙음/엉뚱한 창 | `target=Codex` 또는 `target=5175` |
| 부분/잘린 응답 | `timeout_ms`/`stable_ms` 늘리기 |

## 범위

- **launch:** 이미 빌드된 래퍼 기동(헤드리스 xvfb)/상태/종료 + CDP 준비 대기 + `cdp_url` 반환.
- **ask:** 실행 중 App에 cdp_url attach → 프롬프트 1개 → 완료 감지 → 최신 응답 1개.
- **Non-Goal:** 래퍼 DMG 빌드, 다중 인스턴스 오케스트레이션, 포트 자동탐색(멱등 재사용 체크는 함), MCP/hooks/sub-agent, 다중 프롬프트 대화 루프, ydotool Computer Use, `app-server` JSON-RPC 직접 제어.
