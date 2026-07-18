---
description: oh-my-gajaecode catalog — shows the omg skills and commands installed in one shot at a glance. A single entry point following the omz (oh-my-zsh) convention. Running `/omg` with no arguments shows the full list.
argument-hint: "(no arguments — full catalog)"
---

# /omg — oh-my-gajaecode catalog

The single entry point of the oh-my-gajaecode suite (inheriting the `omz` convention from oh-my-zsh). This command is **read-only guidance** — show the list below to the user as-is and ask what they want to use. Do not install, execute, or change anything. **One install brings all of the below.**

## All commands (10)
- `/omg` — this catalog.
- `/omg:setup` — setup (prerequisite checks + always-on toggle guidance). Idempotent.
- `/omg:gate` (this session) · `/omg:gate-always [on|off|status]` (always) — evidence-based response-level calibration + approval-gate tailored briefing.
- `/omg:time-left [ralplan|ultragoal]` — explicitly query the SDK-based remaining-time range of the current workflow. · Requires: Linux + Bun 1.3.14+ and a current GJC SDK endpoint
- `/omg:fable "<target>"` — Fable 5 safety-critical adversarial audit. · Requires: Fable 5 model access
- `/omg:insane-review` — GPT-5.6 Sol Pro web code review. · Requires: ChatGPT subscription + Chromium login
- `/omg:lazycodex-gjc "<task>"` — isolated read-only Codex+LazyCodex external worker. · Requires: installed and logged-in Codex + compatible OMO + user runtime binding
- `/omg:session-observer --tmux NAME|--session ID [--mode conversation|user-only] [--thinking] [--no-follow] [--history N]` — token-free read-only observation of a GJC conversation from JSONL in a detached tmux window. Explicit invocation only.
- `/omg:deep-onboarding [output path]` — analyze and interview a poorly documented repository, then generate a project map, ADR proposals, and a handoff after re-confirming the path.

> `/omg:time-left`, `insane-review`, and `lazycodex-gjc` guide and stop safely when the required runtime or external environment is missing.
> The `/omg:*` above are the complete set of public commands.

## Skills (7)
- `adaptive-response` (explicit only via `/omg:gate*`) · `time-left` (explicit only via `/omg:time-left`) · `extragoal` (external final review gate) · `insane-review` · `lazycodex-gjc` (read-only) · `deep-onboarding` (writes docs only to a confirmed path after analysis and interview) · `session-observer` (explicit only via `/omg:session-observer`; token-free read-only)

## Documentation
- Install and details: the repository README. One-shot install: `install.sh` (one curl line) / `INSTALLATION.md` for agents.
- Gajae Code guide: https://gjc.vibetip.help/ko/docs
