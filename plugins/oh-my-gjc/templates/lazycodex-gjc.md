---
description: Synchronously runs an already-installed Codex+LazyCodex as an isolated read-only external worker without touching GJC internals and retrieves only the result. workspace-write is disabled for safety.
argument-hint: "<read-only investigation/review task> [target cwd]"
---

# /omg:lazycodex-gjc

Treat `$ARGUMENTS` or the immediately preceding user request as the **original task** and run the already-installed Codex+LazyCodex as a one-time external worker. If the task is empty, ask once and do not execute.

## Permission decision

- Only `read-only` is allowed.
- `workspace-write` is fail-closed disabled until concurrent-edit safety is proven. Do not delegate modification work to this command.
- `danger-full-access` and approval bypass are always forbidden.
- Only a private runner snapshot matching the mode-0600 SHA-256 runtime binding (`~/.gjc/agent/runtimes/lazycodex-gjc/binding`) created by the user-scope native install is executed. A project-scope install alone safely aborts.
- The runner first verifies a compatible OMO `ultrawork` and uses a custom permission profile that exposes only the target `cwd` (excluding all-depth `.gjc` present at start and the root `.gjc` reserved paths) + the exact Codex runtime helper + a private tmp. Directory symlinks pointing inside the workspace are checked to their canonical target; external directory symlinks not exposed to the sandbox are skipped. The real user's `~/.gjc`, `~/.codex`, and `CODEX_HOME` are explicitly blocked, and specifying inside them as target `cwd` is rejected before spawn; web/MCP/apps/hooks/browser egress and child shell environment inheritance are also disabled. The Codex native profile cannot pre-block by path name a future `.gjc` created under the first parent after profile generation. Therefore a separate prohibition rule applies: instruct the worker not to create or modify any `.gjc`.

Pass the task as `LAZYCODEX_GJC_TASK` and the target absolute path as `TARGET_CWD` in the GJC `bash` tool's `env` parameter. Do not paste the task into the shell string below. Optionally add only `CODEX_MODEL`, `LAZYCODEX_TIMEOUT_SECONDS`, and `LAZYCODEX_OBSERVE_LOG` (absolute path of a **new file** to use as the observation log) to env.

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

This call executes **one synchronous GJC bash**. Do not use GJC `task`, goal, team, move, write/edit, or background jobs; do not run install/update/doctor/setup/login.
On success, return stdout as-is; on failure, give a short error and manual remediation without partial results.
If the worker completed the goal but the final output exceeds the 1 MiB relay limit, the runner returns a fixed bounded summary at exit 0 — completed work is not discarded as failure (#202 atomicity contract).
Do not relay child stderr verbatim, as it may contain task or file secrets.

The runner's `--ephemeral` applies only to the external Codex session. This command and its result remain in the current GJC conversation, but no child GJC session is created. The child and its shell's `GJC_NOTIFICATIONS=0 GJC_SDK_DISABLE=1` also do not change the current GJC settings.

## Observation and orchestration

- If you pass `LAZYCODEX_OBSERVE_LOG`, the runner parent process tees the redacted codex exec event stream to that new log file (mode 0600). The leader tails the log with the GJC monitor tool **before** the synchronous bash call, and on anomaly stops the unit named in the log's first `[observe]` line via `systemctl --user stop <unit>`. Observation is read-only; log failure does not affect the worker.
- **Piecewise dispatch** is standard instead of monoliths (about 6 minutes per piece measured). Visual QA is the leader's browser's job; static screenshot QA is insufficient (animation race measured — running counts are not visibility evidence).
  The interactive variant is on hold.
