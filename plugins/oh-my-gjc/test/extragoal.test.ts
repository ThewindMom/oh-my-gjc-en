import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const skill = readFileSync(join(import.meta.dir, "../skills/extragoal/SKILL.md"), "utf8");

describe("extragoal reviewer lanes", () => {
  test("requires native GJC and insane-review by default", () => {
    expect(skill).toContain("Default — two-lane N-of-N gate");
    expect(skill).toContain("`insane-review` GPT-5.6 Sol Pro web lane — default ON");
    expect(skill).toContain("Both must return valid `APPROVE` verdicts");
    expect(skill).toContain("it never falls back to one-lane approval");
    expect(skill).not.toContain("insane-review` (GPT-5.6 Sol Pro web, operator-owned ToS lane) — default OFF");
  });

  test("keeps fable optional and external egress fail-closed", () => {
    expect(skill).toContain("Optional third lane — `/omg:fable`");
    expect(skill).toContain("mandatory secret scan");
    expect(skill).toContain("Missing browser/login/model verification, refusal, malformed output, or timeout blocks the gate");
  });
});
