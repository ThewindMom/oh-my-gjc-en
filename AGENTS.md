# AGENTS.md — working in oh-my-gjc (English fork)

Agent-facing guide for `oh-my-gjc`, a **plugin marketplace** for Gajae Code (`gjc`).
Read this before adding or editing plugins. Human-facing intro lives in [README.md](./README.md).

> This is the English-language fork of [devswha/oh-my-gjc](https://github.com/devswha/oh-my-gjc).
> Retained skill bodies, command templates, and primary user-facing docs are in English. The `no-english` Korean-first skill and
> `/omg:no-english` command are removed. The structural conventions below are the same as upstream.

## What this repo is

A single git repo that catalogs installable `gjc` plugins. One `marketplace.json`
lists every plugin; each plugin is one directory under `plugins/`. The format is
compatible with the Claude Code / Codex plugin spec.

Plugins install from the **shell CLI** — `gjc plugin install <name>@<marketplace> …`
(TARGETS is plural: install several in one command; `--scope user` is the default,
`--scope project` pins to a repo; `gjc plugin marketplace add <ref>` registers a
catalog; `gjc plugin list` shows installed). **Plugin management is shell-CLI only — gjc has NO `/plugin` slash command** (verified against the core slash registry + live new-user repro 2026-07-08: `gjc plugin marketplace add`/`install`/`list` all rc=0). A `/plugin …` line typed inside a `gjc` session is just a chat message, not a command, so all install/uninstall/marketplace steps must run in a terminal. The registry lives at `~/.gjc/plugins/installed_plugins.json`. (`/plugin` slash is Claude-Code syntax — do NOT put it in gjc install docs.)

## Setup / Environment

### gjc
- Install gjc, then sign in to model providers via OAuth (Claude / OpenAI Codex / Kimi — no API key needed). Model presets:
  - `gjc --mpreset claude-max` — highest quality
  - `gjc --mpreset kimi` — cheaper worker / parallel
- **API keys** (web search, Gemini, etc.) must live in a **trusted location**, NOT the project `cwd/.env` (gjc ignores cwd `.env` for credentials). Copy the template and symlink it into your gjc home:
  ```sh
  cp .env.example .env                 # then fill in keys
  ln -sf "$(pwd)/.env" ~/.gjc/.env     # run once from the repo root
  ```
  Credential precedence: live env → `~/.gjc/agent/.env` → `~/.gjc/.env` → `~/.env`.
- **Web search:** `gjc config set providers.webSearch exa` (fallback: duckduckgo). Full key list (Exa/Tavily/Gemini/…) is in [`.env.example`](./.env.example).

### Capability prerequisites (single `oh-my-gjc` suite)
- `insane-review`: ChatGPT subscription + a Chromium-family browser on CDP `:9222` logged into chatgpt.com.
- `lazycodex-gjc`: already installed and logged-in Codex CLI + compatible LazyCodex/OMO. The suite never installs or logs in to them; `workspace-write` is disabled and only read-only delegation is supported.
- `/omg:fable`: Fable 5 model access (Opus fallback on refusal/clamp).
- `adaptive-response`, `extragoal`, and the `example-plugin` template: no external prerequisites. `time-left` requires Linux, Bun >=1.3.14, its exact-lock private SDK runtime, and a live top-level GJC SDK endpoint.

## Layout

```
oh-my-gjc/
├── .claude-plugin/
│   └── marketplace.json          # catalog: every plugin is registered here
├── plugins/
│   └── <plugin>/
│       ├── .claude-plugin/plugin.json   # manifest
│       ├── commands/<file>.md           # slash commands → /<plugin>:<file>  (generic convention — see note)
│       ├── agents/<file>.md             # sub-agents
│       ├── skills/<name>/SKILL.md       # skills
│       ├── hooks/hooks.json             # hooks
│       ├── .mcp.json                    # MCP servers
│       └── tools/sdk-lab/               # read-only GJC v0.11 SDK inspection + ETA runtime source
├── README.md                     # simple human intro
└── AGENTS.md                     # this file
```

> ⚠ `commands/` is the *generic* Claude-Code convention. In THIS repo the `oh-my-gjc` suite keeps its
> command bodies in `templates/` (a non-convention dir) because GJC 0.11 marketplace commands are
> exposed under the wrong `oh-my-gjc:*` namespace; `bin/install-skill.sh` installs `/omg:*` natively.

Content is discovered by **convention directories** above; explicit paths in
`plugin.json` are optional overrides.

## Add a plugin (procedure)

1. Create `plugins/<plugin>/.claude-plugin/plugin.json`.
2. Add content in convention dirs (`skills/<name>/SKILL.md`, `agents/`, `hooks/`, `.mcp.json`). Command bodies for the `oh-my-gjc` suite go in `templates/<name>.md` (NOT `commands/` — see the Layout note); a standalone plugin may use `commands/` but then gets the `<plugin>:<name>` namespace.
3. Register it in `.claude-plugin/marketplace.json` under `plugins`:
   ```json
   { "name": "<plugin>", "source": "./plugins/<plugin>", "version": "0.1.0", "description": "…", "category": "…" }
   ```
4. Add `plugins/<plugin>/README.md` with usage, prerequisites, and safety notes.

`source` may also point off-repo: `{ "repo": "owner/repo" }`, `{ "url": "https://…" }`, or `{ "package": "npm-pkg" }`.

## Conventions agents MUST follow

- **Match the existing shape.** New manifests/commands/skills must mirror the
  existing `oh-my-gjc` / `example-plugin` structure (same `plugin.json` fields,
  YAML frontmatter on command bodies — `templates/*.md` in the suite — and `SKILL.md`). No parallel conventions.
- **Name parity.** `marketplace.json` entry `name` == `plugin.json` `name` == the
  `plugins/<name>/` directory. `source` must be `./plugins/<name>`.
- **Lowercase-hyphen names** for plugins and skills.
- **Register every new plugin** in `marketplace.json`, and keep the entry list
  formatting consistent with siblings.
  **Exception (single-suite policy, 0.8.0+):** new gjc-facing capabilities merge into
  `plugins/oh-my-gjc` (the one exposed marketplace entry) instead of adding a new entry;
  `example-plugin` stays intentionally unregistered as a copy-me template (Gate A decision).
- **Skill `description`** is the activation trigger — make it specific and include
  the phrases that should load the skill.
- **Never commit secrets.** `.env`/`.env.*` are gitignored (`!.env.example` is the
  only tracked one and MUST contain placeholders, never real keys). Runtime state
  under `.gjc/` is gitignored.
- **Document the real install paths** (verified): plugin management is the **shell CLI only** — `gjc plugin marketplace add <ref>` then `gjc plugin install <name>@<marketplace> …` (batch-capable), `gjc plugin list`. gjc has **no `/plugin` slash command** (Claude-Code syntax; a `/plugin …` line in a gjc session is just a chat message). Never write `/plugin …` in gjc install docs.

## Fork-specific policy (English fork)

- Retained skill bodies, command templates, and primary user-facing docs are written in English. Code identifiers, commands, paths, API names, exact labels, logs, and quotations are preserved verbatim — not translated or transliterated.
- The `no-english` Korean-first skill and `/omg:no-english` command are **removed**. They are added to `REMOVED_SKILLS`/`REMOVED_COMMANDS` in `bin/install-skill.sh` so upgrades from the upstream Korean version clean them up. Do not re-add them.
- Upstream-internal historical verification records under `docs/verification/` and operations tooling under `ops/gjc-bugwatch/` are retained unchanged for provenance; they are not part of the translated public skill and command surface.

## Per-plugin notes

> **Note (0.8.0 single suite):** the only plugin exposed in the marketplace is `oh-my-gjc`. The sections below are **capability-unit notes** retaining pre-consolidation plugin names. Removed capabilities remain as `(REMOVED …)` tombstone sections only. All files live under `plugins/oh-my-gjc/`.

### `codex-cli-control` (REMOVED in 0.12.0)
- Removed by upstream order (2026-07-13): the `codex-cli-ask` skill + `/omg:codex-ask` command had zero explicit invocations — local Codex traffic all goes through the product pipeline (patina/flask) `codex exec` direct connection, not through the skill. On upgrade, `install-skill.sh`'s `cleanup_removed` cleans native remnants (`omg:codex-ask.md`, skill dir). For past details/security contracts, see `skills/codex-cli-ask/SKILL.md` in git history (≤0.11.0).

### `codex-deepwork` (REMOVED in 0.11.0)
- Removed by upstream order (2026-07-12): zero real usage (aggregated across all sessions excluding self-tests) + overlap with `lazycodex`. File-write autonomy delegation was then under `/omg:lazycodex-work`, but lazycodex was also removed in 0.12.0 — now under gjc-native workflows (team/ultragoal). On upgrade, `cleanup_removed` cleans native remnants.

### `lazycodex` (REMOVED in 0.12.0)
- Removed by upstream order (2026-07-13): zero harness-originating sessions in July. File-write autonomy delegation is met by gjc-native workflows (team/ultragoal). On upgrade, `cleanup_removed` cleans native remnants (`omg:lazycodex-setup.md`, `omg:lazycodex-work.md`, skill dir). See git history (≤0.11.0) for past details.

### `lazycodex-gjc` (retained, read-only)
- `/omg:lazycodex-gjc` synchronously launches the already installed Codex+LazyCodex/OMO as an external `codex exec --ephemeral` worker. It never installs, updates, migrates, sets up, logs in, or creates a child GJC session.
- **Permission contract:** `read-only` only. `workspace-write` is fail-closed until concurrent-edit isolation is proven. The worker uses a custom no-network permission profile, blocks GJC/Codex user state, and relays no raw child stderr.
- **Observation & atomicity (2026-07 lazycodex improvement package):** an optional `--observe-log` (env `LAZYCODEX_OBSERVE_LOG`) makes the launcher — never the child — tee the redacted codex exec event stream to a new leader-owned mode-0600 log for live `gjc monitor` tailing; the first `[observe]` line names the systemd unit for `systemctl --user stop` (RuntimeMaxSec backstop unchanged). Log creation fails closed pre-spawn; runtime log failures stop only the observation. Issue #202: a completed exit-0 worker whose final output exceeds the 1 MiB relay limit yields a fixed bounded summary at exit 0 instead of discarding verified work (read-only means no workspace side effects on any path); the 8 MiB hard limit and runaway streams still abort early and fail closed.
- **Orchestration standard:** dispatch small independently verifiable pieces (~6 min measured each) instead of monoliths; visual QA belongs to the leader's own browser (static screenshots are insufficient — animation race measured; running-animation counts are not visibility evidence); an interactive worker variant stays on hold.
- **Runtime trust:** only a canonical user-scope mode-0600 SHA-256 binding may execute. Project scope alone cannot authorize the bridge. Missing Codex/systemd/Codex-home removes stale runtime state and leaves the command safely disabled.
- **Provenance:** runner, skill, and command template are all mandatory markers in `ops/verify/record_provenance.py` (upstream).

### `codex-app-control` (REMOVED in 0.11.0)
- Removed by upstream order (2026-07-12): the target Codex desktop app build track was archived on 07-03 (codex-wrapper-build), and GPT Pro review duty is handled by `insane-review` (its own engine, no codex-app dependency). On upgrade, `cleanup_removed` cleans native remnants. See git history (≤0.10.0) for past live verification recipes.

### `insane-review` (CLI pack pipeline verified; CDP path deferred)
- Command `/omg:insane-review` + a native-installable skill (`skills/insane-review/SKILL.md`). Faithful port of `fivetaku/insane-review`. gjc scopes the complete relevant file set → repomix packs it (full code, line numbers, secretlint, packed-file audit) → drives the **logged-in ChatGPT web session over CDP** → selects+**verifies** GPT-5.6 Sol Pro (fail-closed) → harvests the review to the current project's `.insane-review/response_*.md`. Zero API cost (runs on the user's ChatGPT subscription). Also a web-only `agent-council` member via `--council` (see `references/council-setup.md`).
- **Native install required — WHY (history + current):** on gjc 0.8.2 (`main` & `dev`, verified then) gjc surfaced NEITHER plugin skills NOR plugin commands as first-class: (1) the skill registry dropped non-native skills (`skills.ts`: `if (provider !== "native") return false`); (2) the marketplace slash-command provider (`discovery/claude-plugins.ts`) was never registered because `discovery/index.ts` omitted `import "./claude-plugins"`, so a plugin's `commands/*.md` were not advertised as `/<plugin>:<command>` in ANY session (proven via ACP `available_commands_update`: zero marketplace-plugin commands, only builtins + native `skill:*`). **Current state (gjc 0.9.x): plugin `commands/*.md` ARE auto-exposed — but under the wrong `<plugin>:<name>` namespace — while plugin skills still don't surface** (see the `oh-my-gjc` core section below); native install stays REQUIRED either way. `bin/install-skill.sh` copies SKILL.md into `~/.gjc/agent/skills/insane-review/` (user) or `<cwd>/.gjc/skills/` (project) and installs canonical commands from `templates/` as `~/.gjc/agent/commands/omg:<name>.md` (the filename IS the native command name; the 0.8.0-era deprecation tombstones were dropped in 0.8.1). Applies to every marketplace plugin, not just this one.
- **Engine kept byte-for-byte** (`bin/pack_and_ask.py`, Playwright-based, cross-platform). The gjc port only rewrote the shell: skill/command adapted to gjc terms + the `ask` tool onboarding, and the Claude-Code `setup/` (GitHub-star prompt + `~/.claude/settings.json` SessionStart update hook) was **dropped**. Do not reimplement the engine flow with gjc's `browser` tool — the hardened engine is more robust.
- **Path resolution:** `${CLAUDE_PLUGIN_ROOT}` is NOT substituted in gjc command/skill bodies. Each native install writes one exact private mode-`0600` suite-root binding: project `<cwd>/.gjc/runtimes/oh-my-gjc/root`, then user `~/.gjc/agent/runtimes/oh-my-gjc/root`. Asset consumers validate its single absolute canonical root and required non-symlink asset, resolve project first then user, and use the direct `plugins/oh-my-gjc/` checkout fallback only when neither binding exists. Missing or malformed binding fails closed; bootstrap, upgrade, and repair rerun hardened root `install.sh`, never a cache selection.
- **Security contract (do not weaken):** repomix secretlint forced on (a local repomix config disabling it aborts the run); fail-closed on unverified model / unattached pack / truncated prompt / timeout / empty response (no partial save); `--require-model` must accompany `--model`; output files `chmod 600`. Prompting Pro ships relevant code to an external web service — personal subscription use only (not OpenAI-endorsed).
- **Prerequisites (manual):** Python `playwright`+`pyperclip` (`--check-env --install`), Node/`npx` (repomix auto via `npx -y`), and a Chromium-family browser on CDP `:9222` with a **dedicated profile** logged into chatgpt.com + GPT-5.6 Sol Pro selected. Login can't be automated.
- Non-Goals: GPT-5.6 Sol Pro API (doesn't exist), auto-login, engine reimplementation on gjc `browser`. (Read-only local CLI Q&A capability was removed in 0.12.0.)

### `multivendor-presets` (REMOVED after v0.17.1)
- Upstream direct order (2026-07-15): use GJC default/built-in presets over custom presets. Removed the skill, `/omg:presets`, `references/presets.yml`, and the install-time `sol` auto-merge.
- Upgrade `cleanup_removed` cleans only native remnants (`skills/multivendor-presets/`, `omg:presets.md`). Existing user `models.yml` and previously merged `sol` profiles are user settings and are not auto-deleted or modified.

### `release-gate` (REMOVED after v0.17.1)
- Upstream direct order (2026-07-15): not a public plugin feature but closer to this repo's release operations rules, and verification overlapped with general test procedures and `extragoal` external review, so it was removed.
- The skill and `/omg:release` are removed, but the **Release governance** section below remains a mandatory rule for upstream. For this English fork, release governance is the standard fork PR pattern.

### Public capability prune (REMOVED after v0.17.1)
- `easy-answer`, `plain-layer`, and `branch-flow` were removed as redundant UX/policy layers; use concise direct answers and GJC native deep-interview/ralplan/team plus each repository's own `AGENTS.md`.
- The public `gjc-bugwatch` skill and `/omg:bugwatch-scan` were removed; the repository-owned collector and `ops/gjc-bugwatch/` automation remain internal operations tooling.
- Upgrade cleanup removes retired native skills/commands and retired `easy-always` marker blocks after backing up affected user files. It never modifies `models.yml`. `lazycodex-gjc` remains installed.

### `no-english` (REMOVED in this English fork)
- The `no-english` skill and `/omg:no-english` command are removed from this English fork. They are a Korean-first presentation layer (reduce unnecessary English mixing in Korean responses, prefer natural Korean) and have no meaningful equivalent in an English fork. The skill and command are added to `REMOVED_SKILLS`/`REMOVED_COMMANDS` so upgrades from the upstream Korean version clean them up. Do not re-add them.

### `oh-my-gjc` (core — absorbed my-workflows v0.3)
- **The current focused suite has 7 skills and 10 commands.** Skills: `adaptive-response`, SDK-backed `time-left`, `extragoal`, `insane-review`, read-only `lazycodex-gjc`, confirmation-gated `deep-onboarding`, and read-only `session-observer`. Commands: bare `/omg` plus `/omg:setup`, `/omg:gate`, `/omg:gate-always`, `/omg:time-left`, `/omg:fable`, `/omg:insane-review`, `/omg:lazycodex-gjc`, `/omg:deep-onboarding`, and `/omg:session-observer`. The two presentation/ETA skills never auto-activate from ordinary natural language; only their explicit commands may load them.
- **Native install is REQUIRED:** canonical command bodies remain in `templates/`; the hardened one-shot installer copies all 7 skills and 10 commands, removes the retired native `gate-briefing` directory and the `no-english` skill/command, validates the LazyCodex and session-observer runners, emits the suite-root binding, and conditionally binds both trusted runtimes. The time-left runtime is a private serialized copy installed with scripts disabled from its exact lockfile; missing Bun/package access leaves only that command fail-closed.
- **One-shot install:** root `install.sh` performs marketplace add/update → plugin install → native install. No optional plugin arguments.
- **GJC 0.11 plugin boundary:** `gajae-plugin.json` now routes a source through GJC's native bundle installer before marketplace/npm classification, but native bundles intentionally forbid top-level `skills`, `commands`, and `agents`; they may only extend the four built-in workflows/role agents with subskills, tools, hooks, MCPs, and appendices. OMG's independent trigger skills and `/omg:*` commands therefore still require `templates/` + `install-skill.sh`. The SDK and native bundle mechanism are separate and neither changes this namespace contract.
- **SDK adoption lane:** `plugins/oh-my-gjc/tools/sdk-lab` pins canonical GJC v0.11.0 source commit `8132409c3f10754fea5f3b0108a7bee979c43652` and exact `@gajae-code/bridge-client@0.11.0`. `inspect` and `time-left` have observation authority only: descriptor-bound endpoint discovery, bounded hello/session/model/goal/todo/gate/job queries, plus context summary in inspector only, and redacted summaries. Q11 is an available-skill catalog and MUST NOT be treated as active-workflow evidence; the skill always reads both canonical workflow states and selects exactly one before invoking ETA. They MUST NOT send `user_message`, `reply`, control, config, broker, transcript-body, or arbitrary query frames. ETA does not query Q03/system-prompt context. ETA is a low/medium-confidence, non-probabilistic machine-time band extrapolated from the current goal's observed todo rate, never a promised completion timestamp; human gates, paused/failed/unknown/undelivered states fail closed. The executable runtime is user-scope only and readers use a bounded shared lock around its serialized publication. Do not fork/vendor/submodule GJC for inspection; fork only for an actual upstream patch against `dev`.
- **Deep onboarding boundary:** `/omg:deep-onboarding` first analyzes the target repository read-only, then interviews one material ambiguity at a time. It previews a project map, ADR proposals, and handoff, and writes those three Markdown outputs only after the user explicitly confirms one safe output directory. A command argument is only a proposal, never confirmation; it never silently writes into the analyzed repository or overwrites existing files.
- **Adaptive response semaphore:** `/omg:gate` explicitly applies `adaptive-response` as a session-local, domain-specific presentation layer plus gate briefing; `/omg:gate-always` persists only that reconstruction procedure in its marker block inside user-global `~/.gjc/agent/SYSTEM.md`. It never auto-activates from ordinary conversation or a pending gate. It MUST NOT persist inferred persona data, scan arbitrary home/other-repo/browser/private-memory sources, infer sensitive identity traits, transfer expertise across domains, or lower correctness/safety/warnings/approval boundaries. The command backs up before mutation and preserves all bytes outside its marker. Legacy gate blocks in `AGENTS.md` migrate on command use. Installer upgrades separately remove only retired `easy-always` blocks after backup. A project `.gjc/SYSTEM.md` overrides the user file for that repository.
- **Session-observer boundary:** `/omg:session-observer --tmux omg` or `/omg:session-observer --session <id>` launches a detached tmux viewer. It tails only `$HOME/.gjc/agent/sessions/...jsonl` and emits user/assistant text plus optional thinking, never tool-call noise; JSONL is the safe default and it has no SDK dependency. Default output follows the conversation; `--mode user-only` and `--thinking` narrow or extend displayed text, while slash-command `--no-follow` is a snapshot. The observer is strictly read-only: no session injection, control, writes, network, or upstream activity, and observed text MUST NOT flow into GJC tool results. Linux, Bun, and tmux are required for the slash launcher. The direct terminal runner is token-free; the slash invocation consumes one launch turn only, then viewing remains token-free because its detached tmux window never returns observed text to GJC.
- **`extragoal` skill (English-fork policy):** ultragoal + external final review gate. Native cross-session GJC and `insane-review` are both default-ON under a fail-closed N-of-N AND gate; `/omg:fable` remains an optional third lane. Missing/malformed/refused/timeout verdicts block merge, and secret scanning is mandatory before the bundle leaves the machine.
- **⚠ Ephemeral gjc harness runs MUST disable both notifications and SDK hosting.** Every throwaway `gjc -p` verify/audit/test invocation (`/omg:fable`, external review, preset smoke, or a `/tmp` clone) MUST be prefixed with `GJC_NOTIFICATIONS=0 GJC_SDK_DISABLE=1`. In GJC 0.11 the canonical SDK v3 loopback bus publishes `.gjc/state/sdk/<id>.json` independently of managed notifications; disabling notifications alone does not suppress that endpoint. User working sessions keep both surfaces available — this rule applies only to disposable harness runs.
- Non-Goals: reimplementing gjc-native workflows (team/ultragoal/ralplan/deep-interview), vendor auto-login, or shipping custom model preset copies.

### `gjc-bugwatch` public surface (REMOVED after v0.17.1)
- The trigger skill and `/omg:bugwatch-scan` command are retired. `bin/collect.ts`, `bin/follow.ts`, their tests, and `ops/gjc-bugwatch/` remain upstream-internal operations tooling retained for provenance.

### `gajae-app` (REMOVED in 0.14.0)
- Native upgrade cleanup removes only `~/.gjc/agent/skills/gajae-app/` and `~/.gjc/agent/commands/omg:gajae-app.md`; it does not delete or modify any claudecodeui checkout, build output, data, or user service.
- Target repository and self-host documentation: [devswha/claudecodeui SELF-HOST](https://github.com/devswha/claudecodeui/blob/feat/gjc-provider/docs/SELF-HOST.md).

### `tower` (REMOVED in 0.12.0)
- Removed by upstream order (2026-07-13): the `tower` skill + `/omg:tower-setup` command were unused — the real control tower (horcrux) uses its own script implementation and does not go through this bundle's tower. The skill/command and dedicated orphan files were removed. On upgrade, `cleanup_removed` cleans native remnants. See git history (≤0.11.0) for past details.

### `example-plugin`
- Reference template: one command + one skill. Copy to bootstrap a new plugin.

## Release governance (this fork)

This fork follows the standard fork contribution pattern. The upstream's control-tower / asset-goal release governance is not carried over.

1. Work on a branch.
2. Run the verification checks below.
3. Open a PR against `main`. Review, then merge.
4. Tag a release only after the PR is merged and verified. No self-merge releases without review.

## Verification expectations

Before considering a plugin change done:
- **Static (always):** `marketplace.json` and `plugin.json` parse as JSON; convention
  files exist at expected paths; `marketplace` entry name/source match the manifest.
- **Behavioral (when the surface is reachable):** exercise the actual surface. The
  hardened root `install.sh` path (in an isolated HOME) and relevant `bun test` suites
  run anywhere; insane-review's CDP→ChatGPT harvest needs a logged-in Pro browser
  session and is otherwise deferred-environment.
- Never fake live evidence. If a surface cannot be exercised in the current
  environment, mark it pending-environment and say so explicitly.

## Schema reference

### `.claude-plugin/marketplace.json`
| field | required | notes |
|-------|----------|-------|
| `name` | yes | lowercase letters, digits, hyphens; matches the registered marketplace name |
| `owner` | yes | object; `owner.name` required |
| `metadata` | no | free-form `{ description, version, … }` |
| `plugins` | yes | array of plugin entries |
| `plugins[].name` | yes | lowercase letters, digits, hyphens |
| `plugins[].source` | yes | string starting with `./` **or** object with `path` / `repo` / `url` / `package` |
| `plugins[].version` / `.description` / `.category` | no | catalog display + pinning |

### `plugins/<name>/.claude-plugin/plugin.json`
| field | required | notes |
|-------|----------|-------|
| `name` | yes | lowercase letters, digits, hyphens |
| `version` | recommended | semver |
| `description` | recommended | shown in `/plugin` listings |
| `author` | no | `{ name, email, url }` |
| `homepage` / `repository` / `license` / `keywords` / `category` | no | metadata |
| `commands` / `agents` / `skills` / `hooks` / `mcpServers` | no | explicit paths; omit to use convention dirs |
