---
description: Sends code/questions packed with repomix to GPT-5.6 Sol Pro (web-only) and retrieves an opinion. gjc judges the relevant file selection; the bundled engine (pack_and_ask.py) does the actual driving.
argument-hint: "<review target/question>  e.g. review the auth flow in src/auth"
---

# /omg:insane-review

Sends the user's request (`$ARGUMENTS`) to GPT-5.6 Sol Pro (subscription web) and retrieves analysis/opinion for reflection.
For the detailed procedure and guards, `skills/insane-review/SKILL.md` is the execution directive (reference with gjc `read`).

> **Principle: never make the user type CLI.** If the environment is not ready, gjc detects with `--check-env`/`--ensure-env`,
> asks necessary decisions via the gjc **`ask` tool choices**, and gjc executes on the user's behalf. Beginners should be able to follow by clicking.

> **Auto-activating skill included.** Installing the single suite with the hardened `install.sh` also installs the
> `insane-review` skill natively alongside this command — it also fires from natural-language triggers like "ask GPT."

## Step 0 — resolve the engine path (`$IR`)
`${CLAUDE_PLUGIN_ROOT}` is not substituted in gjc command bodies. Use only the exact suite root binding recorded by the native install. Prefer the project binding, then the user binding, and fall back to the exact asset in the current checkout only when both are absent:
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
A malformed, symlinked, non-canonical, multiline, control-character-containing, or asset-missing binding stops here; rerun hardened `install.sh` rather than selecting a cache.

## Step 0.5 — environment onboarding (browser, login; choice-based, only blocked steps)

First gjc runs directly (do not make the user do it):
```bash
python3 "$IR" --ensure-env
```
`--ensure-env` **silently auto-launches once if a saved browser exists and CDP is down**, then reports status (saved-value-only, no first-detection fallback; if `browser=wrong`, no auto-launch). **So after the first onboarding, it no longer asks about the browser and launches it automatically.**
Parse the last line `STATUS node=… deps=… browser=… login=… saved_browser=…`. **If not all ok**, ask the first blocked step via the gjc `ask` tool → gjc executes per the choice → re-run `--ensure-env` to recheck (repeat up to 3–4 times).
Write questions and choices in **the user's current conversation language**.

- **`deps=missing`** → `ask` (header `Dependencies`):
  - "Auto-install now (recommended)" → gjc runs `python3 "$IR" --check-env --install`
  - "I'll install it myself" → only guide `pip install playwright pyperclip`
  - "Cancel"
- **`browser=down`** — this is the state **after** `--ensure-env` already tried the saved-value auto-launch. Branch on `saved_browser`:
  - **`saved_browser=<name>` but still down** (saved-browser auto-launch failed — usually profile lock/app moved) → `ask` (header `Browser`):
    ["Retry"(→ re-call `--ensure-env`) / "Switch to another browser"(→ detection branch below) / "Cancel"]. **Only ask here.**
  - **`saved_browser=none`** (first time) → ask once via the detection branch below and launch with `python3 "$IR" --launch-browser "<name>"` (choice **auto-saved → no-question auto-launch from next run**).

  To launch a browser, use `python3 "$IR" --launch-browser "<name>"` (cross-platform, dedicated profile, choice auto-saved), not `open -a`.
  **It always runs with a dedicated profile, so the user's main browser session is untouched.** Branch on the `BROWSERS` list of `python3 "$IR" --list-browsers`:
  - **2 or more detected** → `ask` (header `Browser`): each browser as a choice. Annotate the estimated main browser with "likely main — prefer another if possible." Select → `--launch-browser "<name>"` → re-check.
  - **exactly 1 detected** → `ask` (header `Browser`):
    - "Install one dedicated browser (recommended)" → guide installing a light Chromium (Chrome/Brave, etc.) for automation only → `--launch-browser`.
    - "Proceed with an isolated profile of this browser now" → `--launch-browser "<that name>"`. Dedicated profile isolates from main, but note: "same app 2 windows — do not accidentally touch the automation window."
    - "Cancel"
  - **0 detected** → `ask` (header `Browser`): "No Chromium-family browser found — install one?" → ["Guide Chrome install"/"Cancel"]
- **`browser=wrong`** (port occupied) → `ask` (header `Port conflict`): "Another process is using 9222. Stop it and relaunch the dedicated browser?" → ["Relaunch"(guide killing the occupying process, then `--launch-browser`)/"Cancel"]
- **`login=no`** → `ask` (header `Login`): "In the **dedicated browser window** just launched, finish **chatgpt.com login + select GPT-5.6 Sol Pro**. (Dedicated profile, so this login persists.)"
  → ["Login complete — continue"(→ `--ensure-env` recheck) / "Cancel"]
- **`node=missing`** → `ask` (header `Node`): "Node.js is required (used for repomix auto-install). Help you install it?" → ["Install with package manager"/"I'll install it myself"/"Cancel"]

When `STATUS … login=ok`, go to Step 1. If the user picks "Cancel", stop and tell them in one line what remains.

## Step 1+ — run the review

1. **Identify intent** — from `$ARGUMENTS` (or the immediately preceding conversation context), determine the core question to ask GPT Pro in one sentence.
   If the target/scope is ambiguous, offer choices via the gjc `ask` tool (no typing required). e.g. header `Review target`, options = candidate directories + "whole project" + "question only (no code)".
2. **Select target (the complete set is your judgment)** — for code, pack the **module/directory whole** that is directly relevant to the intent (`--target <dir>`, full code). For a wider scope, close the set through imports, callers, tests, and config (gjc `search`/`lsp`). **No `--compress`** (body loss). Omit for pure questions.
3. **Execute** (accuracy review = full code + model verification):
   ```bash
   python3 "$IR" \
     --target <repo_or_dir> --include "<relevant file glob or omit=all>" \
     --model pro --require-model "GPT-5.6" \
     --prompt "<question carrying intent — force citing file:line/code snippet per judgment>"
   ```
   - If response time is fine, leave as-is (full reasoning). To bound time, use `--force-answer-after <seconds>`. Usually off for standalone review, on with a cap for council.
4. **Confirm completeness** — verify the output's `📦 packed N files` contains the complete intended set (if missing, fix per SKILL §3.5).
5. **Retrieve and reflect** — read the current project's **`.insane-review/response_*.md`** with gjc `read`, reflect it **stating explicitly it is GPT-5.6 Sol Pro's opinion**, and add your own judgment (agree/disagree).

> **Chat organization (default on):** each run is organized inside a **ChatGPT project named after the current folder** instead of the general chat list (one per folder, cache reuse, auto-create, general-chat fallback on failure). Rename with `--project "<name>"`, disable with `--no-project`.

> **Safety:** this command automates a logged-in ChatGPT web session and sends relevant code to an external service (ChatGPT). Secrets are filtered out by repomix secretlint by default; unverified attachment/model and incomplete responses are fail-closed (not saved). Web UI automation is not OpenAI-ToS-backed — use **for personal subscription purposes only**.
