---
name: insane-review
description: Uses GPT-5.6 Sol Pro (web-only, no API) inside gjc (Gajae Code). When the user requests review/fix/problem/opinion, it identifies intent, precisely packs only the relevant code with repomix, sends it to the subscription ChatGPT Pro, and retrieves the analysis for reflection. Triggers — "ask GPT", "Pro model opinion", "review with another model", "GPT Pro review", "pack with repomix and send to GPT", "what does GPT think", "ask gpt pro", "second opinion", "have Pro review this". Also acts as a web-only member of agent-council.
---

# insane-review (gjc port)

**Why it exists:** GPT-5.6 Sol Pro is available **only on the web (subscription)** and has **no API.** So it cannot be called as a Codex CLI, API provider, or existing API member of agent-council. This skill is the **only path** that automates the subscription ChatGPT web via CDP to bring Pro into gjc. Zero API cost; runs on the user's plan.

The core value is not "pack everything" but **"identify intent → precisely select only the relevant targets → pack only those."** gjc (you) performing this selection is this tool's differentiator.

> **Use the bundled engine as the single implementation.** The actual packing, headless/visible-login browser lifecycle, CDP driving, model verification, turn judgment, and retrieval are performed by `bin/pack_and_ask.py` (derived from the original insane-review Playwright engine). Do not reimplement or mimic this flow with gjc's `browser` tool; preserving one hardened path keeps its fail-closed guarantees.

## Engine path resolution (`$IR`) — once before each run
`${CLAUDE_PLUGIN_ROOT}` substitution does not work in gjc command/skill bodies. Use only the exact suite root binding (`root`, mode `0600`) recorded by the native install per scope. Read the current project binding (`$PWD/.gjc/runtimes/oh-my-gjc/root`) first, then the user binding (`$HOME/.gjc/agent/runtimes/oh-my-gjc/root`) only if absent, and fall back to the exact asset in this marketplace checkout only when neither exists:
```bash
resolve_omg_asset() (
  fail() { echo "oh-my-gjc runtime binding is missing or invalid; rerun hardened install.sh." >&2; exit 1; }
  local expected_asset="$1" binding root bytes byte asset asset_dir canonical_root canonical_asset_dir
  for binding in "$PWD/.gjc/runtimes/oh-my-gjc/root" "$HOME/.gjc/agent/runtimes/oh-my-gjc/root"; do
    if [ -e "$binding" ] || [ -L "$binding" ]; then
      [ -f "$binding" ] && [ ! -L "$binding" ] || fail
      bytes="$(LC_ALL=C od -An -v -tu1 "$binding")" || fail
      for byte in $bytes; do
        case "$byte" in 0|[1-9]|1[1-9]|2[0-9]|3[01]|127) fail ;; esac
      done
      exec 3< "$binding" || fail
      IFS= read -r root <&3 || { exec 3<&-; fail; }
      if IFS= read -r -n 1 _ <&3; then exec 3<&-; fail; fi
      exec 3<&-
      case "$root" in ""|*[[:cntrl:]]*) fail ;; /*) ;; *) fail ;; esac
      canonical_root="$(cd -P -- "$root" 2>/dev/null && pwd -P)" || fail
      [ "$root" = "$canonical_root" ] || fail
      asset="$canonical_root/$expected_asset"
      asset_dir="${asset%/*}"
      canonical_asset_dir="$(cd -P -- "$asset_dir" 2>/dev/null && pwd -P)" || fail
      [ "$asset_dir" = "$canonical_asset_dir" ] && [ -f "$asset" ] && [ ! -L "$asset" ] || fail
      printf '%s\n' "$asset"
      exit 0
    fi
  done
  [ -f "plugins/oh-my-gjc/$expected_asset" ] && [ ! -L "plugins/oh-my-gjc/$expected_asset" ] || fail
  canonical_root="$(cd -P -- "plugins/oh-my-gjc" 2>/dev/null && pwd -P)" || fail
  asset="$canonical_root/$expected_asset"
  asset_dir="${asset%/*}"
  canonical_asset_dir="$(cd -P -- "$asset_dir" 2>/dev/null && pwd -P)" || fail
  [ "$asset_dir" = "$canonical_asset_dir" ] && [ -f "$asset" ] && [ ! -L "$asset" ] || fail
  printf '%s\n' "$asset"
)
IR="$(resolve_omg_asset "bin/pack_and_ask.py")" || exit 1
echo "IR=$IR"
```
A malformed, symlinked, non-canonical, multiline, control-character-containing, or asset-missing binding fails closed. Do not select a plugin cache; bootstrap, upgrade, or repair by rerunning the hardened root `install.sh`.

## Prerequisites — headless by default, visible only for login

**Command Step 0 automates this.** gjc runs `--check-env`/`--ensure-env` directly, parses the last `STATUS node=… deps=… browser=… login=… saved_browser=…`, and for each blocked step asks via the gjc **`ask` tool choices**, then gjc executes on the user's behalf (`--install`, browser launch, re-check). Beginners follow by clicking.

- **deps** (`playwright`, `pyperclip`): if missing, "auto-install now" → `--check-env --install`. (`npx`/repomix is fully automatic via `npx -y`.)
- **browser**: a Chromium-family browser runs on debug port 9222 with a **dedicated persistent profile** (isolated from the main browser; Chrome 136+ won't open CDP without one). Normal `--ensure-env`, `--launch-browser`, and review runs launch it **headless**. If no browser is saved, let the user pick from `BROWSERS …`, then run `python3 "$IR" --launch-browser "<name>"`; the choice and login cookies persist.
- **login**: if the headless login probe returns `login=no`, do not stop with an error and do not ask the user to find a hidden window. If no browser is saved, complete browser selection first; otherwise run `python3 "$IR" --launch-browser-visible ""` (the empty argument reuses the exact saved name or executable path). Tell the user that a dedicated visible ChatGPT login session is open and ask them to sign in/select GPT-5.6 Sol Pro, then wait for their "login complete" reply. After that reply, run `python3 "$IR" --launch-browser ""` to flush and restart the same profile headless, then run `--ensure-env` to verify `login=ok`. If it still reports `login=no`, offer one reopen/retry/cancel choice instead of looping. On cancel, restart headless before stopping. **Login cannot be automated.** If the visible window is not accessible from the user's graphical session, give them the same visible command to run there; never request credentials or export cookies. If `login=unknown`, retry once; if it remains unknown, offer diagnostics, headless relaunch, or cancel rather than treating it as logged out.
- **model 5.6 Sol Pro**: the script `--model pro` auto-selects and verifies (`--require-model "GPT-5.6"`). If it fails, the user sets it once manually and new chats inherit it.

## Core procedure (when you receive a review/fix/opinion request)

### 1) Identify intent
Summarize in one sentence what the user wants to ask GPT Pro. (Bug cause? Design review? Refactor direction? Verify a specific function?)

### 2) Target selection — **you (gjc) judge the complete relevant set** (the user should not have to catch omissions)
Judging "what to pack with repomix = what the complete relevant set is" is **your responsibility.** Default to **"broad and complete"**:
- **For a single module/plugin/feature review, pack that directory whole** (`--target <dir>`, `--include` omitted or broad). Packing one file drops execution directives, config, and integration context.
- For a wider scope, trace from the named files through **import/require, callers, callees (gjc `search`/`lsp references`/`lsp definition`), tests, types, and config** to close the set.
- **After packing, verify the `📦 packed N files` audit list actually contains the complete set you intended** (§3.5). Catch it before the user points it out.
- Narrow with **globs** (→ `--include "src/auth/**,*.test.ts"`).
- **Send code reviews as full code — do not use `--compress`.** Compression removes function bodies (conditions, early returns, exceptions, loops = bug-judgment evidence) and makes the review AI *imagine* the implementation (body loss → false-positive/fail-open).
- If the target is too large for context, **do not compress — narrow with `--include` to only relevant files and send full.** `--compress` is only for "large-repo *overview*" (not accuracy review).

### 3) Pack + send + retrieve — run the engine
```bash
python3 "$IR" \
  --target <repo_root> --include "<relevant file glob>" \
  --model pro --require-model "GPT-5.6" \
  --prompt "<precise question carrying intent — must include 'cite file/line/code snippet per judgment'>"
```
**Pure question (opinion) without a repo:** omit `--target` → send prompt only.
```bash
python3 "$IR" --model pro --force-answer-after 90 --prompt "<question>"
```

### 3.5) Omission audit — **verify no missing files**
Right after packing, check the output's **`📦 packed N files: ...`** list contains **all the relevant files you intended**. If any are missing, repomix dropped them — respond by cause:
- `🔒 secretlint: excluded N suspicious files` → **a file with secrets was dropped entirely** (hidden omission). If that file is under review, insert a redacted copy or use `--no-security-check` (mind external leakage).
- Default ignore/`.gitignore` dropped them → `--no-default-patterns`/`--no-gitignore`.
- Submodule files dropped (packed from parent) → run `--target` inside the submodule.
- `⚠️ pack is large (truncation)` warning → ChatGPT may truncate; narrow with `--include` or split into multiple sends.
- **No lossy flags**: `--compress`/`--remove-comments`/`--remove-empty-lines` cause content omission; do not use for reviews. Line numbers are ON by default (for citation).

### 4) Retrieve and reflect
- The response is saved to the current project's **`.insane-review/response_*.md`**, with a preview at the end of stdout. Read the full text with the gjc `read` tool.
- Read the opinion and reflect/summarize it to the user **stating explicitly that it is GPT-5.6 Sol Pro's opinion.** Present your own judgment (agree/disagree) alongside it.

## Cautions/guards (measured)

- **git submodule**: repomix excludes submodule files when run from the parent repo root. Run inside the submodule, or use `--target <submodule>` or `--no-gitignore --no-default-patterns`.
- **Compression only shrinks code files** (no effect on markdown/doc-heavy folders).
- **Do not use `--force-answer-after` for precise reviews** — it cuts Pro's reasoning mid-way and makes it answer "without fully thinking" (compounds with fail-open to store an incomplete answer as correct). Full reasoning is more accurate. The only safeguard is `--max-wait` (default 20 min, adjustable via env/`--max-wait`). force-answer is only for quick opinions, short questions, and council.
- **fail-closed**: unverified attachment / unverified model (`--require-model`) / timeout / empty response → **do not save as success; stop and retry** (do not store wrong-context or incomplete answers as reviews).
- Large content goes in as a **file attachment** (not paste). The script handles it automatically.
- On failure, retry send/retrieve with `--retries N`.
- Do not run two insane-review jobs on the **same browser** concurrently.

## Chat organization — folder-named ChatGPT project (default on)
So each run does not pile up in the general chat list, chats are organized inside a **ChatGPT project named after the current folder (+path hash)**. One project per folder keeps the general list clean.
- The folder-name → project-URL mapping is cached per-repo (`.insane-review/projects.json`) → next run goes straight to that project without touching the sidebar.
- If the project does not exist, it is auto-created; if it exists, it is reused. **If the plan does not support projects or the UI changed and it fails, fall back to general chat without a hard stop.**
- To rename, use `--project "<name>"`; to disable, `--no-project`.

## Main flags
`--target` (omit = prompt only) · `--include` (precise glob) · `--ignore` · `--compress` · `--model pro` · `--require-model "GPT-5.6"` · `--force-answer-after N` · `--max-wait N` · `--retries N` · `--style xml|markdown|plain` · `--browser <name|path>` · `--launch-browser <name>` (headless) · `--launch-browser-visible <name>` (login only) · `--list-browsers` · `--project "<name>"` · `--no-project` · `--pack-only` · `--delete-pack` · `--council`

## Using as an agent-council member
See `references/council-setup.md`. `--council` mode takes the prompt as a positional argument and **emits only the response to stdout** (progress logs go to stderr) so a council worker can capture it directly. Registering Pro as a web-only council member lets it participate in discussions with other models.

## Scope
**Does:** gjc selects the complete relevant code → repomix full-code packing (line numbers, secretlint, audit) → drives the logged-in ChatGPT web via CDP → verifies GPT-5.6 Sol Pro model (fail-closed) → retrieves, saves, and reflects the response. Web-only agent-council member.
**Does not:** call the GPT-5.6 Sol Pro API (does not exist), auto-login (user does once manually), reimplement the engine with the gjc `browser` tool, or auto-create OpenAI accounts.
