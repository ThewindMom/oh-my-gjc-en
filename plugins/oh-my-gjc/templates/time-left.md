---
description: Explicitly queries the remaining machine work-time range of the current ralplan or ultragoal using read-only GJC SDK state.
argument-hint: "[ralplan|ultragoal]"
---

# /omg:time-left

Only when this command is explicitly invoked, load the installed `time-left` skill and follow its procedure exactly.
If `$ARGUMENTS` is `ralplan` or `ultragoal`, pass it as the expected workflow name, but do not skip the skill's concurrent-active check and canonical state selection. If there is no argument, let the skill determine the currently active workflow.

Do not run `time-left` from a general natural-language question about remaining time or ETA. In that case, do not query the SDK; briefly inform the user that `/omg:time-left` is the explicit query command.
