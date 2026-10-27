import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  copyDirectoryChildren,
  copyFilesByExtension,
  copyPath,
  ensureDir,
  pathExists,
  removePath,
} from "./copy-tree.js";
import { commandsSourceDir, pluginAgentsSourceDir, skillsSourceDir } from "./paths.js";

/**
 * Claude Code has no persistent, git-shareable "vendor a local copy" tier the
 * way Cursor's `.cursor/skills` does — `claude plugin marketplace add <path>`
 * writes an absolute filesystem path into settings, which only works on the
 * machine it was created on (verified against the real CLI). So this module
 * only ever produces a self-contained, namespaced bundle meant for ad hoc
 * `--plugin-dir` use (or a single developer's own machine-local `--scope
 * local` registration) — never a claim of team-wide auto-discovery.
 */
export const CLAUDE_PLUGIN_VENDOR_DIR_NAME = ".agent-sdlc-plugin";

export function claudePluginManifestSourceDir(sourceRoot: string): string {
  return join(sourceRoot, ".claude-plugin");
}

export function claudePluginVendorRoot(targetRoot: string): string {
  return join(targetRoot, CLAUDE_PLUGIN_VENDOR_DIR_NAME);
}

export function claudePluginVendorManifestDir(targetRoot: string): string {
  return join(claudePluginVendorRoot(targetRoot), ".claude-plugin");
}

export function claudePluginVendorSkillsDir(targetRoot: string): string {
  return join(claudePluginVendorRoot(targetRoot), "skills");
}

export function claudePluginVendorCommandsDir(targetRoot: string): string {
  return join(claudePluginVendorRoot(targetRoot), "commands");
}

export function claudePluginVendorAgentsDir(targetRoot: string): string {
  return join(claudePluginVendorRoot(targetRoot), "plugin-agents");
}

export type ClaudePluginManifest = {
  pluginName: string;
  marketplaceName: string;
};

export async function readClaudePluginManifest(
  sourceRoot: string,
): Promise<ClaudePluginManifest | null> {
  const manifestDir = claudePluginManifestSourceDir(sourceRoot);
  const pluginJsonPath = join(manifestDir, "plugin.json");
  const marketplaceJsonPath = join(manifestDir, "marketplace.json");

  if (!(await pathExists(pluginJsonPath)) || !(await pathExists(marketplaceJsonPath))) {
    return null;
  }

  try {
    const plugin = JSON.parse(await readFile(pluginJsonPath, "utf8"));
    const marketplace = JSON.parse(await readFile(marketplaceJsonPath, "utf8"));

    if (typeof plugin.name !== "string" || typeof marketplace.name !== "string") {
      return null;
    }

    return { pluginName: plugin.name, marketplaceName: marketplace.name };
  } catch {
    return null;
  }
}

/**
 * Copies plugin.json + marketplace.json + plugin-agents + skills (+ commands)
 * into a namespaced bundle under the target repo, mirroring this repo's own
 * root layout one level deeper so it never collides with the target's own
 * `skills/`, `commands/`, or `.claude-plugin/`. plugin-agents is copied in
 * both modes because plugin.json's `agents` array lists each file by path and
 * the manifest fails to load if any are missing. Returns false (no-op) if the
 * source has no `.claude-plugin/` at all.
 */
export async function copyClaudePluginBundle(
  sourceRoot: string,
  targetRoot: string,
  dryRun: boolean,
  options: { minimal: boolean },
): Promise<boolean> {
  const manifestSourceDir = claudePluginManifestSourceDir(sourceRoot);
  if (!(await pathExists(manifestSourceDir))) {
    return false;
  }

  const manifestDestDir = claudePluginVendorManifestDir(targetRoot);
  await ensureDir(manifestDestDir, dryRun);
  await copyFilesByExtension(manifestSourceDir, manifestDestDir, ["json"], dryRun);
  if (await pathExists(pluginAgentsSourceDir(sourceRoot))) {
    await copyFilesByExtension(
      pluginAgentsSourceDir(sourceRoot),
      claudePluginVendorAgentsDir(targetRoot),
      ["md"],
      dryRun,
    );
  }

  if (options.minimal) {
    const skillDestDir = claudePluginVendorSkillsDir(targetRoot);
    const skillDest = join(skillDestDir, "sdlc");
    await ensureDir(skillDestDir, dryRun);
    await removePath(skillDest, dryRun);
    await copyPath(join(skillsSourceDir(sourceRoot), "sdlc"), skillDest, dryRun);

    const commandDestDir = claudePluginVendorCommandsDir(targetRoot);
    await ensureDir(commandDestDir, dryRun);
    await copyPath(
      join(commandsSourceDir(sourceRoot), "sdlc.md"),
      join(commandDestDir, "sdlc.md"),
      dryRun,
    );
    return true;
  }

  await copyDirectoryChildren(
    skillsSourceDir(sourceRoot),
    claudePluginVendorSkillsDir(targetRoot),
    dryRun,
  );
  await copyFilesByExtension(
    commandsSourceDir(sourceRoot),
    claudePluginVendorCommandsDir(targetRoot),
    ["md", "mdc", "markdown", "txt"],
    dryRun,
  );
  return true;
}

export function printClaudePluginVendorNote(): void {
  const dir = CLAUDE_PLUGIN_VENDOR_DIR_NAME;
  console.log("");
  console.log(`Claude Code plugin bundle copied to ${dir}/.`);
  console.log(`Ad hoc, each session: claude --plugin-dir ${dir}`);
  console.log(
    `Persistent on THIS machine only (Claude Code stores an absolute path — not shareable via git, unlike the .cursor copies above):`,
  );
  console.log(
    `  claude plugin marketplace add ./${dir} --scope local && claude plugin install agent-sdlc@agent-sdlc-marketplace --scope local -y`,
  );
}

// --- Refresh a real, GitHub-hosted, project-scope Claude Code marketplace
// registration (e.g. this repo's own committed .claude/settings.json, or any
// repo that followed the README's "Shared, persistent" steps). A
// directory-sourced registration — including the vendored bundle above — is
// always read live and never needs this. ---

export type RunClaudeResult = {
  status: number | null;
  error?: NodeJS.ErrnoException;
  stdout: string;
  stderr: string;
};

export type RunClaudeFn = (args: string[], cwd: string) => RunClaudeResult;

function defaultRunClaude(args: string[], cwd: string): RunClaudeResult {
  return spawnSync("claude", args, { cwd, encoding: "utf8" });
}

type ClaudeSettingsFile = {
  extraKnownMarketplaces?: Record<string, { source?: { source?: string } }>;
};

async function readClaudeProjectSettings(
  targetRoot: string,
): Promise<ClaudeSettingsFile | null> {
  const settingsPath = join(targetRoot, ".claude", "settings.json");
  if (!(await pathExists(settingsPath))) {
    return null;
  }

  try {
    return JSON.parse(await readFile(settingsPath, "utf8"));
  } catch {
    return null;
  }
}

export async function refreshClaudeCodeProjectMarketplace(
  targetRoot: string,
  sourceRoot: string,
  dryRun: boolean,
  runClaude: RunClaudeFn = defaultRunClaude,
): Promise<void> {
  const manifest = await readClaudePluginManifest(sourceRoot);
  if (!manifest) {
    return;
  }

  const settings = await readClaudeProjectSettings(targetRoot);
  const entry = settings?.extraKnownMarketplaces?.[manifest.marketplaceName];
  if (entry?.source?.source !== "github") {
    // Not registered here, or registered as a directory source — the latter
    // (like our own vendored bundle, or --scope local dev installs) is
    // always read live and never needs an update command.
    return;
  }

  const pluginRef = `${manifest.pluginName}@${manifest.marketplaceName}`;

  if (dryRun) {
    console.log(`claude plugin marketplace update ${manifest.marketplaceName} (dry run)`);
    console.log(`claude plugin update ${pluginRef} --scope project -y (dry run)`);
    return;
  }

  const marketplaceResult = runClaude(
    ["plugin", "marketplace", "update", manifest.marketplaceName],
    targetRoot,
  );
  if (marketplaceResult.error?.code === "ENOENT") {
    console.log(
      `Claude Code CLI ("claude") not found on PATH — skipping ${manifest.marketplaceName} refresh.`,
    );
    return;
  }
  if (marketplaceResult.status !== 0) {
    console.warn(
      `claude plugin marketplace update ${manifest.marketplaceName} exited ${String(marketplaceResult.status)}: ${marketplaceResult.stderr.trim()}`,
    );
  } else {
    console.log(`claude plugin marketplace update ${manifest.marketplaceName}`);
  }

  const updateResult = runClaude(
    ["plugin", "update", pluginRef, "--scope", "project", "-y"],
    targetRoot,
  );
  if (updateResult.status !== 0) {
    console.warn(
      `claude plugin update ${pluginRef} --scope project exited ${String(updateResult.status)} (it may not be installed at project scope yet): ${updateResult.stderr.trim()}`,
    );
    return;
  }
  console.log(`claude plugin update ${pluginRef} --scope project (restart Claude Code to apply)`);
}
