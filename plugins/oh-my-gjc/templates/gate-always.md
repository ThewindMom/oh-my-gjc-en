---
description: Applies or removes adaptive-response's evidence-based response calibration and approval-gate briefing as the user-global default. Inserts or removes a static procedure block in ~/.gjc/agent/SYSTEM.md; sessions where a project SYSTEM.md takes precedence are not affected.
argument-hint: "[on|off|status]  (default: on)"
---

# /omg:gate-always

`/omg:gate` applies **only to this session**, but this command inserts a static procedure block into `~/.gjc/agent/SYSTEM.md` — the **user-global customization file** that gjc injects into the system prompt every turn — so that response-level calibration and approval-gate briefing apply by default in new sessions where a project `.gjc/SYSTEM.md` does not take precedence.
The presence of the marker block is the on/off semaphore.

> **Why SYSTEM.md:** `SYSTEM.md` is gjc's dedicated user-global system-prompt customization surface, and if a project `.gjc/SYSTEM.md` exists, the project file takes precedence. Older versions used `AGENTS.md`, so the migration rules below clean up duplicate blocks.

Input argument: `$ARGUMENTS` → empty or `on`=turn on, `off`=turn off, `status`=status only.

## Managed block (fixed delimiters)

Only the section between the two markers below inside `~/.gjc/agent/SYSTEM.md` is owned by this command. On turn-on, insert or replace this block with the latest content; on turn-off, remove only this block. **Never touch any other content outside the markers.** SYSTEM.md is a file shared with other user customizations.

> Legacy migration (`~/.gjc/agent/AGENTS.md`):
> ① old `<!-- BEGIN my-workflows:gate-always -->` block,
> ② `<!-- BEGIN oh-my-gjc:gate-always -->` block from v0.3.0 and below.
> Check both locations on any on/off action. On `on`, write the latest block to SYSTEM.md and back up then remove duplicate blocks in AGENTS.md; on `off`, remove both.

```
<!-- BEGIN oh-my-gjc:gate-always -->
## Response-level calibration + approval-gate briefing always-on (gate-always)

### Pre-response temporary persona

For every GJC skill and general response, before writing the response, build a **current-domain-only temporary working card** about the user.

- Fields: domain proficiency (beginner/practitioner/expert/unknown + evidence and confidence), technical depth, explanation density, decision-making role, language and format preferences, user-stated risk appetite.
- Evidence: only the user's direct utterances and corrections in the current session, role information in repositories already being read for the current task, and files the user explicitly told you to read as persona evidence.
- The terminology and question scope of the current request is a weak signal. Never determine any proficiency level from it alone; use it only as supporting evidence when it agrees with a direct user statement or other evidence from the same current domain.
- Forbidden: do not explore stored session transcripts, home, other repositories, browser, credentials, or GJC private memory for persona purposes. Do not infer sensitive or identity traits. Do not save inferred persona data to files.
- If information is insufficient, keep `unknown`. Do not fix a level from typos, short sentences, or proficiency in another domain.
- For beginners, prioritize conclusions, terminology glossing, and concrete examples; for practitioners, contracts, flows, trade-offs, and recovery; for experts, invariants, boundary conditions, evidence, and residual risks. Unknown is summary-first neutral.
- The latest user explicit instruction wins; recalibrate immediately when new evidence or corrections appear.
- Do not output the card by default. Show it briefly with evidence only when the user asks how calibration was done.
- What you calibrate is expression order, terminology density, examples, and detail level only. Correctness, safety mechanisms, warnings, verification, real-environment boundaries, and approval authority are all maintained.

### Approval-gate 4-part briefing

Whenever you present an approval gate (ralplan pending-approval, ultragoal approval, plan/execution approval request) to the user, **always** also output the following 4-part briefing tailored to the temporary persona.

1. **Level-matched translation** — the plan's conclusion, reasoning, and sequence in 5 sentences or fewer. For beginner/unknown, gloss terms; for practitioner/expert, do not repeat confirmed basics and present contracts, boundaries, and trade-offs directly.
2. **Approval boundaries** — what you are approving now / what you are not approving (especially whether real-environment/production contact begins, and whether later steps have additional approval gates).
3. **Domain-agnostic checklist** (actually read the plan original text, with evidence locations):
   rollback path / real-environment contact timing and additional gates / observable success·failure metrics /
   whether numbers are fixed now or derived from evidence / whether existing safety mechanisms are weakened /
   critic·architect verdict original text. If absent from the original text, do not fabricate —
   mark "not specified — confirm before approval."
4. **Verdict** — approve/hold/reject recommendation + 1–3 pre-approval question candidates.
   If 2 or more "not specified" rows appear, the recommendation is automatically "hold."

Correctness > personalization > ease. Do not execute approve/reject on the user's behalf — the decision is the user's.
Do not add or store inferred persona data in this block or any separate artifact. This block contains only the static calibration procedure that reconstructs the persona on each response.

Turn off: `/omg:gate-always off`
<!-- END oh-my-gjc:gate-always -->
```

## Processing rules

### Ownership and pre-validation
- `~/.gjc/agent/SYSTEM.md`: owns only the one current `oh-my-gjc:gate-always` block.
- `~/.gjc/agent/AGENTS.md`: owns only the legacy `my-workflows:gate-always` and `oh-my-gjc:gate-always` blocks for migration purposes.
- **Never modify** a project `.gjc/SYSTEM.md`. If it exists, only warn that it overrides the user-global block.
- For status/on/off, before mutation, validate that each owned marker's BEGIN/END appears 0 or 1 time each, that BEGIN precedes END, and that blocks are not nested. If any orphan, duplicate, reversed, or cross-nested marker is found, output `Response calibration + gate briefing always-on: marker corruption — mutation stopped` with the filename and modify no file.

### `status`
- If a complete current block is present in a validated SYSTEM.md, output `Response calibration + gate briefing always-on: on`; otherwise output `Response calibration + gate briefing always-on: off`.
- If a validated legacy block is present in AGENTS.md, append `Note: legacy duplicate block in AGENTS.md — recommend migrating with on`.

### `on` (default)
1. After passing pre-validation, if SYSTEM.md does not exist, create it as an empty file.
2. Back up each existing file to be modified first to a unique mode-preserving `.bak-<timestamp>-<random>` file. The backup only clones existing file bytes and does not add inferred persona data.
3. Replace the current block in SYSTEM.md with the latest block above, or append it to the end of the file if absent.
4. Remove only the validated legacy blocks in AGENTS.md.
5. Write to a unique temp plain file in the same directory, preserve the original mode, then atomically replace. If any of temp file, backup, or replace fails, preserve the original and report the failure.
6. Preserve bytes outside the markers verbatim.
7. Output `Response calibration + gate briefing always-on: on (~/.gjc/agent/SYSTEM.md, applies from new sessions)`, and suggest `/omg:gate on` for this session. If a project `.gjc/SYSTEM.md` exists, only warn.

### `off`
1. After passing pre-validation, if no owned block exists anywhere, output `Response calibration + gate briefing always-on: already off`.
2. After backing up files as above, remove only the current block in SYSTEM.md and the legacy blocks in AGENTS.md.
3. Apply the same atomic-replace, mode-preserve, and outside-marker byte-preserve rules as `on`.
4. Output `Response calibration + gate briefing always-on: off`.

### Other arguments
Show one-line usage only: `/omg:gate-always [on|off|status]`.
