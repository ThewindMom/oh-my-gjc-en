# oh-my-gajaecode (plugin)

**The single oh-my plugin for Gajae Code (gjc).** One install brings 7 skills + 10 commands
(`/omg` + 9 `/omg:*`). `/omg:time-left` requires Linux+Bun 1.3.14+ and a current top-level GJC SDK endpoint;
`insane-review` requires ChatGPT+Chromium; `lazycodex-gjc` requires an already-installed and logged-in
Codex CLI+LazyCodex/OMO; the `session-observer` slash launcher requires Linux+Bun+tmux.

This is the English-language fork of [devswha/oh-my-gjc](https://github.com/devswha/oh-my-gjc).
The `no-english` Korean-first skill and `/omg:no-english` command are removed; everything else matches
upstream `0.20.0`.

## Quick Start

```sh
curl -fsSL https://raw.githubusercontent.com/ThewindMom/oh-my-gjc-en/main/install.sh | bash

# if curl|bash is disallowed:
git clone --depth 1 https://github.com/ThewindMom/oh-my-gjc-en.git
bash oh-my-gjc-en/install.sh

# after opening a new gjc session (or /move .):
/omg
```

## What's included (7 skills · 10 commands)

### Skills
`adaptive-response` · `time-left` · `extragoal` · `insane-review` · `lazycodex-gjc` · `deep-onboarding` · `session-observer`

`adaptive-response` and `time-left` do not auto-activate from natural language. Load them explicitly via
`/omg:gate*` and `/omg:time-left` respectively. Code identifiers, commands, paths, and API names are
preserved verbatim, not translated or transliterated.

### Commands

| Command | Function | Prerequisite |
|---|---|---|
| `/omg` | Catalog — omg skills and commands at a glance | — |
| `/omg:setup` | Setup + prerequisite check + always-on toggle guidance (idempotent) | — |
| `/omg:gate [on\|off]` · `/omg:gate-always [on\|off\|status]` | adaptive-response calibration + approval-gate briefing (this session / always) | — |
| `/omg:time-left [ralplan\|ultragoal]` | Explicit query of the current workflow's remaining machine work-time range | Linux + Bun 1.3.14+ + current GJC SDK endpoint |
| `/omg:fable [target]` | Fable 5 adversarial safety audit (read-only, severity+file:line, spot-check) | Fable 5 model |
| `/omg:insane-review` | GPT-5.6 Sol Pro web code review (zero API cost) | ChatGPT subscription + Chromium login |
| `/omg:lazycodex-gjc "<task>"` | Isolated read-only `codex exec --ephemeral` worker | Installed and logged-in Codex + LazyCodex/OMO |
| `/omg:deep-onboarding [output path]` | After repository analysis + interview, generate a project map, ADR proposals, and handoff to a confirmed path | — |
| `/omg:session-observer --tmux omg` · `/omg:session-observer --session <id>` | Read-only observation of another GJC session's JSONL conversation in a detached tmux viewer | Linux + Bun + tmux |

> Commands with prerequisites guide and stop safely when the required tool is missing.

### `time-left` SDK boundary

Selects the active workflow via a canonical state read, then reads `session.metadata`, goal, todo, workflow gate,
and runtime job from the current session with the official SDK v3 client to produce a non-probabilistic remaining-time
range like `estimated ~N–M minutes`. It sends no prompt/reply/control, and produces no number under human-approval,
paused, failed/blocked, or insufficient-evidence states. The installer builds a user-scope-only private runtime from
an exact lockfile and fails closed if Bun/package install/endpoint is unavailable.

To see the time for a running ralplan or ultragoal, run `/omg:time-left` in the **same session** running that workflow.
The skill enforces session identity match. If mid-turn, just type the command and press Enter — the default
`promptWhileBusy` queues it for the next turn boundary, so steering is not needed; use steering only when urgent enough
to interrupt the active turn. `/btw` is a tools-forbidden contract, so it cannot run the skill and would make the model
guess — not suitable for this use.

### `lazycodex-gjc` isolation boundary

Runs an already-installed Codex CLI+LazyCodex/OMO as a one-time synchronous external worker. A user-scope private
SHA-256 runtime binding must match, and child GJC sessions, config/credential changes, and web/MCP/browser egress are
forbidden. Currently only `read-only` is allowed; `workspace-write` is fail-closed until concurrent-edit safety is
solved. An optional `LAZYCODEX_OBSERVE_LOG` tees a redacted event stream to a leader-owned log (mode 0600) for live
observation, and if a completed worker's final output exceeds the 1 MiB relay limit, the runner returns a fixed
bounded summary at exit 0 instead of discarding verified work (#202 atomicity). Piecewise dispatch is standard over
monoliths, and visual QA is the leader's browser's job.

### `session-observer` read-only boundary

`/omg:session-observer --tmux omg` or `/omg:session-observer --session <id>` opens a detached tmux viewer. Default is
conversation+follow; `--mode user-only` shows only user utterances, `--thinking` shows selected thinking, and
`--no-follow` ends as a snapshot.

The runner tails `$HOME/.gjc/agent/sessions/...jsonl` and outputs only user/assistant text and optional thinking,
excluding tool-call noise. JSONL is the safe default and has no SDK dependency. It does not inject, control, or write
to the session, performs no network or upstream activity, and observed text never returns to a GJC tool result. The
direct terminal runner is fully token-free; omitting `--follow` ends as a snapshot. The slash command spends only one
launch turn to open the detached tmux viewer; subsequent viewing is token-free.

To run directly from a repository checkout without a slash launch turn:

```sh
bun plugins/oh-my-gjc/bin/session-observer.ts --tmux omg --follow
```

### Model presets

omj does not install custom model presets or modify `models.yml`. It uses GJC's default model configuration and
built-in presets as-is.

## Semaphore structure

`/omg:gate-always` inserts and removes an owned marker block
(`<!-- BEGIN oh-my-gjc:gate-always -->` ~ `<!-- END ... -->`) in `~/.gjc/agent/SYSTEM.md`.
Upgrades back up and clean only retired `easy-always` markers; other user content is untouched.

## Migration

Re-running the hardened installer cleans native remnants of renamed `gate-briefing` and removed public capabilities
(`multivendor-presets`, `release-gate`, `easy-answer`, `plain-layer`, `branch-flow`, `gjc-bugwatch`). It installs
`adaptive-response` and `time-left`, and atomically replaces the SDK runtime using the exact lockfile and a
shared/exclusive lock. `lazycodex-gjc` is retained; stale bindings are removed only when runtime prerequisites are
absent, leaving it fail-closed. Existing `models.yml` is not modified.

The English fork additionally removes the `no-english` skill and `/omg:no-english` command on upgrade.

### Gajae app migration (0.14.0)

The `gajae-app` skill and `/omg:gajae-app` command have been split out of this bundle. This upgrade does not delete an
existing self-hosted app deployment. For install/update, follow the
[devswha/claudecodeui SELF-HOST docs](https://github.com/devswha/claudecodeui/blob/feat/gjc-provider/docs/SELF-HOST.md).

## Non-Goals

- Reimplementing gjc-native workflows (team/ultragoal/ralplan/deep-interview) — gjc does these natively well.
- Vendor auto-login or credential issuance.
