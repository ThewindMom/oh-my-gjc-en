---
name: adaptive-response
description: "Only when `/omg:gate` or `/omg:gate-always` is explicitly requested, calibrate responses based on evidence from the current conversation, interview, and task — adjusting the user's domain proficiency, explanation depth, and decision-making role, and provide a 4-part briefing at approval gates. Does not auto-activate from ordinary conversation, natural-language level requests, or approval questions alone. The temporary response persona applies only to the current domain and never lowers correctness, safety, or approval boundaries."
---

# Adaptive Response

Purpose: do not assume the user is a fixed beginner or expert. Build a **temporary response persona** using only evidence confirmed in the current conversation, interview, and current domain. Adjust the explanation depth and format of general responses and GJC skills to match that evidence, and at approval gates preserve the original-text evidence so the user can judge for themselves what they are approving.

## When it activates

- Only when the user explicitly turns it on with `/omg:gate` or `/omg:gate-always`.
- It does not auto-activate from ordinary conversation, natural-language level-adjustment requests, or entering pending-approval alone.

## Response persona — temporary working card before each output

Before responding, fill in the following fields **for the current response only**. Do not expose them to the user by default; only show them briefly with evidence when the user asks "how did you calibrate?"

- **Current domain proficiency**: beginner / practitioner / expert / unknown + evidence + confidence. Do not generalize from coding skill to law, finance, or infrastructure expertise.
- **Technical depth**: concept-oriented / contract-and-flow-oriented / implementation-detail-oriented / unknown.
- **Explanation density**: summary-first / balanced / detailed. The user's most recent explicit request takes priority.
- **Decision-making role**: direct approver / implementer / reviewer / observer / unknown.
- **Language and format preferences**: language confirmed in the current conversation, list/table/example preferences.
- **Risk appetite**: record only if the user stated it explicitly. Do not infer.

### Evidence you may use

1. Preferences, background, and corrections the user stated directly in the current session.
2. Terminology and question scope of the current request. This is a weak signal — never determine any proficiency level from it alone. Use it only as supporting evidence when it agrees with a direct user statement or other evidence from the same current domain.
3. Role information in repository rules, plans, or documents you already need to read for the current task.
4. Files the user **explicitly** told you to read for persona evidence.

### Forbidden evidence

- Exploring stored session transcripts beyond what is visible in the current conversation, home, other repositories, browser history, or credentials for persona purposes.
- Reading GJC private memory directly or treating it like a public profile API.
- Inferring sensitive or identity traits such as age, gender, nationality, health, politics, religion, wealth, or personality.
- Copying proficiency from one domain to another, or judging ability low from short sentences or typos.
- Do not save inferred persona data to files. Do not persist it as global user information. `/omg:gate-always` also stores only **this temporary calibration procedure** in SYSTEM.md, not personal data.

When information is insufficient, keep `unknown`. Ask at most 2 clarifying questions, and only when the answer would materially change safety boundaries or explanation approach; otherwise proceed with a balanced, brief explanation and first-mention terminology glossing.

## Level-based expression calibration

- **Beginner**: lead with conclusion and impact, gloss terms on first mention, use one concrete example at a time.
- **Practitioner**: reduce basic definitions, focus on contracts, data flow, trade-offs, and failure recovery.
- **Expert**: do not repeat confirmed basics; present invariants, boundary conditions, evidence, and residual risks directly.
- **Unknown**: answer at a neutral, summary-first level with brief terminology annotations.

What you calibrate is **expression order, terminology density, examples, and detail level only**. Correctness, safety mechanisms, warnings, verification evidence, whether real-environment contact occurs, and approval authority are all maintained regardless of persona. If the user states a wrong premise, do not soften it to match their level — clearly correct what breaks.

## Scope of application

- Use this procedure only for responses where `/omg:gate on` or an active `/omg:gate-always on` applies.
- `/omg:gate on` applies the same temporary calibration to all GJC skills and general responses in this session.
- `/omg:gate-always on` applies the calibration **procedure** and gate briefing globally from new sessions onward.
- A project `.gjc/SYSTEM.md` overriding the user-global SYSTEM.md may prevent the always-on rule from applying.
- The response persona updates immediately when new evidence or user corrections appear in-session; the latest explicit instruction wins.

## Briefing generation procedure

1. **Build the temporary response persona.** Use only the allowed evidence above; do not fill unknowns with guesses.
2. **Read the original text.** Actually read pending-approval.md (or the relevant gate artifact) and the latest critic/architect stage files. Do not substitute memory or summaries.
3. **Output in the 4-part format below.** Keep content and safety boundaries identical; only adjust expression depth to the persona.

### ① Level-matched translation
Explain the plan's conclusion, reasoning, and sequence in 5 sentences or fewer. For beginner/unknown, gloss terms on first mention; for practitioner/expert, do not repeat confirmed basics and present contracts, boundaries, and trade-offs directly.

### ② Approval boundaries
- **What you are approving now**: what immediately happens as a result of this approval.
- **What you are not approving**: what does not happen even with this approval (especially: does real-environment/real-service/real-account/production contact begin? Are there additional approval gates in later steps?).

### ③ Domain-agnostic checklist (original-text evidence required)
| Question | Answer + evidence location |
|---|---|
| Can it be rolled back if it goes wrong? (rollback path) | |
| Does this approval change the real environment? If so, when and after what additional gates? | |
| Are there observable success/failure metrics defined without domain knowledge? | |
| Are dangerous numbers/thresholds being fixed now, or derived from evidence (tests, backtests, measurements)? | |
| Are any existing safety mechanisms weakened or removed? | |
| What is the consensus gate verdict? (critic verdict / architect status original text) | |

Fill each row only with what you confirmed from the plan's original text. **If it is not in the original text, do not fabricate — mark it "not specified — confirm before approval."** This marking itself is decision material.

### ④ Verdict
- Recommendation: approve / hold (with clarifying questions) / reject (with reason).
- If there are questions worth asking the session before approval, present 1–3 in a copy-paste-ready form.

## Rules

- **Correctness > personalization > ease.** If making it easier would distort meaning, keep the technical term and annotate the meaning.
- **No approval by proxy.** The verdict is recommendation only. Do not execute approve/reject; that requires the user's explicit instruction.
- If 2 or more "not specified" rows appear in the checklist, the recommendation is automatically "hold."
- Never omit risks, cautions, or actions the user must take themselves.
- Default is one screen of output. If the user specifies detailed/summary, match that density but keep the 4 parts and mandatory risks.
