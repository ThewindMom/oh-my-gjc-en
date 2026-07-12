---
description: 가재코드 앱(셀프호스트 웹 UI, devswha/claudecodeui) 설치·업데이트·상태점검. install|update|status 인자. 멱등.
argument-hint: "[install|update|status] (기본 status)"
---

# /omg:gajae-app

가재코드 앱(브라우저에서 gjc 세션 열람·릴레이 + 외부 CLI 터미널 + 파일 패널)을
관리한다. 소스 = `github.com/devswha/claudecodeui`, 배포선 = `feat/gjc-provider`.
세부 절차·보안 계약은 `gajae-app` 스킬(SKILL.md)이 정본 — 반드시 그 계약대로.

## status (기본)
```bash
systemctl --user is-active cloudcli.service 2>/dev/null; ss -tln | grep -E ':3021\b'
cd ~/workspace/claudecodeui 2>/dev/null && git log --oneline -1 && git status -sb | head -1
```
- 유닛 없음/클론 없음 → install 안내. 배포선보다 뒤처짐(`git fetch` 후 behind) → update 제안.

## install (멱등)
1. 클론(없을 때만) → `feat/gjc-provider` 체크아웃 → `npm ci && npm run build`.
2. systemd user 유닛 생성(스킬의 예시 그대로, node 경로는 `which node`로 보정) →
   `daemon-reload && enable --now`.
3. 원격 접속은 tailscale serve 경유만 안내 (`--https=8449 http://127.0.0.1:3021`).
   loopback 바인딩·lineage 게이트·dir-suggestions 봉쇄는 **약화 금지**.

## update
```bash
cd ~/workspace/claudecodeui && git fetch origin && git merge --ff-only origin/feat/gjc-provider \
  && npm ci && npm run build && systemctl --user restart cloudcli.service
```
- ff 불가(로컬 수정)면 멈추고 보고 — 강제 리셋은 사용자 승인 필요.
- ⚠ 재시작 시 앱 pty의 자식 CLI가 함께 죽는다 — 실행 중인 게 있으면 먼저 고지.

## 완료 보고
활성 상태 + 현재 커밋 + 접속 주소(로컬 `http://127.0.0.1:3021`, 테일넷은 serve
설정 출력)를 한 줄씩. 실패는 원문 로그 경로와 함께 보고.
