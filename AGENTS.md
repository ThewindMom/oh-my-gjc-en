# AGENTS.md — working in oh-my-gjc

Agent-facing guide for `oh-my-gjc`, a **plugin marketplace** for Gajae Code (`gjc`).
Read this before adding or editing plugins. Human-facing intro lives in [README.md](./README.md).

## What this repo is

A single git repo that catalogs installable `gjc` plugins. One `marketplace.json`
lists every plugin; each plugin is one directory under `plugins/`. The format is
compatible with the Claude Code / Codex plugin spec.

Plugins install from the **shell CLI** — `gjc plugin install <name>@<marketplace> …`
(TARGETS is plural: install several in one command; `--scope user` is the default,
`--scope project` pins to a repo; `gjc plugin marketplace add <ref>` registers a
catalog; `gjc plugin list` shows installed). Inside a running `gjc` **chat session**,
use the `/plugin` slash command instead — there, a typed shell `gjc plugin …` line is
just a message. Both routes hit the same marketplace manager / install registry
(`~/.gjc/plugins/installed_plugins.json`).

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

### Plugin prerequisites
- `codex-cli-control` / `codex-deepwork`: Codex CLI installed + signed in (`codex --version`, `codex login status`). Plugins never auto-install or auto-login.
- `codex-deepwork` (recommended): LazyCodex harness — `npx lazycodex-ai install` — adds deep-work skills/agents/verification to Codex runs. Works without it (plain `codex exec`).
- `codex-app-control`: a running, CDP-enabled Codex desktop App + an explicit `cdp_url`. v1 does not launch/build the app.
- `my-workflows` / `example-plugin`: no external prerequisites.

## Layout

```
oh-my-gjc/
├── .claude-plugin/
│   └── marketplace.json          # catalog: every plugin is registered here
├── plugins/
│   └── <plugin>/
│       ├── .claude-plugin/plugin.json   # manifest
│       ├── commands/<file>.md           # slash commands → /<plugin>:<file>
│       ├── agents/<file>.md             # sub-agents
│       ├── skills/<name>/SKILL.md       # skills
│       ├── hooks/hooks.json             # hooks
│       └── .mcp.json                    # MCP servers
├── tools/                        # repo tooling (e.g. discord-notify-bridge.ts)
├── README.md                     # simple human intro
└── AGENTS.md                     # this file
```

Content is discovered by **convention directories** above; explicit paths in
`plugin.json` are optional overrides.

## Add a plugin (procedure)

1. Create `plugins/<plugin>/.claude-plugin/plugin.json`.
2. Add content in convention dirs (`commands/`, `skills/<name>/SKILL.md`, `agents/`, `hooks/`, `.mcp.json`).
3. Register it in `.claude-plugin/marketplace.json` under `plugins`:
   ```json
   { "name": "<plugin>", "source": "./plugins/<plugin>", "version": "0.1.0", "description": "…", "category": "…" }
   ```
4. Add `plugins/<plugin>/README.md` with usage, prerequisites, and safety notes.

`source` may also point off-repo: `{ "repo": "owner/repo" }`, `{ "url": "https://…" }`, or `{ "package": "npm-pkg" }`.

## Conventions agents MUST follow

- **Match the existing shape.** New manifests/commands/skills must mirror the
  existing `my-workflows` / `example-plugin` structure (same `plugin.json` fields,
  YAML frontmatter on `commands/*.md` and `SKILL.md`). No parallel conventions.
- **Name parity.** `marketplace.json` entry `name` == `plugin.json` `name` == the
  `plugins/<name>/` directory. `source` must be `./plugins/<name>`.
- **Lowercase-hyphen names** for plugins and skills.
- **Register every new plugin** in `marketplace.json`, and keep the entry list
  formatting consistent with siblings.
- **Skill `description`** is the activation trigger — make it specific and include
  the phrases that should load the skill.
- **Never commit secrets.** `.env`/`.env.*` are gitignored (`!.env.example` is the
  only tracked one and MUST contain placeholders, never real keys). Runtime state
  under `.gjc/` is gitignored.
- **Document the real install paths** (verified): shell `gjc plugin install <name>@<marketplace> …` (batch-capable) and the in-chat `/plugin` slash command. Don't claim the shell CLI is unavailable.

## Per-plugin notes

### `codex-cli-control` (working)
- Skill `codex-cli-ask` + command `/codex-cli-control:ask`. gjc runs
  `codex exec --sandbox <mode> --skip-git-repo-check --ephemeral -o <file> -` and
  returns the `-o` last-message.
- **Security contract (do not weaken):** `prompt` is passed via env → **stdin only**
  (never in argv); `sandbox` validated against the exact enum (default `read-only`);
  `timeout_s` positive int ≤ 600; `model` matches `^[A-Za-z0-9._/-]+$`; `cwd` must be
  an existing dir; unknown args rejected; `--dangerously-bypass-*` / `danger-full-access`
  never auto-derived. Prompting Codex is a privileged action (it can touch files/shell/creds).
- Non-Goals: App/CDP GUI control, multi-turn sessions, MCP, codex auto-login/install.
- Read-only Q&A only; for autonomous file-writing work see `codex-deepwork`.

### `codex-deepwork` (working)
- Skill `codex-deepwork` + command `/codex-deepwork:run`. gjc delegates an autonomous
  coding task: `codex exec --sandbox workspace-write --skip-git-repo-check -C <cwd> -o <file> -`
  (task via stdin), returns the final message **plus a "review changes (git diff)" reminder**.
- **Writes files.** Default `sandbox=workspace-write`. Run in a git repo; never auto-commit/push.
- Auto-leverages the **LazyCodex** harness in `~/.codex` (deep-work skills/agents/verification) when
  installed (`npx lazycodex-ai install`); no extra flags. Works without it (plain `codex exec`).
- **Security contract (do not weaken):** same as `codex-cli-control` but task via stdin and
  `timeout_s` ≤ 3600; `cwd` must be an existing dir; `--dangerously-bypass-*` / `danger-full-access`
  never auto-derived.
- Non-Goals: read-only Q&A (→ `codex-cli-control`), App/CDP (→ `codex-app-control`), lazycodex
  auto-install, multi-session orchestration, auto-commit/push.

### `lazycodex` (working)
- Commands: `/lazycodex:setup [doctor|install|update|uninstall]` (manage the OmO Codex Light harness in `~/.codex` via `npx lazycodex-ai`) + `/lazycodex:work` (run a plan→work→verify *ultrawork* task via `codex exec`).
- **Setup mutates `~/.codex`** (skills/hooks/agents/config) + uses npm/network. Check `lazycodex doctor` first; never reinstall a healthy install or uninstall without explicit user request; no auto-login.
- `:work` writes files (default `workspace-write`); same injection-safe contract as `codex-deepwork` (task via stdin, enum sandbox, `timeout_s` ≤ 3600, cwd dir, unknown-arg reject, no bypass derivation).
- Verified here: `lazycodex doctor` = System OK (omo 4.11.0); `codex exec` auto-engages `omo:programming` + verification gates.
- Non-Goals: codex/lazycodex auto-login, App/CDP (→ `codex-app-control`), read-only Q&A (→ `codex-cli-control`), opencode (Ultimate) edition.

### `codex-app-control` (live-verified)
- Two skills: `codex-app-launch` (command `/codex-app-control:launch`) and `codex-app-cdp` (command `/codex-app-control:ask`).
- `codex-app-launch`: starts an **already-built** Linux Codex App wrapper headlessly (xvfb) with `--remote-debugging-port` (CDP) enabled, idempotently reuses a live endpoint, polls `/json/version` until ready, returns `cdp_url`; also `status`/`stop`. Does **not** build the wrapper from the DMG.
- `codex-app-cdp`: attaches gjc's `browser` tool to a running Codex App via an explicit `cdp_url`, sends one prompt, reads the latest completed response (hybrid turn-completion detection). Attach-only; pair it with `launch` (or an app you started yourself).
- **Live-verified:** wrapper built from OpenAI DMG → headless launch (CDP `:9222`, webview `:5175`, Codex `26.623.70822`) → attach → `.ProseMirror` input → Enter → completion detect → read `[data-local-conversation-final-assistant]`. Confirmed selectors/recipe live in `skills/*/SKILL.md`.
- Injection-safe arg contract (launch): `action` enum, integer port range, `screen` regex, existing-file check, reject unknown args, no auto-derived Electron flags.
- Same privileged-action safety stance as above.

### `my-workflows`
- `easy-answer` skill (rephrase final answers in plain language) + `/my-workflows:easy [on|off]` toggle.

### `example-plugin`
- Reference template: one command + one skill. Copy to bootstrap a new plugin.

## Verification expectations

Before considering a plugin change done:
- **Static (always):** `marketplace.json` and `plugin.json` parse as JSON; convention
  files exist at expected paths; `marketplace` entry name/source match the manifest.
- **Behavioral (when the surface is reachable):** exercise the actual surface. The
  CLI path (`codex exec`) is testable wherever the Codex CLI is installed/logged in;
  the App/CDP path needs a running CDP-enabled Codex App and is otherwise deferred.
- Never fake live evidence. If a surface cannot be exercised in the current
  environment, mark it pending-environment and say so explicitly.

## Tools

`tools/discord-notify-bridge.ts` — forwards a live gjc session's notifications
(action-needed / idle / resolved) to a Discord channel via an incoming webhook.
Client of gjc's Notifications SDK (loopback WS at
`.gjc/state/notifications/<sessionId>.json`). Notify-only (a webhook can't reply).
Secrets read from `$DISCORD_WEBHOOK_URL` or `.gjc/secrets/discord-webhook`, never
logged. Tests: `bun test tools/test/e2e-bridge.test.ts`.

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
