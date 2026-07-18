---
name: time-left
description: "Only when the `/omg:time-left` command is explicitly requested, estimate the remaining time of a running ralplan or ultragoal using the current session's GJC v0.11 SDK telemetry. Does not auto-activate from other inputs. Uses only read-only SDK state and the current workflow state; does not guarantee a completion time or send control commands."
---

# Workflow ETA

Purpose: combine the **real-time SDK state** of the current top-level GJC session with the canonical workflow phase of the same session to describe the remaining **machine work-time range** of `ralplan` or `ultragoal`. This is a conservative estimate based on the current snapshot, not a promised completion time.

## Absolute boundaries

- Send only fixed read-only queries to SDK v3: `session.metadata`, `goal.list/get`, `todo.list`, `workflow.gates.list`, `runtime.jobs.list`.
- Do not send `user_message`, `reply`, control, config, broker, or arbitrary queries.
- Do not start, resume, approve, or interrupt ralplan/ultragoal, or answer a gate.
- Do not read transcript, private memory, other sessions, or browser history as ETA evidence.
- Do not save observations or estimates to files to build a per-user speed profile.
- Do not output SDK endpoint/token. Do not relay errors that contain tokens verbatim.
- Do not assert a completion **time**. State only a heuristic range like `estimated ~N–M minutes` with confidence.

## 1. Select the canonical workflow

Regardless of user specification, always **read** both workflows below. If the user specified one, use that name only as an expectation that it is the unique active workflow; do not skip the concurrent-active check on the other.

```bash
gjc state ralplan read --json
gjc state ultragoal read --json
```

- Select `$WORKFLOW` only when exactly one workflow is `active:true` and not in a terminal phase.
- If both are active, both inactive, or the state is malformed/corrupt, do not produce a numeric ETA; report that workflow selection is impossible.
- `skill.list/state` (Q11) is an available-skill catalog, not active-workflow evidence. Do not use it for ETA determination.
- Do not use `write`, `handoff`, `approve`, or `ultragoal status` for ETA queries (`ultragoal status` may perform derived repair).

## 2. Collect the SDK snapshot

Use only the **user-scope** runtime prepared by the native installer. The project runtime has no execution authority. If the exact `session_id` from step 1 is absent, do not guess an SDK candidate; stop estimation.

```bash
set -euo pipefail
WORKFLOW="<ralplan or ultragoal selected in step 1>"
SESSION_ID="<exact session_id from the selected state>"
RUNTIME_PARENT="$HOME/.gjc/agent/runtimes/oh-my-gjc"
SDK_RUNTIME="$RUNTIME_PARENT/sdk-lab"
LOCK="$RUNTIME_PARENT/.sdk-lab.lock"

command -v bun >/dev/null 2>&1 && command -v flock >/dev/null 2>&1 || {
  printf '%s\n' 'time-left requires Bun >=1.3.14 and flock' >&2
  exit 78
}
case "$SESSION_ID" in
  ''|[!A-Za-z0-9]*|*[!A-Za-z0-9._-]*)
    printf '%s\n' 'time-left requires the exact canonical workflow session_id' >&2
    exit 78 ;;
esac
[ -d "$RUNTIME_PARENT" ] && [ ! -L "$RUNTIME_PARENT" ] &&
[ "$(realpath -e "$RUNTIME_PARENT")" = "$RUNTIME_PARENT" ] &&
[ "$(stat -c %u "$RUNTIME_PARENT")" = "$(id -u)" ] &&
[ -z "$(find "$RUNTIME_PARENT" -maxdepth 0 -perm /077)" ] || {
  printf '%s\n' 'time-left runtime parent is not private and canonical' >&2
  exit 78
}
[ -f "$LOCK" ] && [ ! -L "$LOCK" ] &&
[ "$(stat -c %u "$LOCK")" = "$(id -u)" ] &&
[ "$(stat -c %a "$LOCK")" = 600 ] || {
  printf '%s\n' 'time-left SDK runtime lock is unavailable or untrusted' >&2
  exit 78
}
exec 9<>"$LOCK"
flock -s -w 5 9 || {
  printf '%s\n' 'time-left SDK runtime is being refreshed; retry shortly' >&2
  exit 75
}
[ -d "$SDK_RUNTIME" ] && [ ! -L "$SDK_RUNTIME" ] &&
[ "$(realpath -e "$SDK_RUNTIME")" = "$SDK_RUNTIME" ] &&
[ "$(stat -c %u "$SDK_RUNTIME")" = "$(id -u)" ] &&
[ "$(stat -c %a "$SDK_RUNTIME")" = 700 ] &&
[ -f "$SDK_RUNTIME/src/eta.ts" ] && [ ! -L "$SDK_RUNTIME/src/eta.ts" ] &&
[ "$(stat -c %u "$SDK_RUNTIME/src/eta.ts")" = "$(id -u)" ] &&
[ "$(stat -c %a "$SDK_RUNTIME/src/eta.ts")" = 600 ] || {
  printf '%s\n' 'time-left SDK runtime unavailable or untrusted; rerun the hardened installer' >&2
  exit 78
}
bun run "$SDK_RUNTIME/src/eta.ts" --workflow "$WORKFLOW" --session-id "$SESSION_ID"
```

- `$WORKFLOW` is the enum label selected from the step-1 canonical state, not a value determined by the SDK. The SDK provides real-time todo/job/gate telemetry for the same current session.
- The result must be a single bounded JSON object. If it is not JSON or required fields are wrong, do not estimate.
- The SDK `session.id` must equal the state's `session_id` (when present) and the current `GJC_SESSION_ID` (when present). If they differ, stop for safety.
- If SDK hosting is off or the endpoint is absent, say `SDK observation unavailable`. Do not glob/read discovery files directly or implement a WebSocket to bypass.

### Ralplan phase interpretation

- The default order is `planner` → `architect` → `critic`, but critic may request `revision`.
- `revision` has an indeterminate iteration count, so widen the conservative range.
- `post-interview` and pending approval/gate wait for a human answer, so do not produce a numeric wall-clock ETA.
- `adr`, `final`, and `handoff` are near-end/terminal states, but if a required gate remains, do not assert completion.

### Ultragoal phase interpretation

- Look at canonical `counts`, goal statuses, and SDK todo/job state together.
- If any `blocked`, `failed`, paused goal, or pending gate exists, do not produce a numeric wall-clock ETA.
- Do not set time from remaining goal count alone. If there is no observable progress evidence in SDK todo/job units or the same run, mark `insufficient evidence`.
- Do not simply sum parallel jobs. The slowest active lane and the remaining serial todos dominate completion time.

## 3. Estimation rules

Use the SDK JSON `estimate` as the base value only when it provides a number.

1. `likelyMinutes` is the heuristic central value extrapolating **observed elapsed time per completed todo in this goal** onto remaining todos.
2. `conservativeMinutes` is an upper-bound-style value adding retry, queue, and review variance to the same central value, and must always be ≥ `likelyMinutes`. Neither is a probabilistic quantile.
3. If there are no completed todos and no positive elapsed time, do not fabricate a speed; leave `insufficient evidence`.
4. If the canonical phase shows additional risk (revision/blocked/human gate), do not make the number more precise; lower confidence or switch ETA to `waiting / cannot estimate`.
5. If SDK and state conflict, discard the number and report `state mismatch`.
6. Minimum confidence is `low`, maximum is `medium`. Do not use `high` because local past runs are not stored or learned.

Produce a reason instead of a number under these conditions:

- pending human workflow gate → `re-estimate after user response`
- paused goal → `paused — resume time unknown`
- failed job / blocked·failed workflow / quarantined gate → `re-estimate after block resolved`
- active workflow or remaining work units undetected → `insufficient evidence`
- SDK/state session identity mismatch → `estimation stopped for safety`

## 4. Output format

```text
Workflow: ralplan | ultragoal
Current state: <phase + streaming/jobs/todo summary>
Remaining time: estimated ~N–M minutes | re-estimate after user response | cannot estimate
Confidence: low | medium
Evidence: <2–4 SDK observations + canonical phase>
Variance factors: <revision, external review, failure retry, human gate, etc., up to 3>
Observation time: <SDK observedAt>
```

- If the user asks briefly, answer in 6 lines or fewer.
- If `adaptive-response` is active, match terminology density to the user's level, but do not omit the meaning of "non-probabilistic heuristic" or the uncertainty.
