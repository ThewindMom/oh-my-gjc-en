# Install oh-my-gjc (agent instructions)

**Human:** paste this one line into any coding agent (gjc, Claude Code, Codex, …):

> Install oh-my-gjc by following https://raw.githubusercontent.com/devswha/oh-my-gjc/main/INSTALLATION.md — run the steps, verify, and report.

**Agent:** you are installing the **oh-my-gjc** plugin suite for Gajae Code (`gjc`).
Do exactly the following in a terminal. Do not improvise other steps.

## Preconditions
- `gjc` must be on PATH (`command -v gjc`). If missing, stop and tell the human to install Gajae Code first.
- Plugin management is gjc's **shell CLI only**. There is **no `/plugin` slash command** in a gjc session — never type `/plugin …`; run `gjc plugin …` in a terminal.

## Fastest path (one shot)
```sh
curl -fsSL https://raw.githubusercontent.com/devswha/oh-my-gjc/main/install.sh | bash
# optional plugins too, e.g.:
# curl -fsSL https://raw.githubusercontent.com/devswha/oh-my-gjc/main/install.sh | bash -s -- tower insane-review
```

## Manual path (equivalent, if curl|bash is disallowed)
```sh
gjc plugin marketplace add devswha/oh-my-gjc
gjc plugin install oh-my-gjc@oh-my-gjc
# NATIVE install — gjc does NOT load plugin skills/commands into a session, so copy them in.
# Plugin-scoped glob (cache is <marketplace>___<plugin>___<ver>; a bare *oh-my-gjc* glob hits every plugin), newest version:
bash "$(ls -d ~/.gjc/plugins/cache/plugins/oh-my-gjc___oh-my-gjc___*/bin/install-skill.sh 2>/dev/null | sort -V | tail -1)" all
```

For an optional plugin, repeat install + native with its name (order-independent — each native line targets its own `oh-my-gjc___<plugin>___*` folder):
```sh
gjc plugin install tower@oh-my-gjc
bash "$(ls -d ~/.gjc/plugins/cache/plugins/oh-my-gjc___tower___*/bin/install-skill.sh 2>/dev/null | sort -V | tail -1)" all
```

## Verify (report these)
```sh
gjc plugin list                                   # oh-my-gjc@oh-my-gjc listed
ls ~/.gjc/agent/skills/                            # easy-answer, multivendor-presets, branch-flow, extragoal, gate-briefing
ls ~/.gjc/agent/commands/ | grep '^omg'            # omg.md + omg:<name>.md present
```

## Finish
Tell the human: open a **new** gjc session (or `/move .`) so the command palette rebuilds, then run `/omg` for the catalog and `/omg:setup` to finish (presets + optional-plugin recommendations). Commands are `/omg:<name>`; `/oh-my-gjc:<name>` is a deprecated alias.

## Safety
Idempotent — re-running only re-copies. This installs a documented plugin suite; it does not send code anywhere or change model/provider credentials. Optional plugins (`tower`, `insane-review`, `codex-*`, …) are installed only if the human names them.
