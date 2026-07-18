# oh-my-gajaecode (English)

> **This is the English-language fork of [devswha/oh-my-gjc](https://github.com/devswha/oh-my-gjc).**
> All retained skill bodies, command templates, and primary user-facing docs are translated to English. The `no-english`
> Korean-first presentation skill and its `/omg:no-english` command are **removed** — they have no
> meaningful equivalent in an English fork. Everything else is functionally identical to the
> upstream `0.20.0` release.

A plugin suite that pushes against the Gajae-Code grain.

[Gajae-Code guide](https://gjc.vibetip.help/ko/docs)

## 1. Install

**① In a terminal:**

```
curl -fsSL https://raw.githubusercontent.com/ThewindMom/oh-my-gjc-en/main/install.sh | bash
```



**② In a gjc session:**

```
Install oh-my-gjc by following https://raw.githubusercontent.com/ThewindMom/oh-my-gjc-en/main/INSTALLATION.md — run the steps, verify, and report.
```

<details>
<summary>Install is blocked</summary>

If the one-shot is blocked, clone the repo and run the same hardened installer:

```
git clone --depth 1 https://github.com/ThewindMom/oh-my-gjc-en.git
bash oh-my-gjc-en/install.sh
```

One install brings all 7 skills + 10 commands (`/omg` + 9 `/omg:*`) — nothing else to add. To upgrade, re-run the one-shot line.
For contributor details (principles, glob rules), see AGENTS.md.

</details>

## 2. What's in it

- `adaptive-response` — response-level calibration + approval-gate briefing, explicitly applied via `/omg:gate` · `/omg:gate-always`
- `/omg:time-left` — explicitly query the remaining-time range of a running ralplan · ultragoal via GJC SDK v3 · **requires Bun 1.3.14+**
- `extragoal` — external final review gate (merge after no-shared, cross-family review)
- `/omg:fable` — adversarial audit of safety-critical code (money/data/security code) · **requires Fable 5 model**
- `insane-review` — GPT-5.6 Sol Pro web code review · **requires ChatGPT subscription + Chromium login**
- `lazycodex-gjc` — run an installed Codex+LazyCodex/OMO as an isolated read-only external worker (`/omg:lazycodex-gjc`)
- `deep-onboarding` — read-only analysis + interview of a poorly documented repo, then generate a project map, ADR proposals, and handoff to a confirmed path (`/omg:deep-onboarding`)
- `session-observer` — read-only live observation of another GJC session's JSONL conversation (`/omg:session-observer`)

Full command list: `/omg`, `/omg:setup`, `/omg:gate`, `/omg:gate-always`, `/omg:time-left`, `/omg:fable`, `/omg:insane-review`, `/omg:lazycodex-gjc`, `/omg:deep-onboarding`, `/omg:session-observer`.

Model configuration uses GJC defaults and built-in presets as-is. omj does not install custom model presets or modify `models.yml`.

## 3. In detail

### `adaptive-response` — general response calibration + approval-gate briefing

Builds a **temporary response persona** from the domain proficiency, explanation density, and decision-making role confirmed in the current conversation — prioritizing terminology glossing and examples for beginners, contracts/flows/recovery for practitioners, and invariants/boundary conditions/evidence for experts. At approval/rejection moments it goes from level-matched translation → approval boundaries → evidence checklist → verdict. It only adjusts expression; it does not reduce safety mechanisms, warnings, or approval authority, and it does not execute approve/reject either.

- If 2 or more "not specified" items appear, it automatically pushes to **hold** (prevents approving while ignorant).
- It does not gloss over domains. Code, infra, contracts — all briefed with the same frame.
- Inferred persona data is not stored. It uses only the current session, current task, and user-specified files as evidence; it does not explore home, browser, credentials, or private memory for persona purposes.
- Turn on: `/omg:gate` (all responses in this session) / `/omg:gate-always on` (default for new sessions not overridden by a project `.gjc/SYSTEM.md`)
- Source: [`plugins/oh-my-gjc/skills/adaptive-response/SKILL.md`](./plugins/oh-my-gjc/skills/adaptive-response/SKILL.md)

### `extragoal` — external final review gate

Before merge, completed work is re-examined by **a different model that has not seen the work process**, judging only the completed diff. Not in-session review — like a real PR review: no-shared, cross-family verdict → approve/request-changes verdict → triaged findings → fix and re-sign until a clean candidate → mechanical merge.

- Reviewer lanes: native cross-session gjc (default) / `/omg:fable` / `insane-review` (GPT-5.6 Sol Pro web) — combined with an AND gate.
- fail-closed: missing, malformed, or timeout verdicts are never treated as approval. Secret scanning is non-negotiable on lanes where the bundle leaves the machine.
- Turn on: activated by skill trigger. Uses GJC's default model config for cross-session review with no separate reviewer preset. Source: [`plugins/oh-my-gjc/skills/extragoal/SKILL.md`](./plugins/oh-my-gjc/skills/extragoal/SKILL.md)

### `lazycodex-gjc` — isolated read-only Codex+LazyCodex worker

Runs an already-installed and logged-in **Codex CLI + LazyCodex/OMO** as a one-time external `codex exec --ephemeral` worker and retrieves only the result.

- Only `read-only` is allowed. `workspace-write` is fail-closed until concurrent-edit safety is proven.
- It does not create child GJC sessions or tasks, and does not copy or change GJC config or credentials.
- The user-scope native install's private SHA-256 runtime binding and runner must match to execute.
- Use: `/omg:lazycodex-gjc "read-only investigation/review task"`
- Source: [`plugins/oh-my-gjc/skills/lazycodex-gjc/SKILL.md`](./plugins/oh-my-gjc/skills/lazycodex-gjc/SKILL.md)

### `deep-onboarding` — onboarding for undocumented repositories

First analyzes the target repository read-only, then interviews one material ambiguity at a time. It previews a project map, ADR proposals, and a handoff draft, and writes those three Markdown files only after the user explicitly confirms an output directory. It does not silently create docs in the target repo or overwrite existing files.

- Use: `/omg:deep-onboarding [proposed output path]`
- Source: [`plugins/oh-my-gjc/skills/deep-onboarding/SKILL.md`](./plugins/oh-my-gjc/skills/deep-onboarding/SKILL.md)

### `/omg:fable` — adversarial audit of safety-critical code

Audits money/data/security-critical code with the Fable 5 model. Not a design review — it hunts for "is there a scenario where these safety mechanisms fail **simultaneously**." Read-only; reports severity + file:line + reproduction scenario.

- Scope is only 3–6 files. More makes the audit shallow.
- Top findings are briefed only after cross-checking (spot-check) against real code. No forced defects.
- No `:max` — Fable is silently clamped to `xhigh`. If Fable refuses, fall back to `opus-4-8`.
- Use: `/omg:fable "order path and stop-loss logic"`
- Source: [`plugins/oh-my-gjc/templates/fable.md`](./plugins/oh-my-gjc/templates/fable.md)

### `insane-review` — GPT-5.6 Sol Pro web review

GPT-5.6 Sol Pro is only available on web subscription and has no API. This skill automates the subscription ChatGPT web via CDP to bring Pro into gjc. Zero API cost. Instead of dumping the whole codebase, it selects only the relevant targets, packs them with repomix, and retrieves the review.

- Prerequisite: ChatGPT subscription + Chromium login (install is included in the one-shot; login is not automatic).
- Launch a Chromium browser with a dedicated profile on debug port 9222, log in to chatgpt.com, and select GPT-5.6 Sol Pro. Login is not automated.
- Results are saved to the project's `.insane-review/`.
- Source: [`plugins/oh-my-gjc/skills/insane-review/SKILL.md`](./plugins/oh-my-gjc/skills/insane-review/SKILL.md)

### `/omg:time-left` — remaining time for ralplan · ultragoal

Selects the active workflow from canonical `gjc state ... read --json`, then reads todo/goal/job/gate state from the SDK v3 bus of the running top-level GJC session and estimates the remaining time as a non-probabilistic heuristic range like `estimated ~N–M minutes`. It does not guarantee a completion time, and shows re-estimation conditions instead of numbers under human approval, pause, failure/block, or insufficient-evidence states. It does not auto-fire on general natural-language ETA questions — you must explicitly run `/omg:time-left`.

To query a running ralplan or ultragoal, run `/omg:time-left` in the **same session** running that workflow. The skill enforces session identity match. If the session is mid-turn, just type the command and press Enter — GJC's default `promptWhileBusy` queues it for the next turn boundary, so steering is not needed. Steering interrupts the active turn, so use it only when truly urgent. `/btw` is a tools-forbidden contract, so it cannot run the skill and would make the model guess — not suitable for this use.

- Uses only read-only queries; sends no prompt/reply/control/config.
- Does not read transcripts or other sessions, and does not store execution history as a user speed profile.
- Prerequisite: Linux, Bun 1.3.14+, a current top-level session with GJC SDK hosting on.
- Source: [`plugins/oh-my-gjc/skills/time-left/SKILL.md`](./plugins/oh-my-gjc/skills/time-left/SKILL.md)

### `session-observer` — read-only observation of another session's conversation

Open with `/omg:session-observer --tmux omg` or `/omg:session-observer --session <id>`. Default is conversation view + follow; `--mode user-only` shows only user utterances, `--thinking` also shows selected thinking, and `--no-follow` ends as a snapshot.

The runner tails `$HOME/.gjc/agent/sessions/...jsonl` and outputs only user/assistant text and optional thinking, excluding tool-call noise. JSONL is the safe default path and has no SDK dependency. The slash launcher requires Linux, Bun, and tmux.

The observer is read-only. It does not inject, control, or write to the session, performs no network or upstream activity, and never returns observed text to a GJC tool result. Running the runner directly in a terminal is fully token-free. The slash command's `--no-follow` and omitting `--follow` on the terminal runner both end as a snapshot. The slash command spends only one launch turn to put the viewer in a detached tmux window; subsequent viewing is token-free and observed text never returns to GJC.

To run fully token-free directly from a repository checkout:

```sh
bun plugins/oh-my-gjc/bin/session-observer.ts --tmux omg --follow
```

### GJC 0.11 SDK lab

The official `@gajae-code/bridge-client`-based read-only runtime for `time-left` and a developer inspection tool. The hardened installer prepares a user-scope private runtime with an exact lockfile and scripts-disabled install, and on failure leaves the skill fail-closed. During install, Bun may contact the configured package registry; set `OMG_TIME_LEFT_RUNTIME=0` to skip the runtime install.

- Source, usage, SDK boundary: [`plugins/oh-my-gjc/tools/sdk-lab/README.md`](./plugins/oh-my-gjc/tools/sdk-lab/README.md)
- GJC source is not forked or vendored; it is verified against a pinned v0.11.0 SHA in a `/tmp` checkout.
- A separate fork PR against `dev` is made only when an upstream patch is actually needed.

### Gajae app migration (0.14.0)

The `gajae-app` skill and `/omg:gajae-app` command have been split out of this bundle. This upgrade does not delete an existing self-hosted app deployment. For install/update, follow the [devswha/claudecodeui SELF-HOST docs](https://github.com/devswha/claudecodeui/blob/feat/gjc-provider/docs/SELF-HOST.md).

## License

MIT. See [LICENSE](./LICENSE).
