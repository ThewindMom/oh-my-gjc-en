---
description: Turns adaptive-response's evidence-based response calibration and approval-gate briefing on or off for the current session. Empty or 'on' turns it on; 'off' turns it off.
argument-hint: "[on|off]"
---

The user toggled adaptive-response calibration + approval-gate briefing for the current session.

Input argument: $ARGUMENTS

Processing rules:

- If the argument is empty or `on` → **turn on**:
  From now until the user runs `/omg:gate off`, apply the following temporary response persona procedure to **all GJC skills and general responses** in this session.
  - Use only the user's direct utterances and corrections in the current session, role information already being read for the task, and files the user explicitly told you to read as persona evidence.
  - The terminology and question scope of the current request is a weak signal. Never determine any proficiency level from it alone; use it only as supporting evidence when it agrees with a direct user statement or other evidence from the same current domain.
  - Build a temporary card before each response: current domain proficiency / technical depth / explanation density / decision-making role / language and format / stated risk appetite. If unclear, use `unknown`; the latest user instruction wins.
  - Do not explore stored session transcripts, home, other repositories, browser, credentials, or private memory for persona purposes; do not infer sensitive traits. Do not save inferred persona data to files.
  - For beginners, prioritize conclusions, terminology glossing, and concrete examples; for practitioners, contracts, flows, and trade-offs; for experts, invariants, boundary conditions, and evidence. Unknown is summary-first neutral.
  - Calibrate expression only. Correctness, safety mechanisms, warnings, verification, real-environment boundaries, and approval authority are all maintained.

  Additionally, whenever you present an **approval gate** (pending-approval, plan/execution approval request), also output the adaptive-response skill's 4-part gate briefing:
  1. Level-matched translation (conclusion, reasoning, sequence, within 5 sentences)
  2. Approval boundaries (what you are approving / what you are not approving)
  3. Domain-agnostic checklist (plan original-text evidence required; if absent, "not specified — confirm before approval")
  4. Verdict (approve/hold/reject recommendation + pre-approval question candidates)
  - Actually read the plan original text (pending-approval.md, etc.) and the critic/architect verdicts before writing.
  - If 2 or more "not specified" rows appear, the recommendation is automatically "hold."
  - Do not execute approve/reject on the user's behalf.
  - Output only the one-line confirmation `Response calibration + gate briefing mode: on` and finish.

- If the argument is `off` → **turn off**:
  Disable the temporary response persona calibration and the forced gate briefing together.
  Output only the one-line confirmation `Response calibration + gate briefing mode: off` and finish.

- For any other argument → only show a one-line usage hint: `/omg:gate [on|off]`.
