import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyClaudePluginBundle,
  readClaudePluginManifest,
  refreshClaudeCodeProjectMarketplace,
  type RunClaudeFn,
} from "../claude-plugin.js";

async function createSourceTree(root: string): Promise<void> {
  await mkdir(join(root, ".claude-plugin"), { recursive: true });
  await writeFile(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({
      name: "agent-sdlc",
      skills: "./skills",
      agents: ["./plugin-agents/orchestrator.md"],
      commands: ["./commands"],
    }),
    "utf8",
  );
  await writeFile(
    join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "agent-sdlc-marketplace", plugins: [{ name: "agent-sdlc", source: "." }] }),
    "utf8",
  );

  await mkdir(join(root, "skills", "sdlc"), { recursive: true });
  await writeFile(join(root, "skills", "sdlc", "SKILL.md"), "---\nname: sdlc\n---\n", "utf8");
  await mkdir(join(root, "commands"), { recursive: true });
  await writeFile(join(root, "commands", "sdlc.md"), "# sdlc\n", "utf8");
  await mkdir(join(root, "plugin-agents"), { recursive: true });
  await writeFile(
    join(root, "plugin-agents", "orchestrator.md"),
    "---\nname: orchestrator\ndescription: test\n---\n",
    "utf8",
  );
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe(".claude-plugin/plugin.json agents", () => {
  it("lists every plugin-agents/*.md file explicitly", async () => {
    const plugin = JSON.parse(
      await readFile(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"),
    );
    const files = (await readdir(join(repoRoot, "plugin-agents")))
      .filter((name) => {
        return name.endsWith(".md");
      })
      .sort();

    expect(plugin.agents).toEqual(
      files.map((name) => {
        return `./plugin-agents/${name}`;
      }),
    );
  });

  it("gives every listed agent name and description frontmatter", async () => {
    const plugin = JSON.parse(
      await readFile(join(repoRoot, ".claude-plugin", "plugin.json"), "utf8"),
    );

    for (const agentPath of plugin.agents as string[]) {
      const content = await readFile(join(repoRoot, agentPath), "utf8");
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      expect(frontmatter, agentPath).toMatch(/^name: \S+/m);
      expect(frontmatter, agentPath).toMatch(/^description: \S+/m);
    }
  });
});

describe("readClaudePluginManifest", () => {
  it("reads the plugin and marketplace names", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    await createSourceTree(sourceRoot);

    const manifest = await readClaudePluginManifest(sourceRoot);
    expect(manifest).toEqual({ pluginName: "agent-sdlc", marketplaceName: "agent-sdlc-marketplace" });
  });

  it("returns null when .claude-plugin/ is missing", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const manifest = await readClaudePluginManifest(sourceRoot);
    expect(manifest).toBeNull();
  });
});

describe("copyClaudePluginBundle", () => {
  it("returns false and copies nothing when source has no .claude-plugin/", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));

    const copied = await copyClaudePluginBundle(sourceRoot, targetRoot, false, { minimal: false });
    expect(copied).toBe(false);
  });

  it("copies the manifest and skills/commands into a namespaced bundle", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    const copied = await copyClaudePluginBundle(sourceRoot, targetRoot, false, { minimal: false });
    expect(copied).toBe(true);

    const pluginJson = await readFile(
      join(targetRoot, ".agent-sdlc-plugin", ".claude-plugin", "plugin.json"),
      "utf8",
    );
    expect(pluginJson).toContain("agent-sdlc");

    const skill = await readFile(
      join(targetRoot, ".agent-sdlc-plugin", "skills", "sdlc", "SKILL.md"),
      "utf8",
    );
    expect(skill).toContain("name: sdlc");

    const agent = await readFile(
      join(targetRoot, ".agent-sdlc-plugin", "plugin-agents", "orchestrator.md"),
      "utf8",
    );
    expect(agent).toContain("name: orchestrator");
  });

  it("copies plugin-agents in minimal mode so the manifest's agents paths resolve", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    await copyClaudePluginBundle(sourceRoot, targetRoot, false, { minimal: true });

    const agent = await readFile(
      join(targetRoot, ".agent-sdlc-plugin", "plugin-agents", "orchestrator.md"),
      "utf8",
    );
    expect(agent).toContain("name: orchestrator");
  });
});

function stubRunClaude(
  responses: Record<string, { status: number; stdout?: string; stderr?: string }>,
): RunClaudeFn {
  return (args) => {
    const key = args.join(" ");
    const response = responses[key];
    if (!response) {
      throw new Error(`unexpected claude invocation: ${key}`);
    }
    return {
      status: response.status,
      stdout: response.stdout ?? "",
      stderr: response.stderr ?? "",
    };
  };
}

describe("refreshClaudeCodeProjectMarketplace", () => {
  it("does nothing when the target has no .claude/settings.json", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);

    const runClaude = stubRunClaude({});
    await refreshClaudeCodeProjectMarketplace(targetRoot, sourceRoot, false, runClaude);
    // stubRunClaude throws on any invocation, so reaching here means it was never called.
  });

  it("does nothing when the marketplace is registered as a directory source (already live)", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);
    await mkdir(join(targetRoot, ".claude"), { recursive: true });
    await writeFile(
      join(targetRoot, ".claude", "settings.json"),
      JSON.stringify({
        extraKnownMarketplaces: {
          "agent-sdlc-marketplace": { source: { source: "directory", path: "/somewhere" } },
        },
      }),
      "utf8",
    );

    const runClaude = stubRunClaude({});
    await refreshClaudeCodeProjectMarketplace(targetRoot, sourceRoot, false, runClaude);
  });

  it("runs marketplace update + plugin update when a github-sourced marketplace is registered", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);
    await mkdir(join(targetRoot, ".claude"), { recursive: true });
    await writeFile(
      join(targetRoot, ".claude", "settings.json"),
      JSON.stringify({
        extraKnownMarketplaces: {
          "agent-sdlc-marketplace": { source: { source: "github", repo: "pbredenberg/agent-sdlc" } },
        },
      }),
      "utf8",
    );

    const calls: string[][] = [];
    const runClaude: RunClaudeFn = (args) => {
      calls.push(args);
      return { status: 0, stdout: "", stderr: "" };
    };

    await refreshClaudeCodeProjectMarketplace(targetRoot, sourceRoot, false, runClaude);

    expect(calls).toEqual([
      ["plugin", "marketplace", "update", "agent-sdlc-marketplace"],
      ["plugin", "update", "agent-sdlc@agent-sdlc-marketplace", "--scope", "project", "-y"],
    ]);
  });

  it("does not throw when the claude CLI is not on PATH", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);
    await mkdir(join(targetRoot, ".claude"), { recursive: true });
    await writeFile(
      join(targetRoot, ".claude", "settings.json"),
      JSON.stringify({
        extraKnownMarketplaces: {
          "agent-sdlc-marketplace": { source: { source: "github", repo: "pbredenberg/agent-sdlc" } },
        },
      }),
      "utf8",
    );

    const runClaude: RunClaudeFn = () => ({
      status: null,
      error: Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" }),
      stdout: "",
      stderr: "",
    });

    await expect(
      refreshClaudeCodeProjectMarketplace(targetRoot, sourceRoot, false, runClaude),
    ).resolves.toBeUndefined();
  });

  it("does not throw when plugin update fails (e.g. not installed at project scope yet)", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "source-"));
    const targetRoot = await mkdtemp(join(tmpdir(), "target-"));
    await createSourceTree(sourceRoot);
    await mkdir(join(targetRoot, ".claude"), { recursive: true });
    await writeFile(
      join(targetRoot, ".claude", "settings.json"),
      JSON.stringify({
        extraKnownMarketplaces: {
          "agent-sdlc-marketplace": { source: { source: "github", repo: "pbredenberg/agent-sdlc" } },
        },
      }),
      "utf8",
    );

    const runClaude = stubRunClaude({
      "plugin marketplace update agent-sdlc-marketplace": { status: 0 },
      "plugin update agent-sdlc@agent-sdlc-marketplace --scope project -y": {
        status: 1,
        stderr: "not installed",
      },
    });

    await expect(
      refreshClaudeCodeProjectMarketplace(targetRoot, sourceRoot, false, runClaude),
    ).resolves.toBeUndefined();
  });
});
