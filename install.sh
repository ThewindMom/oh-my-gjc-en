#!/usr/bin/env bash
# oh-my-gjc — one-shot installer.
#
#   curl -fsSL https://raw.githubusercontent.com/devswha/oh-my-gjc/main/install.sh | bash
#
# Installs the oh-my-gjc CORE plugin end-to-end for a new user:
#   1. register the marketplace   (gjc plugin marketplace add)
#   2. install the core plugin     (gjc plugin install oh-my-gjc@oh-my-gjc)
#   3. NATIVE install skills+commands (gjc doesn't load plugin skills/commands
#      into a session, so this copies them into ~/.gjc/agent/…)
#
# Optional plugins (space-separated) are installed the same way when passed:
#   curl -fsSL …/install.sh | bash -s -- tower insane-review
#
# Plugin management is gjc's SHELL CLI only — there is no /plugin slash command
# in a gjc session. Idempotent: safe to re-run (e.g. after a plugin upgrade).
set -euo pipefail

MARKET="devswha/oh-my-gjc"
CORE="oh-my-gjc"
CACHE="$HOME/.gjc/plugins/cache/plugins"

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v gjc >/dev/null 2>&1 || die "gjc not found on PATH. Install Gajae Code first, then re-run."

# 1) marketplace (idempotent — ignore 'already added')
say "marketplace add: $MARKET"
gjc plugin marketplace add "$MARKET" 2>&1 | tail -1 || warn "marketplace add returned non-zero (already added?) — continuing"

# native install for one installed plugin, newest cached version, plugin-scoped glob
native() { # $1=plugin
  local sh
  sh="$(ls -d "$CACHE/${MARKET##*/}___$1___"*/bin/install-skill.sh 2>/dev/null | sort -V | tail -1)"
  [ -n "$sh" ] || { warn "no install-skill.sh for '$1' (plugin without a native installer?) — skipping native step"; return 0; }
  bash "$sh" all
}

# 2)+3) core: install + native
say "install $CORE@$CORE"
gjc plugin install "$CORE@$CORE"
say "native install: $CORE"
native "$CORE"

# optional plugins passed as args
for p in "$@"; do
  [ -n "$p" ] || continue
  say "install $p@$CORE"
  gjc plugin install "$p@$CORE"
  say "native install: $p"
  native "$p"
done

cat <<'DONE'

✓ oh-my-gjc installed.
  Open a NEW gjc session (or run /move .) so the command palette rebuilds, then:
    /omg          → catalog
    /omg:setup    → finish setup (presets + optional-plugin recommendations)
  (Commands are /omg:<name>; /oh-my-gjc:<name> stays as a deprecated alias.)
DONE
