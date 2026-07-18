---
description: Investigates a poorly documented repository read-only and through one core question at a time, then writes only a project map, ADR proposals, and a handoff to an explicitly approved separate directory.
argument-hint: "[output-path]"
---

# /omg:deep-onboarding

Only when this command is **explicitly invoked**, load and apply the installed `deep-onboarding` skill.

Input argument: `$ARGUMENTS`

- If the argument is empty, start from the skill's Phase 1 read-only investigation without fixing an output location.
- If `[output-path]` is present, treat it only as an **output path proposal** passed to the skill. It is not a confirmed directory, write approval, or overwrite approval; it does not skip Phase 1–2 or the Phase 3 preview.
- Apply the skill's output-path rejection rules and explicit single-directory confirmation as-is. Do not write files to the analyzed repository or the proposed path before the user confirms.
- Even after confirmation, write only the three Markdown files `project-map.md`, `adr-proposals.md`, and `handoff.md`; do not commit.

Natural-language requests or a mere path mention do not start this command's behavior. This command is the entry point of explicit invocation via `/omg:deep-onboarding [output-path]` only, and the optional argument is a proposal, not confirmation.
