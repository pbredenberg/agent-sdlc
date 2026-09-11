import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installAgentSdlc } from "../install.js";
import {
  commandsDestDir,
  pluginManifestPath,
  sdlcCommandDest,
  sdlcSkillDest,
  skillsDestDir,
} from "../paths.js";
import {
  claudePluginVendorCommandsDir,
  claudePluginVendorManifestDir,
  claudePluginVendorSkillsDir,
} from "../claude-plugin.js";

async function createSourceTree(
  root: string,
  options: { withClaudePlugin?: boolean } = {},
): Promise<void> {
  await mkdir(join(root, ".cursor-plugin"), { recursive: true });
  await writeFile(
    pluginManifestPath(root),
    JSON.stringify({ name: "agent-sdlc" }),
    "utf8",
  );

  await mkdir(join(root, "skills", "sdlc"), { recursive: true });
  await writeFile(
    join(root, "skills", "sdlc", "SKILL.md"),
    "---\nname: sdlc\n---\n",
    "utf8",
  );
  await mkdir(join(root, "skills", "qa"), { recursive: true });
  await writeFile(
    join(root, "skills", "qa", "SKILL.md"),
    "---\nname: qa\n---\n",
    "utf8",
  );

  await mkdir(join(root, "commands"), { recursive: true });
  await writeFile(join(root, "commands", "sdlc.md"), "# sdlc\n", "utf8");
  await writeFile(
    join(root, "commands", "execution-plan-dispatch.md"),
    "# dispatch\n",
    "utf8",
  );

  if (options.withClaudePlugin ?? true) {
    await mkdir(join(root, ".claude-plugin"), { recursive: true });
    await writeFile(
      join(root, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "agent-sdlc", skills: "./skills", commands: ["./commands"] }),
      "utf8",
    );
    await writeFile(
      join(root, ".claude-plugin", "marketplace.json"),
      JSON.stringify({ name: "agent-sdlc-marketplace", plugins: [{ name: "agent-sdlc", source: "." }] }),
      "utf8",
    );
  }
}

describe("installAgentSdlc", () => {
  it("copies full skills and commands in cloud mode", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    await installAgentSdlc({
      mode: "cloud",
      sourceRoot,
      targetRoot,
      dryRun: false,
    });

    const skillContent = await readFile(
      join(sdlcSkillDest(targetRoot), "SKILL.md"),
      "utf8",
    );
    expect(skillContent).toContain("name: sdlc");

    const commandContent = await readFile(sdlcCommandDest(targetRoot), "utf8");
    expect(commandContent).toContain("# sdlc");

    const qaSkill = join(skillsDestDir(targetRoot), "qa", "SKILL.md");
    const qaStats = await lstat(qaSkill);
    expect(qaStats.isSymbolicLink()).toBe(false);
  });

  it("copies only sdlc in vendor-minimal mode", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    await installAgentSdlc({
      mode: "vendor-minimal",
      sourceRoot,
      targetRoot,
      dryRun: false,
    });

    const sdlcExists = await readFile(
      join(sdlcSkillDest(targetRoot), "SKILL.md"),
      "utf8",
    );
    expect(sdlcExists).toBeTruthy();

    const qaPath = join(skillsDestDir(targetRoot), "qa");
    await expect(lstat(qaPath)).rejects.toThrow();

    const dispatchPath = join(commandsDestDir(targetRoot), "execution-plan-dispatch.md");
    await expect(readFile(dispatchPath, "utf8")).rejects.toThrow();
  });

  it("also copies a full Claude Code plugin bundle in vendor-full mode", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    await installAgentSdlc({
      mode: "vendor-full",
      sourceRoot,
      targetRoot,
      dryRun: false,
    });

    const pluginJson = JSON.parse(
      await readFile(join(claudePluginVendorManifestDir(targetRoot), "plugin.json"), "utf8"),
    );
    expect(pluginJson.name).toBe("agent-sdlc");

    const marketplaceJson = JSON.parse(
      await readFile(join(claudePluginVendorManifestDir(targetRoot), "marketplace.json"), "utf8"),
    );
    expect(marketplaceJson.name).toBe("agent-sdlc-marketplace");

    const qaSkill = await readFile(
      join(claudePluginVendorSkillsDir(targetRoot), "qa", "SKILL.md"),
      "utf8",
    );
    expect(qaSkill).toContain("name: qa");

    const dispatchCommand = await readFile(
      join(claudePluginVendorCommandsDir(targetRoot), "execution-plan-dispatch.md"),
      "utf8",
    );
    expect(dispatchCommand).toContain("# dispatch");
  });

  it("copies only the sdlc skill/command into the Claude Code bundle in vendor-minimal mode", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    await installAgentSdlc({
      mode: "vendor-minimal",
      sourceRoot,
      targetRoot,
      dryRun: false,
    });

    const sdlcSkill = await readFile(
      join(claudePluginVendorSkillsDir(targetRoot), "sdlc", "SKILL.md"),
      "utf8",
    );
    expect(sdlcSkill).toContain("name: sdlc");

    const qaPath = join(claudePluginVendorSkillsDir(targetRoot), "qa");
    await expect(lstat(qaPath)).rejects.toThrow();

    const dispatchPath = join(claudePluginVendorCommandsDir(targetRoot), "execution-plan-dispatch.md");
    await expect(readFile(dispatchPath, "utf8")).rejects.toThrow();
  });

  it("skips the Claude Code bundle gracefully when source has no .claude-plugin/", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot, { withClaudePlugin: false });

    await installAgentSdlc({
      mode: "vendor-full",
      sourceRoot,
      targetRoot,
      dryRun: false,
    });

    await expect(
      readFile(join(claudePluginVendorManifestDir(targetRoot), "plugin.json"), "utf8"),
    ).rejects.toThrow();

    const sdlcExists = await readFile(
      join(sdlcSkillDest(targetRoot), "SKILL.md"),
      "utf8",
    );
    expect(sdlcExists).toBeTruthy();
  });
});
