---
description: oh-my-gjc 카탈로그 — 설치된 omg 스킬·커맨드·옵션 플러그인을 한눈에 보여준다. omz(oh-my-zsh) 관례의 단일 엔트리. 인자 없이 /omg 만 입력하면 전체 목록.
argument-hint: "(인자 없음 — 전체 카탈로그)"
---

# /omg — oh-my-gjc 카탈로그

oh-my-gjc 스위트의 단일 진입점(oh-my-zsh의 `omz` 관례 계승). 이 커맨드는 **읽기 전용
안내**다 — 아래 목록을 사용자에게 그대로 정리해 보여주고, 무엇을 쓸지 물어라. 아무것도
설치·실행·변경하지 않는다.

## 커맨드 (핵심)
- `/omg:setup` — 셋업(네이티브 설치·프리셋 제안·환경감지 추천). 멱등.
- `/omg:easy` (이번 세션) · `/omg:easy-always [on|off|status]` (항상) — 쉬운 말 최종답변.
- `/omg:gate` (이번 세션) · `/omg:gate-always [on|off|status]` (항상) — 승인 게이트 비전문가 브리핑.
- `/omg:branchflow-always [on|off|status]` — 저장소 dev/main 브랜치 규칙(레포별).
- `/omg:presets` — 멀티벤더 모델 프리셋 병합(ideal/escalate-surgical/monorepo/reviewer).
- `/omg:fable "<대상>"` — Fable 5 안전-크리티컬 적대적 감사.

> 프리픽스: **`/omg:<name>`가 정본**. 구 `/oh-my-gjc:<name>`는 마이그레이션 별칭으로
> 당분간 유지되나 **폐기 예정** — 새 문서·습관은 `/omg:`로.

## 스킬 (트리거로 자동 활성)
- `easy-answer` · `gate-briefing` · `multivendor-presets` · `branch-flow` · `extragoal`(외부 최종 리뷰 게이트).

## 옵션 플러그인 (각자 셸 설치: `gjc plugin install <name>@oh-my-gjc` + 네이티브 한 줄)
- `tower`(관제탑 세션 함대) · `insane-review`(GPT-5.5 Pro 웹 리뷰) · `gjc-bugwatch`(버그 수집)
  · `codex-cli-control` · `codex-deepwork` · `lazycodex` · `codex-app-control`.

## 문서
- 설치·자세히: 저장소 README. 원샷 설치: `install.sh`(curl 한 줄) / 에이전트용 `INSTALLATION.md`.
- gjc 공식 문서: https://gajae-code-docs.vercel.app
