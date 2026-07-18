---
description: oh-my-gajaecode initial setup — verify install state, check prerequisites, and guide the response-calibration + gate always-on toggle. Safe to run multiple times (idempotent).
argument-hint: "(no arguments)"
---

# /omg:setup

Sets up oh-my-gajaecode on this machine. **All steps are idempotent** — existing state is skipped, and there are no destructive actions.
Installation copies bundled files natively and prepares the time-left exact-lock SDK runtime in a private directory when prerequisites are met. It does not install external prerequisites such as ChatGPT subscription or Chromium.

## Step 0 — verify native install state

`/omg:setup` canonical diagnostic/repair target is the same **user scope** `~/.gjc/agent` as the hardened one-shot installer. It asserts the entire retained surface and the absence of retired remnants. If any of project `.gjc/runtimes/oh-my-gjc/root`, `.gjc/commands/omg*.md`, or the suite-owned `.gjc/skills/<name>` below is present, warn separately that `project-scope remnants may take precedence over the user install`. This command does not modify project remnants.

```bash
root="$HOME/.gjc/agent"
for skill in adaptive-response time-left extragoal insane-review lazycodex-gjc deep-onboarding session-observer; do
  test -f "$root/skills/$skill/SKILL.md" || exit 1
done
for command in omg.md omg:setup.md omg:gate.md omg:gate-always.md omg:time-left.md omg:fable.md omg:insane-review.md omg:lazycodex-gjc.md omg:deep-onboarding.md omg:session-observer.md; do
  test -f "$root/commands/$command" || exit 1
done
for skill in gate-briefing korean-first no-english workflow-eta codex-deepwork codex-app-launch codex-app-cdp codex-cli-ask lazycodex tower worktree gajae-app multivendor-presets release-gate easy-answer plain-layer branch-flow gjc-bugwatch; do
  test ! -e "$root/skills/$skill" && test ! -L "$root/skills/$skill" || exit 1
done
for command in codex-run codex-app-launch codex-app-ask codex-ask lazycodex-setup lazycodex-work tower-setup gajae-app presets release easy easy-always plain branchflow-always worktree bugwatch-scan no-english; do
  test ! -e "$root/commands/omg:$command.md" && test ! -L "$root/commands/omg:$command.md" || exit 1
  test ! -e "$root/commands/oh-my-gjc:$command.md" && test ! -L "$root/commands/oh-my-gjc:$command.md" || exit 1
done
for legacy in codex-app-control:ask codex-app-control:launch codex-cli-control:ask codex-deepwork:run gjc-bugwatch:scan insane-review:review lazycodex:setup lazycodex:work oh-my-gjc:branchflow-always oh-my-gjc:easy-always oh-my-gjc:easy oh-my-gjc:fable oh-my-gjc:gate-always oh-my-gjc:gate oh-my-gjc:presets oh-my-gjc:setup tower:setup; do
  test ! -e "$root/commands/$legacy.md" && test ! -L "$root/commands/$legacy.md" || exit 1
done
workflow_eta_runtime="$root/runtimes/oh-my-gjc/sdk-lab"
if command -v bun >/dev/null 2>&1 && [ -f "$workflow_eta_runtime/src/eta.ts" ]; then
  bun --version
else
  printf '%s\n' 'time-left SDK runtime unavailable — rerun hardened installer with Bun >=1.3.14'
fi
```

If anything is missing or the plugin needs upgrade/repair, do not pick a cache directly or run `bin/install-skill.sh`. Always rerun the hardened installer that binds payload identity to the current install result, in a shell:

```bash
curl -fsSL https://raw.githubusercontent.com/ThewindMom/oh-my-gjc-en/main/install.sh | bash

# if curl|bash is disallowed:
git clone --depth 1 https://github.com/ThewindMom/oh-my-gjc-en.git
bash oh-my-gjc-en/install.sh
```

The installer handles marketplace refresh, forced-install compatibility, cache/native path validation for the current install version, and skill/command copy in one path. Newest-cache selection like `sort -V | tail -1` is forbidden because it may run a stale payload. After install, open a **new session** or run `/move .` to rebuild the command palette.

## Step 1 — legacy cleanup (when present)

- The user-scope hardened installer cleans only well-formed retired `easy-always` markers from `~/.gjc/agent/SYSTEM.md` and `AGENTS.md` after a unique mode-preserving backup. Malformed files, other user content, and `gate-always` markers are preserved.
- Post-v0.17.1 prune removes the native skills/commands of `easy-answer`, `plain-layer`, `branch-flow`/`worktree`, public `gjc-bugwatch`, `multivendor-presets`, and `release-gate`.
- The 0.19.0 upgrade removes the renamed `gate-briefing` directory, installs `adaptive-response`, and removes the prior `korean-first` directory name.
- The 0.19.1 upgrade renames `workflow-eta` to `time-left`; both full install and time-only install remove the prior `workflow-eta` directory. The SDK runtime is atomically replaced from the exact lockfile and on failure the skill is left fail-closed.
- `lazycodex-gjc` is retained; stale bindings are removed only when user-runtime prerequisites are absent. Existing `models.yml` and previously merged profiles are not modified.
- If the current working directory is a git repo, back up and remove only the well-formed `oh-my-gjc:branchflow` block that past `/omg:branchflow-always` wrote to `AGENTS.md`. For other repos, rerun the installer from each repo root. `docs/WORKFLOW.md` is treated as user documentation and is not auto-deleted.
- If the user previously installed separate individual plugins, the single suite has now consolidated them, so suggest removing the old individual plugins (only after consent, in a shell): e.g. `gjc plugin uninstall my-workflows@oh-my-gjc`.
- The 0.14.0 upgrade cleans only the legacy native `~/.gjc/agent/skills/gajae-app/` and `~/.gjc/agent/commands/omg:gajae-app.md`; it does not delete or change an existing self-hosted app deployment. Follow [devswha/claudecodeui SELF-HOST docs](https://github.com/devswha/claudecodeui/blob/feat/gjc-provider/docs/SELF-HOST.md) afterwards.
- The English fork additionally removes the `no-english` skill and `/omg:no-english` command (Korean-first presentation layer, meaningless in an English fork).

## Step 2 — prerequisite feature availability (read-only guidance)

Prerequisite features are **already installed.** Detect the following and inform only what can be used right now (missing ones are kindly guided and stopped when the relevant command runs, so do not mention them here):

| Detection | Check | Feature usable now |
|---|---|---|
| GJC SDK workflow ETA | Linux + Bun 1.3.14+ + private `oh-my-gjc/sdk-lab` runtime | `/omg:time-left [ralplan\|ultragoal]` |
| Chrome + ChatGPT | Chrome profile exists | `/omg:insane-review` |
| Codex + LazyCodex | `codex` on PATH and compatible OMO + user-scope runtime binding installed | `/omg:lazycodex-gjc` (read-only) |

## Step 3 — response-calibration + gate-briefing always-on mode guidance (optional)

Introduce the last remaining semaphore toggle (execution is the user's job):

```
/omg:gate-always on          # response calibration + gate briefing for new sessions not overridden by a project SYSTEM.md
```

## Output format

Summarize each Step result as a one-line checklist item (✓ done / → suggestion / – n/a) and finish.
No verbose explanations.
