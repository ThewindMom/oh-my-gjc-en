# oh-my-gjc

A plugin marketplace for [Gajae Code (`gjc`)](https://github.com/devswha) — bundle
slash commands, skills, sub-agents, hooks, and MCP servers as installable plugins.

Compatible with the Claude Code / Codex plugin spec, so the same repo works for
`gjc`, Claude Code, and Codex.

## Install

Plugins install from the **shell CLI** (`gjc plugin …`) or, inside a running `gjc`
chat, the **`/plugin`** slash command. Installs are **user-scoped by default →
available in every project on this machine** (`--scope project` pins to one repo).

Add the marketplace once, then install — several plugins in **one command**:

```sh
gjc plugin marketplace add devswha/oh-my-gjc    # or a local checkout: gjc plugin marketplace add ./
gjc plugin install codex-cli-control@oh-my-gjc codex-deepwork@oh-my-gjc codex-app-control@oh-my-gjc lazycodex@oh-my-gjc my-workflows@oh-my-gjc
gjc plugin list                                 # verify
```

Inside a gjc **chat session**, use the slash-command equivalent (typing a shell
command in chat is just a message — use `/plugin` there):

```
/plugin marketplace add devswha/oh-my-gjc
/plugin install <plugin>@oh-my-gjc
```

**Setup** (gjc keys, model presets, plugin prerequisites): see [AGENTS.md → Setup / Environment](./AGENTS.md#setup--environment) and [`.env.example`](./.env.example).

## Plugins

| Plugin | What it does |
|--------|--------------|
| `my-workflows` | Handy workflow skills — `easy-answer` (plain-language answers) + `/my-workflows:easy` toggle |
| `codex-cli-control` | gjc drives the local **Codex CLI** (`codex exec`): one prompt → final answer. No App/CDP needed. Sandbox defaults to `read-only`. |
| `codex-deepwork` | gjc delegates an **autonomous, file-writing** task to Codex (`codex exec`, write sandbox). Auto-uses the **LazyCodex** harness when installed. |
| `lazycodex` | Install/manage the **LazyCodex** deep-work harness in Codex (`npx lazycodex-ai`) + run `ultrawork` (plan→work→verify) tasks through it |
| `codex-app-control` | gjc controls the **Codex desktop App GUI** over CDP — `launch` starts the headless app (xvfb) with remote debugging, then `ask` attaches and drives it (one prompt → latest response) |
| `example-plugin` | Starter template — copy it to build your own |

Quick start after installing:

```
/my-workflows:easy
/codex-cli-control:ask prompt="reply with PONG"
```

The `codex-*` plugins include detailed docs at `plugins/<name>/README.md`.

## Build your own / contribute

See **[AGENTS.md](./AGENTS.md)** for the plugin format, schema, conventions, and
per-plugin notes (also used by AI agents working in this repo).

## License

MIT — see [LICENSE](./LICENSE).
