---
description: Adversarially audits safety-critical code with Fable 5 — invariant breaking, concurrent-failure scenarios, fail-open path discovery. Read-only; reports severity + file:line + reproduction. Top findings' key citations are cross-checked against real code before briefing.
argument-hint: "[audit target hint: module/directory/concern]  (e.g. 'order path and stop-loss logic')"
---

# /omg:fable

Audits the safety invariants of money/data/security-critical code with a **Fable 5 adversarial audit**.
This is not architecture review (boundaries/design) but **invariant breaking** — asking "is there a scenario where these safety mechanisms fail **simultaneously**?" Verified track record: found a CRITICAL-grade defect missed by an 8-stage 3-vendor consensus plan in a single pass (2026-07, magi-stock).

Input argument: `$ARGUMENTS` — audit target hint. If empty, define scope in Step 1.

## Absolute rules

- **Read-only.** The audit process creates no files and modifies nothing except saving one report file. Do not touch daemons, environment, DB, or external services.
- **No forced defects + also report robustness.** If there are no findings, say so. Require a list of "attempted-to-break but was robust" items — this is the report's credibility indicator.
- **No relaying without spot-check.** Cross-check the top 2–3 findings' cited file:line against real code with `read` before briefing the user.

## Step 1 — confirm scope (3–6 files)

From `$ARGUMENTS` and the repository structure, identify **3–6 safety-critical files**: execution boundaries (order/payment/delete/send), guards (stop/lock/gate/validation), and state ledgers. More than 6 makes the audit shallow — split and run multiple times. If scope is unclear, present candidates to the user and have them pick one.

## Step 2 — write the audit prompt (`/tmp/fable-prompt-<repo>.md`)

Fill the skeleton below for the target (proven template — keep the structure).

**⚠ Framing rule (mandatory for public/web/network targets):** targets whose audit items are inherently attack scenarios (public endpoints, auth, rate-limit, key/secret handling, SSRF surface) MUST be written from a **defender/code-review perspective** — not "can an attacker do X" but "does this code prevent failure mode X." Attacker framing trips the auditor model's cyber-misuse filter and is blocked as a refusal (error) at the input stage (measured 2026-07: patina public-service audit). Internal safety mechanisms (trading stops, etc.) do not have this issue, but defender framing is safe for any target, so use it as the default. Examples:
- ❌ "Can SSRF exfiltrate keys to an internal address?" → ✅ "Is the forwarding destination a fixed allowlist, or does user input decide the destination?"
- ❌ "Can rate-limit bypass cause infinite burn?" → ✅ "Does the rate-limit identifier depend on an untrusted header, or is the streaming path omitted from accounting?"

```markdown
You are an adversarial reviewer auditing the safety invariants of <one-line system description>.
**Read-only** — do not modify or create files (except saving the final report once), do not access <risk resources>.

## Audit targets (real code in this repository)
1. <file> — <safety contract of that file>
... (3–6)

## Questions (each with code evidence)
- Are there scenarios where these safety mechanisms fail **simultaneously**?
- Is fail-closed actually fail-closed — find paths that silently fail-open
  (empty catch, default fallback, type coercion, silent skip).
- <1–2 domain-specific questions: order dependency, concurrency window, boundary contamination, etc.>
- Implicit assumptions that break when planned changes (<if any>) land on top.
- Each finding: severity (CRITICAL/HIGH/MEDIUM/LOW) + file:line + reproduction scenario + fix direction.

No forced defects — if none, say so. Report a list of "attempted-to-break but was robust" as a
separate section. Try to break, not confirm happy paths.

Save the final report to `/tmp/fable-audit-<repo>.md` and output only the per-severity counts and
a 3-line summary of the top findings.
```

## Step 3 — execute (background)

```bash
cd <target repo> && GJC_NOTIFICATIONS=0 GJC_SDK_DISABLE=1 gjc -p @/tmp/fable-prompt-<repo>.md \
  --model "anthropic/claude-fable-5:xhigh" --no-session \
  > /tmp/fable-stdout-<repo>.txt 2>&1
```

- ⚠ No `:max` — Fable is silently clamped to xhigh.
- ⚠ Fable refusals come in two kinds: (a) **input-stage pre-block** — if the prompt trips the cyber-misuse filter, it fails loudly as an error before running (prevent with the Step 2 framing rule). (b) **output-stage refusal** — a short response silently with HTTP 200 + stop_reason. If either occurs, or Fable halts or credits run out, fall back to `anthropic/claude-opus-4-8:xhigh` (one quality tier lower, still valid).
- Cost note: with no subscription free tier, a pass costs roughly $5–20 in credits (varies by file count and exploration). Small compared to one CRITICAL in a real-money system.
- Takes minutes to tens of minutes. Run in the background and continue other work.

## Step 4 — spot-check (mandatory)

Open the file:line cited in the top 2–3 CRITICAL/HIGH findings of the report directly with `read` and confirm the claim matches the real code. If any mismatch appears, exclude that finding and mark it as "verification failed" in the briefing.

## Step 5 — briefing (adaptive-response style)

If `/omg:gate` calibration is on in the current session or there is user-level evidence, match the adaptive-response temporary persona; otherwise use an `unknown` neutral level. ① one-line conclusion → ② the top 2–3 risky items in detail (for beginners, everyday-language impact; for practitioners/experts, contracts, boundary conditions, evidence) → ③ 1–2 next actions (copy-paste-ready clarifying questions / plan-feeding directives) → ④ the full report path.
If there are more CRITICAL/HIGH beyond the top 2–3, also present the rest as a concise complete list with file:line and spot-check/verification status. Regardless of level, do not omit CRITICAL/HIGH, safety boundaries, or verification failures. Do not execute approval or fixes — recommend feeding findings into an existing workflow (ralplan revision, etc.).
