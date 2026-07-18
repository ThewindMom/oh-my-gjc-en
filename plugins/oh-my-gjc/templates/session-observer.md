---
description: Observes an explicitly selected GJC session read-only and token-free in a detached tmux window. Does not activate from natural-language requests.
argument-hint: "--tmux NAME | --session ID [--mode conversation|user-only] [--thinking] [--no-follow] [--history N]"
---

# /omg:session-observer

This command is **explicit-invocation only.** It never auto-activates from natural-language requests to watch, inspect, summarize, follow, or monitor a session.

The target must be exactly one `--tmux NAME` or `--session ID`. Defaults are `mode=conversation`, `thinking=0`, `follow=1`, `history=20`; thinking display is enabled only with `--thinking`. `--mode user-only` shows only user messages. history is limited to 0–200.

The model resolves the arguments into the following safe env fields and passes them in **a single Bash call only**. Do not interpolate user text into shell source: `OBSERVER_TARGET_KIND` (`tmux` or `session`), `OBSERVER_TARGET_VALUE`, `OBSERVER_MODE`, `OBSERVER_THINKING` (`0`/`1`), `OBSERVER_FOLLOW` (`0`/`1`), `OBSERVER_HISTORY` (integer). This call opens a detached tmux observer window with `--launch-window` and returns only the launch receipt/error on stdout/stderr. Conversation text is never sent to a tool result or the GJC transcript; after opening the window, observation consumes no model tokens.

```bash
set -euo pipefail
[ -n "${TMUX:-}" ] || { printf '%s\n' 'session-observer requires tmux' >&2; exit 1; }
command -v bun >/dev/null 2>&1 || { printf '%s\n' 'session-observer requires Bun' >&2; exit 1; }
: "${OBSERVER_TARGET_KIND:?session-observer target kind is required}"
: "${OBSERVER_TARGET_VALUE:?session-observer target value is required}"
: "${OBSERVER_MODE:=conversation}"
: "${OBSERVER_THINKING:=0}"
: "${OBSERVER_FOLLOW:=1}"
: "${OBSERVER_HISTORY:=20}"
case "$OBSERVER_TARGET_KIND" in tmux|session) ;; *) printf '%s\n' 'invalid session-observer target kind' >&2; exit 2 ;; esac
case "$OBSERVER_MODE" in conversation|user-only) ;; *) printf '%s\n' 'invalid session-observer mode' >&2; exit 2 ;; esac
case "$OBSERVER_THINKING" in 0|1) ;; *) printf '%s\n' 'invalid session-observer thinking setting' >&2; exit 2 ;; esac
case "$OBSERVER_FOLLOW" in 0|1) ;; *) printf '%s\n' 'invalid session-observer follow setting' >&2; exit 2 ;; esac
case "$OBSERVER_HISTORY" in ''|*[!0-9]*) printf '%s\n' 'invalid session-observer history setting' >&2; exit 2 ;; esac
(( 10#$OBSERVER_HISTORY <= 200 )) || { printf '%s\n' 'session-observer history exceeds 200' >&2; exit 2; }

uid="$(id -u)"
project_binding="$PWD/.gjc/runtimes/oh-my-gjc/root"
user_binding="$HOME/.gjc/agent/runtimes/oh-my-gjc/root"
if [ -e "$project_binding" ] || [ -L "$project_binding" ]; then
  binding="$project_binding"
else
  binding="$user_binding"
fi
[ -f "$binding" ] && [ ! -L "$binding" ] || { printf '%s\n' 'trusted oh-my-gjc root binding not found' >&2; exit 1; }
[ "$(stat -c %u -- "$binding")" = "$uid" ] && [ "$(stat -c %a -- "$binding")" = 600 ] || { printf '%s\n' 'oh-my-gjc root binding is unsafe' >&2; exit 1; }
mapfile -t binding_lines < "$binding"
[ "${#binding_lines[@]}" -eq 1 ] && [ -n "${binding_lines[0]}" ] || { printf '%s\n' 'oh-my-gjc root binding is invalid' >&2; exit 1; }
root="$(readlink -f -- "${binding_lines[0]}")"
[ "$root" = "${binding_lines[0]}" ] && [ -d "$root" ] && [ ! -L "$root" ] || { printf '%s\n' 'oh-my-gjc root binding is not canonical' >&2; exit 1; }
runner="$root/bin/session-observer.ts"
[ -f "$runner" ] && [ ! -L "$runner" ] && [ "$(readlink -f -- "$runner")" = "$runner" ] || { printf '%s\n' 'trusted session-observer runner not found' >&2; exit 1; }

argv=("$runner" --launch-window --mode "$OBSERVER_MODE" --history "$OBSERVER_HISTORY")
[ "$OBSERVER_THINKING" = 0 ] || argv+=(--thinking)
[ "$OBSERVER_FOLLOW" = 0 ] || argv+=(--follow)
case "$OBSERVER_TARGET_KIND" in
  tmux) argv+=(--tmux "$OBSERVER_TARGET_VALUE") ;;
  session) argv+=(--session "$OBSERVER_TARGET_VALUE") ;;
esac
exec bun "${argv[@]}"
```

Do not call `tmux capture-pane`, SDK APIs, network tools, LLM tools, or any alternative observer path from this command. Do not poll or relay observer output after the receipt.

The engine `bin/session-observer.ts` reads JSONL only as authoritative/default and does not use SDK enrichment. It does not inject/control/write to the observed target, and performs no upstream activity, network, or LLM calls. If outside tmux or Bun or the private user root binding is missing, it fails closed. Do not read, summarize, or relay anything beyond the receipt after launch.
