---
name: deep-onboarding
description: When taking over a poorly documented or hard-to-understand repository, perform deep onboarding through read-only evidence investigation, one core uncertainty interview at a time, and three Markdown handoff artifacts after explicit confirmation. Use when you want a project map, ADR proposals, or a handoff document, or need to confirm repository topology.
---

# Deep Onboarding

Do not explain a poorly documented repository with guesses. Default responses and artifacts are written in English, while code identifiers, commands, paths, and exact quotations are preserved verbatim.

## Invariant boundaries

- Do not use the analyzed repository as the default output location or silently modify it.
- Do not change files, directories, settings, or Git state until you have explicitly received **exactly one output directory** from the user.
- Even after confirmation, write only the three agreed Markdown files: `project-map.md`, `adr-proposals.md`, and `handoff.md`. Do not create directories or modify other files.
- Do not `git commit`, stage, push, tag, or release.

## Evidence labeling

Attach one of the following to every claim in the conversation and the three artifacts. If multiple types mix in one sentence, split the sentence.

- **Observed fact (Observed):** confirmed directly with `read`/`search`/`find`. Include the tool, path, line anchor, or search result.
- **User statement (User statement):** purpose, constraint, or correction the user stated directly. Do not reframe it as repository evidence.
- **Inference (Inference):** a tentative interpretation derived from observed facts or user statements. Include evidence and confidence; do not promote it to confirmed fact.

## Phase 1 — read-only evidence investigation

The only tools in this phase are **`read`, `search`, and `find`**. Do not execute, install, generate, modify, run Git commands, or perform network activity. Read only the analyzed target's file contents, metadata, and conventions.

1. Investigate repository guidance, top-level structure, manifests, entry points, tests, configuration, and deployment/operations traces, starting from a narrow scope. Do not open files by guessing — locate them with `find`/`search` first, then `read`.
2. Present the following two **tentative** results in chat:
   - **Evidence-based project map:** purpose, boundaries, major directories, entry points, run/build/test flow, data and control flow, external dependencies, and configuration/secret boundaries, each with per-claim evidence.
   - **Uncertainty list:** owners, deployment methods, operational paths, decisions, or terminology with no evidence or conflicting evidence, and why each matters.
3. Do not fill gaps with inference. Separate observed facts from inferences and make clear the project map is tentative.

## Phase 2 — topology interview and confirmation

From Phase 1's uncertainties, ask **only one core uncertainty at a time** that affects the structure, safety, or decisions of the output. After receiving an answer, record it as a **User statement**, and if it conflicts with new evidence, do not hide the conflict.

- After one answer, update the project map and judge whether a next core uncertainty remains. Do not ask about trivial preferences or questions already answered by evidence.
- Re-show the topology as text, including service boundaries, ownership, execution environment, dependency flow, and deployment paths.
- Ask "Is this topology and the unresolved items correct?" Preserve user corrections as User statements, not observed facts; keep unconfirmed connections as inferences.
- If the user interrupts the interview or does not know an answer, you may proceed to the Phase 3 preview with current uncertainties preserved. Do not fabricate answers.

## Phase 3 — artifact preview and write approval

First show a **preview of the three files** in chat. Until this point you are read-only and write no files.

| File | Contract |
|---|---|
| `project-map.md` | Contains the tentative project map with evidence labels, topology, major flows, boundaries, and the uncertainty list. |
| `adr-proposals.md` | Contains only **proposals** — observed decision context, alternatives, trade-offs, rationale, and open questions. Do not fabricate approved ADRs or facts. |
| `handoff.md` | Contains where the next owner should start, confirmed facts, in-progress decisions, risks, open questions, and how to re-investigate. |

Then stop until the user specifies a single existing directory with an exact absolute or canonical path and **explicitly confirms writing the three files to that path** — for example, "write these three files to `/safe/onboarding-output`". A command argument or a prior path mention is a proposal, not confirmation.

### Output path rejection rules

Reject the following and request a safe existing directory again:

- Empty or relative paths, `~`, or ambiguous paths with multiple interpretations
- Root directory `/` or home directory `$HOME`
- `.git`, `.gjc`, or paths inside/under them
- Paths that do not exist and would require creating a new directory

Do not default to or auto-suggest a path inside the analyzed repository. Allow an in-repository output only when the user gives an exact path that passes the above conditions and explicitly confirms writing the three files.

In the confirmed directory, first check whether the three target files already exist. If any already exists, do not interpret a general directory approval as overwrite approval. Overwrite only files for which you receive **per-file explicit approval** stating the target filename and overwrite impact. If an unapproved existing file is present, write no files.

When write approval and any required per-file approvals are all in hand, write only the three files honoring their contracts, then report the exact paths written and a short summary of each. Do not perform any other file, commit, or remote activity.

## Provenance / demand note

**Provenance / demand note:** upstream #158 + Discord. This is a note preserving demand context only; this skill does not direct or perform any external activity on upstream or Discord.
