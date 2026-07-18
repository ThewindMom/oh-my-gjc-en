import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pluginRoot = join(import.meta.dir, "..");
const skillPath = join(pluginRoot, "skills/deep-onboarding/SKILL.md");
const commandPath = join(pluginRoot, "templates/deep-onboarding.md");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("deep-onboarding surface contract", () => {
  test("declares the explicit skill and command", () => {
    const skill = read(skillPath);
    const command = read(commandPath);

    expect(skill).toMatch(/^---\nname: deep-onboarding\ndescription: .*When taking over a poorly documented/m);
    expect(skill).toContain("Default responses and artifacts are written in English");
    expect(command).toMatch(/^---\ndescription: .*Investigates a poorly documented repository/m);
    expect(command).toContain('argument-hint: "[output-path]"');
    expect(command).toContain("# /omg:deep-onboarding");
  });

  test("keeps the three phases evidence-labeled and read-only before confirmation", () => {
    const skill = read(skillPath);
    const phaseOne = skill.slice(skill.indexOf("## Phase 1"), skill.indexOf("## Phase 2"));
    const previewAt = skill.indexOf("preview of the three files");
    const confirmationAt = skill.indexOf("explicitly confirms writing the three files to that path");

    for (const phase of ["## Phase 1", "## Phase 2", "## Phase 3"]) expect(skill).toContain(phase);
    for (const label of ["Observed fact (Observed)", "User statement (User statement)", "Inference (Inference)"]) {
      expect(skill).toContain(label);
    }
    expect(phaseOne).toContain("The only tools in this phase are **`read`, `search`, and `find`**");
    expect(phaseOne).not.toMatch(/`(?:write|edit|bash)`/);
    expect(skill).toContain("only one core uncertainty at a time");
    expect(skill).toContain("Is this topology and the unresolved items correct?");
    expect(previewAt).toBeGreaterThan(-1);
    expect(confirmationAt).toBeGreaterThan(previewAt);
    expect(skill.slice(previewAt, confirmationAt)).toContain("you are read-only and write no files");
  });

  test("previews only the three agreed Markdown contracts", () => {
    const skill = read(skillPath);

    for (const file of ["`project-map.md`", "`adr-proposals.md`", "`handoff.md`"]) {
      expect(skill).toContain(file);
    }
    expect(skill).toContain("the tentative project map with evidence labels");
    expect(skill).toContain("alternatives, trade-offs, rationale, and open questions");
    expect(skill).toContain("where the next owner should start");
    expect(skill).toContain("write only the three agreed Markdown files");
    expect(skill).toContain("Do not `git commit`, stage, push, tag, or release");
  });

  test("requires an explicit safe output path and per-file overwrite approval", () => {
    const skill = read(skillPath);

    expect(skill).toContain("exactly one output directory");
    expect(skill).toContain("exact absolute or canonical path");
    expect(skill).toContain("explicitly confirms writing the three files to that path");
    for (const boundary of ["Empty or relative paths, `~`", "Root directory `/`", "home directory `$HOME`", "`.git`, `.gjc`", "Paths that do not exist and would require creating a new directory", "per-file explicit approval"]) {
      expect(skill).toContain(boundary);
    }
    expect(skill).toContain("Do not default to or auto-suggest a path inside the analyzed repository");
  });

  test("treats the command argument as a proposal, never implicit approval", () => {
    const command = read(commandPath);

    expect(command).toContain("explicitly invoked");
    expect(command).toContain("output path proposal");
    expect(command).toContain("not a confirmed directory, write approval, or overwrite approval");
    expect(command).toContain("before the user confirms");
    expect(command).toContain("Natural-language requests or a mere path mention do not start this command");
    expect(command).toContain("the optional argument is a proposal, not confirmation");
  });

  test("records demand provenance without upstream activity instructions", () => {
    const skill = read(skillPath);

    expect(skill).toContain("upstream #158 + Discord");
    expect(skill).toContain("does not direct or perform any external activity");
  });
});
