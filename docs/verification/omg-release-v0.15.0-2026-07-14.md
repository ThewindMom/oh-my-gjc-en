# v0.15.0 릴리스 — 공개 릴리스 게이트 증거 (2026-07-14)

하코 직접 발주("배포작업 진행해라"). ⚠ 하루 1회 규정의 명시 예외 — v0.14.1이 당일(07-14)
발행됐으나 발주자가 직접 지시했고, 게이트 1·2는 규정대로 전부 수행.

## 0. 릴리스 범위 (기준 태그 `v0.14.1`, 15 commits — feat/lazycodex-gjc 머지 + 게이트 중 픽스 2건)

- **`lazycodex-gjc` 신설 (스킬 9번째 + `/omg:lazycodex-gjc`, 격리 외부 브릿지):** 설치済
  Codex+LazyCodex/OMO를 `codex exec --ephemeral` 외부 워커로 동기 실행. 핀 고정 SHA-256
  런타임 바인딩(16줄, mode 0600) + trust walk(그룹/타인-쓰기 컴포넌트 거부) + systemd
  user-unit 격리 + 제한 커스텀 권한 프로파일(네트워크/웹서치/MCP/hooks/브라우저 차단,
  `.gjc`·host CODEX_HOME deny) + OMO ≥4.18.0 사전 검증 + fail-closed 종료코드 계약
  (2/78/23/124/130). provenance 3표면(runner/SKILL/템플릿) 해시 고정.
- **umask-002 신뢰 실패 하드닝:** Ubuntu UPG 기본 umask 0002에서 0775 경로가 런타임 78로
  fail-closed되던 결함 — 설치 시점 `normalize_trusted_path()`(자기-소유 핀 경로 `chmod
  g-w,o-w`, 불가 시 설치 fail-closed), auth.json 0600 강제, 테스트 umask-독립화
  (fixture 스윕 + umask 0o002 회귀 + 인스톨러 정규화 surface 테스트). 런타임 검사 무약화.
- **게이트 중 발견·수정 2건:** ① working-tree 모드 단언을 git index 모드(100755)+실행비트
  단언으로 교체(fresh clone umask 의존 제거). ② Codex 미보유 유저의 `all user` 설치가
  바인딩 preflight로 전체 실패하던 릴리스 블로커 — 가용성 프로브로 바인딩만 스킵
  (fail-closed 유지, 재실행 힌트 출력), 명시 타깃 설치는 하드 요구 유지.

## 1. Static

JSON parse(marketplace/plugin, 버전 0.15.0 일치) · `bash -n`(install.sh, install-skill.sh) ·
`node --check`(lazycodex-gjc.mjs) · `py_compile`(record_provenance.py) 전건 OK.

## 2. 단위 테스트 — 120 pass / 0 fail (bun 1.3.14)

plugins/oh-my-gjc **102**(lazycodex-gjc 격리 러너 계약 42종: 바인딩 위변조·코어 교체·
OMO 부재/구버전/writable·자식 stderr 비중계·타임아웃/자손 킬·workspace `.gjc` 보호 등
+ surface/installer 계약) + ops/tools **18**. **umask 002와 022 양쪽에서 전건 통과.**

## 3. Fresh install smoke (격리 HOME, `--candidate-ref` 로컬 dev)

- Codex-home 부재 신규 유저 경로: rc=**0** · cache `0.15.0` · native_skills **9** ·
  native_commands **14** · binding=**skipped**(fail-closed, 재실행 힌트 출력).
- 실HOME 실기: `install-skill.sh lazycodex-gjc user` rc=0(바인딩 생성, 정규화 멱등) 후
  **라이브 e2e** — 실제 Codex 0.144.4 + OMO 4.18.1 워커가 read-only 태스크 정답 반환,
  exit 0 (README 첫 헤딩 `# oh-my-gajaecode`).

## 4. Gate 2 — extragoal 교차 리뷰 (cross-family, fresh context)

리뷰어: `openai-codex/gpt-5.6-sol:xhigh` (read/search/find), 입력 = `git diff v0.14.1..HEAD`
(2,478줄, 이그레스 전 시크릿 스캔 0건). 초점: 샌드박스 탈출·fail-closed 무결성·
인스톨러 정규화 위험·테스트 정직성.

**Round 1 (candidate 5322b5c): VERDICT: <PENDING — 리뷰 완료 시 기록>**

## 5. 판정

Gate 1 **PASS** · Gate 2 <PENDING> · Gate 3 = 하코 직접 발주 — 게이트 2 APPROVE 확인 후
발행: dev→main 머지 + `v0.15.0` 태그 + GitHub Release.
