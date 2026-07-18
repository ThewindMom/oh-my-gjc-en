---
name: lazycodex-gjc
description: Runs an already-installed Codex+LazyCodex as an isolated external worker from GJC. Activates for requests like "do it with lazycodex", "use LazyCodex from GJC", "spawn/delegate a Codex worker", "delegate or spawn LazyCodex/Codex from GJC". It does not create or change GJC tasks/sessions/config and retrieves only the result with one synchronous bash call.
---

# lazycodex-gjc

Runs an already-installed and logged-in **Codex CLI + LazyCodex** as a one-time external worker outside GJC.
It does not install or inject LazyCodex into GJC, and does not create child GJC sessions, tasks, goals, or teams.

## Pre-execution boundaries

- The sandbox allows `read-only` only.
- `workspace-write` is fail-closed disabled until concurrent-edit safety is proven. Do not delegate modification work to this skill.
- `danger-full-access` and approval bypass are always forbidden.
- Use only the already-installed `node`, `codex`, and LazyCodex. Do not run `npx`, install, update, doctor, migration, setup, or login on the user's behalf.
- Do not put credentials or tokens into the task or copy them from the GJC environment to Codex. The runner passes only an allowlisted environment.
- This sensitive command runs only a private runner snapshot matching the mode-`0600` SHA-256 runtime binding (`~/.gjc/agent/runtimes/lazycodex-gjc/binding`) created by the user-scope native install. A project-scope suite install alone cannot execute it.
- The runner verifies and pins a compatible OMO 4.x `ultrawork` (minimum 4.18.0) read-only. It uses a custom Codex permission profile to expose only the target `cwd` (excluding all-depth `.gjc` present at start and the root `.gjc` reserved paths), the exact Codex runtime helper, and a private tmp. Directory symlinks pointing inside the workspace are checked to their canonical target; external directory symlinks not exposed to the sandbox are skipped. The real user's `~/.gjc`, `~/.codex`, and `CODEX_HOME` are explicitly blocked, and specifying inside them as target `cwd` is rejected before spawn; web/MCP/apps/hooks/browser egress and child shell environment inheritance are also disabled. The Codex native profile cannot pre-block by path name a future `.gjc` created under the first parent after profile generation. Therefore a separate prohibition rule applies: instruct the worker not to create or modify any `.gjc`.

## Single synchronous call

Call GJC's **`bash` tool exactly once, synchronously.** Do not use `task`, `goal`, `team`, `move`, `write`, `edit`, or async job/monitor. Pass the following via the bash tool's `env` parameter:

- `LAZYCODEX_GJC_TASK`: the user's original task text. Do not interpolate it into a shell command string.
- `TARGET_CWD`: absolute path to the target repository. Defaults to the current `$PWD`.
- `SANDBOX`: always `read-only`.
- Optional: `CODEX_MODEL`, `LAZYCODEX_TIMEOUT_SECONDS`, `LAZYCODEX_OBSERVE_LOG` (absolute path of a **new file** to use as the observation log).

Run the script below verbatim. The task enters only through a mode-`0600` temp file into the runner stdin; do not echo the task or credentials into commands, stdout, or stderr.

```bash
[ -n "${LAZYCODEX_GJC_TASK:-}" ] || { echo "lazycodex-gjc task is empty" >&2; exit 2; }
: "${TARGET_CWD:=$PWD}"
: "${SANDBOX:=read-only}"
case "$SANDBOX" in
  read-only) ;;
  *) echo "sandbox must be read-only; workspace-write is disabled" >&2; exit 2 ;;
esac
umask 077
ACCOUNT_HOME="$(/usr/bin/getent passwd "$(/usr/bin/id -u)" | /usr/bin/cut -d: -f6)"
[ -n "$ACCOUNT_HOME" ] || { echo "canonical account home unavailable" >&2; exit 1; }
RUNTIME_ROOT="$ACCOUNT_HOME/.gjc/agent/runtimes/lazycodex-gjc"
SOURCE_BINDING="$RUNTIME_ROOT/binding"
SOURCE_RUNNER="$RUNTIME_ROOT/runner.mjs"
[ -f "$SOURCE_BINDING" ] && [ ! -L "$SOURCE_BINDING" ] && [ -f "$SOURCE_RUNNER" ] && [ ! -L "$SOURCE_RUNNER" ] || { echo "trusted lazycodex-gjc runtime binding not found; rerun native user install" >&2; exit 1; }
ACCOUNT_UID="$(/usr/bin/id -u)"
[ "$(/usr/bin/stat -c %u "$RUNTIME_ROOT")" = "$ACCOUNT_UID" ] && [ "$(/usr/bin/stat -c %a "$RUNTIME_ROOT")" = 700 ] && [ "$(/usr/bin/stat -c %u "$SOURCE_BINDING")" = "$ACCOUNT_UID" ] && [ "$(/usr/bin/stat -c %a "$SOURCE_BINDING")" = 600 ] && [ "$(/usr/bin/stat -c %u "$SOURCE_RUNNER")" = "$ACCOUNT_UID" ] && [ "$(/usr/bin/stat -c %a "$SOURCE_RUNNER")" = 700 ] || { echo "lazycodex-gjc runtime permissions are unsafe; rerun native user install" >&2; exit 1; }
PRIVATE_BASE="$ACCOUNT_HOME/.cache/oh-my-gjc/lazycodex-gjc"
/usr/bin/mkdir -p "$PRIVATE_BASE" && /usr/bin/chmod 700 "$PRIVATE_BASE" || { echo "cannot create private launch directory" >&2; exit 1; }
LAUNCH_ROOT="$(/usr/bin/mktemp -d "$PRIVATE_BASE/launch-XXXXXX")" || { echo "cannot create private launch directory" >&2; exit 1; }
TASK_FILE="$LAUNCH_ROOT/task"
BINDING="$LAUNCH_ROOT/binding"
RUNNER="$LAUNCH_ROOT/runner.mjs"
cleanup() { /usr/bin/rm -rf -- "$LAUNCH_ROOT"; }
trap cleanup EXIT HUP INT TERM
printf '%s' "$LAZYCODEX_GJC_TASK" > "$TASK_FILE"
unset LAZYCODEX_GJC_TASK
/bin/cp -- "$SOURCE_BINDING" "$BINDING" && /bin/cp -- "$SOURCE_RUNNER" "$RUNNER" || { echo "lazycodex-gjc runtime snapshot failed" >&2; exit 1; }
/usr/bin/chmod 600 "$TASK_FILE" "$BINDING" "$RUNNER"
mapfile -t BINDING_LINES < "$BINDING"
[ "${#BINDING_LINES[@]}" -eq 16 ] && [ "${BINDING_LINES[0]}" = lazycodex-gjc-binding-v1 ] && [ "${BINDING_LINES[1]}" = "$ACCOUNT_HOME" ] && [ "${BINDING_LINES[3]}" = "$SOURCE_RUNNER" ] || { echo "lazycodex-gjc runtime binding is invalid; rerun native user install" >&2; exit 1; }
sha256_file() { /usr/bin/sha256sum -- "$1" | { read -r digest _; printf '%s' "$digest"; }; }
secure_file() {
  local path="$1" expected="$2" current uid mode owner
  [ -f "$path" ] && [ ! -L "$path" ] && [ "$(/usr/bin/readlink -f "$path")" = "$path" ] && [ "$(sha256_file "$path")" = "$expected" ] || return 1
  uid="$(/usr/bin/id -u)"
  mode="$(/usr/bin/stat -c %a "$path")"; owner="$(/usr/bin/stat -c %u "$path")"
  { [ "$owner" = "$uid" ] || [ "$owner" = 0 ]; } && [ $((8#$mode & 8#22)) -eq 0 ] || return 1
  current="$(/usr/bin/dirname "$path")"
  while [ "$current" != / ]; do
    [ ! -L "$current" ] || return 1
    mode="$(/usr/bin/stat -c %a "$current")"; owner="$(/usr/bin/stat -c %u "$current")"
    [ "$owner" = "$uid" ] || [ "$owner" = 0 ] || return 1
    [ $((8#$mode & 8#22)) -eq 0 ] || return 1
    if [ "$owner" = "$uid" ] && [ $((8#$mode & 8#77)) -eq 0 ]; then return 0; fi
    current="$(/usr/bin/dirname "$current")"
  done
}
secure_file "$RUNNER" "${BINDING_LINES[2]}" && secure_file "${BINDING_LINES[5]}" "${BINDING_LINES[4]}" || { echo "lazycodex-gjc runtime verification failed; rerun native user install" >&2; exit 1; }
RUNNER_ARGS=(--cwd "$TARGET_CWD" --sandbox "$SANDBOX")
[ -z "${CODEX_MODEL:-}" ] || RUNNER_ARGS+=(--model "$CODEX_MODEL")
[ -z "${LAZYCODEX_TIMEOUT_SECONDS:-}" ] || RUNNER_ARGS+=(--timeout-seconds "$LAZYCODEX_TIMEOUT_SECONDS")
[ -z "${LAZYCODEX_OBSERVE_LOG:-}" ] || RUNNER_ARGS+=(--observe-log "$LAZYCODEX_OBSERVE_LOG")
"${BINDING_LINES[5]}" "$RUNNER" "${RUNNER_ARGS[@]}" --binding "$BINDING" < "$TASK_FILE"
```

## Results

- On exit 0, pass the runner stdout through as the final result of the external LazyCodex worker.
- If the worker completed the goal and exited 0 but the final output exceeds the 1 MiB relay limit, the runner delivers a **fixed bounded summary** at exit 0 instead of discarding verified work (issue #202 atomicity contract — read-only means no workspace side effects on any path). The 8 MiB hard limit and runaway streams still abort early and fail closed.
- On failure, do not treat partial results as success. Summarize the exit code and the runner's one-line error, and guide only the install/PATH/login/timeout actions the user must resolve themselves.
- Do not relay child stderr verbatim, as it may contain the original task or file secrets.
- The runner's `--ephemeral` means the **external Codex session** is not persisted. This bash call and its result remain in the current GJC conversation, but no child GJC session is created.
- `GJC_NOTIFICATIONS=0 GJC_SDK_DISABLE=1` applies only to the external child and its shell inside the runner. It does not change the current GJC notification/SDK settings.

## Observation — leader live monitoring (optional)

- If you pass an absolute path of a new file to `LAZYCODEX_OBSERVE_LOG` (e.g. `/tmp/lazycodex-observe-<timestamp>.log`), the runner **parent process** tees the codex exec event stream **after redaction** to that log. The child sandbox and relay contract are unchanged — raw child stdout/stderr is still not relayed to launcher stdio.
- Redaction over-masks tokens, credential assignments, and long opaque blobs (fail-closed). Log creation failure stops before spawn; runtime log write failure or hitting the log cap (8 MiB) stops only observation, with no effect on the worker.
- The leader tails the log path with the GJC monitor tool **before** starting the synchronous bash call. Observation is read-only — judge only from the log; do not touch the worker process or files.
- The first `[observe]` line of the log names the systemd unit and the stop command. On anomaly, the leader stops the unit with `systemctl --user stop <unit>`. The RuntimeMaxSec backstop of the isolation contract remains.
- The log is created as a mode-0600 new file; specifying a path inside protected state paths (`.gjc`, `~/.codex`, `CODEX_HOME`) is rejected.

## Orchestration standard

- **Dispatching pieces is standard.** Instead of monolithic tasks, split into small independently verifiable pieces — about 6 minutes each measured. Piece-level dispatch keeps re-dispatch cost low on failure and reduces oversized-output/timeout risk.
- **Do not delegate visual QA.** The leader measures rendering, animation, and layout QA directly with their own browser. Static screenshot QA is insufficient — an animation race where the first paint grants visibility was measured, and running-animation counts are not visibility evidence.
- **The interactive variant is on hold.** This skill supports only single synchronous execution; no interactive/session-style worker variant is introduced.

## Absolute prohibitions

- GJC `task`/goal/team/session/config calls or GJC file/plugin changes
- LazyCodex/Codex install/update/doctor/migration/setup/login on the user's behalf
- `danger-full-access`, approval bypass, task shell interpolation, task/credential echo
- background/async execution, reporting success before the external worker result is in
