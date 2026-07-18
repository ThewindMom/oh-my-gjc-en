import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const pluginRoot = resolve(import.meta.dir, "..");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function ownedMarkerBody(content: string): string {
  const match = content.match(
    /^<!-- BEGIN oh-my-gjc:gate-always -->$(.*?)^<!-- END oh-my-gjc:gate-always -->$/ms,
  );
  if (!match) throw new Error("gate-always owned marker is missing or duplicated");
  return match[1];
}

describe("adaptive response contract", () => {
  test("builds a domain-specific ephemeral response persona", () => {
    const skill = read(join(pluginRoot, "skills/adaptive-response/SKILL.md"));

    for (const contract of [
      "Current domain proficiency",
      "Technical depth",
      "Explanation density",
      "Decision-making role",
      "Language and format preferences",
      "Risk appetite",
      "beginner / practitioner / expert / unknown",
      "the latest explicit instruction wins",
    ]) {
      expect(skill).toContain(contract);
    }
    expect(skill).toContain("Copying proficiency from one domain to another");
    expect(skill).toContain("never determine any proficiency level from it alone");
    expect(skill).toContain("a direct user statement or other evidence from the same current domain");
    expect(skill).toContain("Correctness > personalization > ease");
  });

  test("activates only through explicit gate commands", () => {
    const skill = read(join(pluginRoot, "skills/adaptive-response/SKILL.md"));
    expect(skill).toContain("Only when the user explicitly turns it on with `/omg:gate` or `/omg:gate-always`");
    expect(skill).toContain("`/omg:gate on` or an active `/omg:gate-always on`");
    expect(skill).not.toContain("auto-activates from ordinary conversation");
  });

  test("limits evidence across every activation surface", () => {
    const skill = read(join(pluginRoot, "skills/adaptive-response/SKILL.md"));
    const gate = read(join(pluginRoot, "templates/gate.md"));
    const always = read(join(pluginRoot, "templates/gate-always.md"));
    const marker = ownedMarkerBody(always);

    expect(skill).toContain("Files the user **explicitly** told you to read for persona evidence");
    expect(gate).toContain("files the user explicitly told you to read as persona evidence");
    expect(marker).toContain("files the user explicitly told you to read as persona evidence");

    for (const content of [skill, gate, marker]) {
      expect(content).toMatch(/never determine any proficiency level from it alone/i);
      expect(content).toContain("a direct user statement or other evidence from the same current domain");
      expect(content).toMatch(/stored session transcripts/);
      expect(content).toMatch(/home, other repositories, browser/);
      expect(content).toContain("credentials");
      expect(content).toMatch(/private memory/i);
      expect(content).toMatch(/sensitive/i);
      expect(content).toMatch(/do not save inferred persona data/is);
    }

    expect(marker).toContain("Do not add or store inferred persona data in this block or any separate artifact");
    expect(marker).toContain("only the static calibration procedure");
    expect(marker).not.toMatch(/user\s*(name|age|gender|nationality)\s*:/i);
  });

  test("keeps session and user-global scopes technically bounded", () => {
    const gate = read(join(pluginRoot, "templates/gate.md"));
    const always = read(join(pluginRoot, "templates/gate-always.md"));

    expect(gate).toContain("**all GJC skills and general responses** in this session");
    expect(gate).toContain("Response calibration + gate briefing mode: on");
    expect(always).toContain("new sessions where a project `.gjc/SYSTEM.md` does not take precedence");
    expect(always).toContain("every GJC skill and general response");
    expect(always.match(/^<!-- BEGIN oh-my-gjc:gate-always -->$/gm)).toHaveLength(1);
    expect(always.match(/^<!-- END oh-my-gjc:gate-always -->$/gm)).toHaveLength(1);
    expect(always).toContain("Never touch any other content outside the markers");
    expect(always).toContain("The backup only clones existing file bytes");
  });

  test("preserves every gate section and approval invariant", () => {
    const skill = read(join(pluginRoot, "skills/adaptive-response/SKILL.md"));
    const gate = read(join(pluginRoot, "templates/gate.md"));
    const marker = ownedMarkerBody(read(join(pluginRoot, "templates/gate-always.md")));

    for (const heading of [
      "### ① Level-matched translation",
      "### ② Approval boundaries",
      "### ③ Domain-agnostic checklist",
      "### ④ Verdict",
    ]) {
      expect(skill).toContain(heading);
    }
    for (const section of ["Level-matched translation", "Approval boundaries", "Domain-agnostic checklist", "Verdict"]) {
      expect(gate).toMatch(new RegExp(`[1-4]\\. (?:\\*\\*)?${section}`));
      expect(marker).toMatch(new RegExp(`[1-4]\\. (?:\\*\\*)?${section}`));
    }
    for (const content of [skill, gate, marker]) {
      expect(content).toContain("not specified");
      expect(content).toMatch(/Do not execute approve\/reject/s);
      expect(content).toMatch(/What you calibrate is|Calibrate expression only/);
      for (const invariant of ["Correctness", "safety mechanisms", "warnings", "verification", "real-environment", "approval authority"]) {
        expect(content).toContain(invariant);
      }
      expect(content).toMatch(/are all maintained|Never reduce/);
    }
  });

  test("propagates calibration without hiding Fable findings", () => {
    const fable = read(join(pluginRoot, "templates/fable.md"));

    expect(fable).toContain("adaptive-response temporary");
    expect(fable).toContain("for beginners, everyday-language impact; for practitioners/experts, contracts, boundary conditions, evidence");
    expect(fable).toContain("a concise complete list");
    expect(fable).toContain("CRITICAL/HIGH, safety boundaries, or verification failures");
    expect(fable).toContain("Do not execute approval or fixes");
    expect(fable).not.toContain("assume the user does not know the domain");
  });

  test("keeps the exact public surface at seven skills and ten commands", () => {
    const skillRoot = join(pluginRoot, "skills");
    const skillNames = readdirSync(skillRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(skillRoot, entry.name, "SKILL.md")))
      .map((entry) => entry.name)
      .sort();
    const commandNames = readdirSync(join(pluginRoot, "templates"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3))
      .sort();

    expect(skillNames).toEqual(["adaptive-response", "deep-onboarding", "extragoal", "insane-review", "lazycodex-gjc", "session-observer", "time-left"]);
    expect(commandNames).toEqual([
      "deep-onboarding",
      "fable",
      "gate",
      "gate-always",
      "insane-review",
      "lazycodex-gjc",
      "omg",
      "session-observer",
      "setup",
      "time-left",
    ]);
  });
});
