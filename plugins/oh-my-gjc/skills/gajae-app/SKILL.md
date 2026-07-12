---
name: gajae-app
description: 가재코드 앱(셀프호스트 웹 UI, devswha/claudecodeui fork) 설치·업데이트·운영. "가재코드 앱 / cloudcli / claudecodeui / 웹 UI 설치 / 앱 업데이트 / 앱 재시작 / 브라우저에서 세션 보기" 같은 요청에 활성화. GJC 라이브 세션 열람+릴레이, 외부 CLI(claude/codex) tmux 터미널 attach, 고정 루트 파일 패널을 제공하는 브라우저 앱을 git clone → build → systemd user 유닛으로 셀프호스트한다.
---

# gajae-app — 가재코드 앱 (셀프호스트 웹 UI)

브라우저(폰 포함)에서 gjc 세션을 보는 앱. 소스는 **별도 레포**
`github.com/devswha/claudecodeui` (upstream siteboon/claudecodeui의 fork),
**배포선 브랜치 = `feat/gjc-provider`**. 이 스킬은 코드가 아니라 **설치·운영
절차**를 담는다 — 앱 소스를 이 플러그인에 번들하지 않는다(업스트림 rebase
유지를 위해 의도된 분리).

## 기능 요약 (v0.2.0 기준)
- **GJC 탭**: tmux에서 도는 gjc 세션 자동 감지(lsof+tmux lineage) → 열람 전용
  대화 + 관제탑 경유 메시지 릴레이(현재 모델명 표시) + 세션 종료(X).
- **외부 CLI 탭**: claude/codex tmux 세션 감지 → 클릭 시 브라우저 터미널로
  attach (xterm.js↔node-pty, `tmux attach -t =<name>`), Termius식.
- **파일 패널**: 우상단 폴더 버튼 — 고정 루트(홈 하위, 기본 workspace) 파일
  브라우저 + VS Code식 에디터.
- **새 세션**: 관제탑 /spawn 경유 생성, 경로 자동완성.

## 설치 (멱등)
```bash
[ -d ~/workspace/claudecodeui ] || git clone https://github.com/devswha/claudecodeui ~/workspace/claudecodeui
cd ~/workspace/claudecodeui && git checkout feat/gjc-provider && npm ci && npm run build
```
systemd user 유닛(권장, `~/.config/systemd/user/cloudcli.service`):
```ini
[Unit]
Description=CloudCLI web UI
After=network-online.target
[Service]
Type=simple
Environment=SERVER_PORT=3021
ExecStart=%h/.nvm/versions/node/v22.17.1/bin/node %h/workspace/claudecodeui/dist-server/server/cli.js start
Restart=on-failure
RestartSec=5
[Install]
WantedBy=default.target
```
`systemctl --user daemon-reload && systemctl --user enable --now cloudcli.service`.
node 경로는 `which node`로 실제 경로 확인 후 조정.

## 업데이트
```bash
cd ~/workspace/claudecodeui && git fetch origin && git merge --ff-only origin/feat/gjc-provider \
  && npm ci && npm run build && systemctl --user restart cloudcli.service
```
⚠ 재시작하면 앱 pty에 매달린 자식 프로세스가 함께 종료된다 — 앱 안에서 띄운
CLI가 있으면 먼저 정리.

## 원격 접속 (보안 계약 — 약화 금지)
- 서버는 **loopback 기본 바인딩**(127.0.0.1) — 그대로 둔다. LAN/인터넷 직노출 금지.
- 원격은 **tailscale serve** 경유만: `tailscale serve --bg --https=8449 http://127.0.0.1:3021`.
- tmux 파괴/주입(kill·send)은 서버가 lineage(=gjc가 그 tmux 안에서 실행 중)를
  재검증하고 아니면 403 — 이 게이트를 우회·완화하지 않는다.
- dir-suggestions는 $HOME realpath 봉쇄(직계 자식 심링크만 허용 루트) — 완화 금지.
- (선택) 무거운 첫 색인 회피용 decoy HOME: 유닛에 `Environment=HOME=%h/.cloudcli-home`
  (전부 실경로 심링크, 문제 항목만 빈 폴더).

## 상태/진단
- `systemctl --user status cloudcli.service`, 포트 `ss -tln | grep 3021`.
- 번들 확인: `curl -s http://127.0.0.1:3021/ | grep -o 'assets/index-[^"]*js'`.
- GJC 탭이 비면: tmux 서버 유무 → `lsof -c gjc` 응답(부하 시 4s 타임아웃 플랩) 순서로 진단.

## Non-Goals
앱 소스 번들/포크 관리(별도 레포), 업스트림(siteboon) PR, LAN 직노출 구성,
gjc 본체 세션 포맷 변경.
