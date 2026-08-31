import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pluginManifestPath, sdlcSkillDest } from "../paths.js";
import { parseUpdateArgs } from "../parse-update-args.js";

async function createPluginRepo(root: string): Promise<void> {
  await mkdir(join(root, ".cursor-plugin"), { recursive: true });
  await writeFile(
    pluginManifestPath(root),
    JSON.stringify({ name: "agent-sdlc" }),
    "utf8",
  );
}

async function createVendoredApp(root: string): Promise<void> {
  await mkdir(sdlcSkillDest(root), { recursive: true });
  await writeFile(join(sdlcSkillDest(root), "SKILL.md"), "sdlc", "utf8");
}

describe("parseUpdateArgs", () => {
  it("detects dev profile in plugin checkout", async () => {
    const repo = await mkdtemp(join(tmpdir(), "plugin-"));
    await createPluginRepo(repo);

    const result = parseUpdateArgs(["node", "update.ts", "--cwd", repo]);
    expect(result.profile).toBe("dev");
  });

  it("detects vendor profile in app repo", async () => {
    const app = await mkdtemp(join(tmpdir(), "app-"));
    await createVendoredApp(app);

    const result = parseUpdateArgs(["node", "update.ts", "--cwd", app]);
    expect(result.profile).toBe("vendor");
    expect(result.targetRoot).toBe(app);
  });

  it("accepts explicit profile", () => {
    const result = parseUpdateArgs([
      "node",
      "update.ts",
      "global-cli",
      "--no-pull",
    ]);

    expect(result.profile).toBe("global-cli");
    expect(result.pull).toBe(false);
  });

  it("parses commit options", () => {
    const result = parseUpdateArgs([
      "node",
      "update.ts",
      "vendor",
      "--commit",
      "--message",
      "chore: bump kit",
    ]);

    expect(result.commit).toBe(true);
    expect(result.commitMessage).toBe("chore: bump kit");
  });

  it("returns help flag", () => {
    const result = parseUpdateArgs(["node", "update.ts", "--help"]);
    expect(result.help).toBe(true);
  });
});
