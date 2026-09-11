import { symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  commandsDestDir,
  commandsSourceDir,
  pluginManifestPath,
  rulesDestDir,
  rulesSourceDir,
  sdlcCommandDest,
  sdlcRuleDest,
  sdlcSkillDest,
  skillsDestDir,
  skillsSourceDir,
  LOCAL_PLUGIN_DIR,
} from "./paths.js";
import {
  copyDirectoryChildren,
  copyFilesByExtension,
  copyPath,
  ensureDir,
  pathExists,
  removePath,
} from "./copy-tree.js";
import {
  CLAUDE_PLUGIN_VENDOR_DIR_NAME,
  claudePluginManifestSourceDir,
  claudePluginVendorManifestDir,
  claudePluginVendorSkillsDir,
  copyClaudePluginBundle,
  printClaudePluginVendorNote,
} from "./claude-plugin.js";
import type { InstallOptions, InstallResult, InstallStep } from "./types.js";

export async function installAgentSdlc(
  options: InstallOptions,
): Promise<InstallResult> {
  const steps = buildInstallSteps(options);
  const completed: string[] = [];

  for (const step of steps) {
    await step.run();
    completed.push(step.label);
  }

  return {
    mode: options.mode,
    sourceRoot: options.sourceRoot,
    targetRoot: options.targetRoot,
    steps: completed,
  };
}

function buildInstallSteps(options: InstallOptions): InstallStep[] {
  const stepBuilders: Record<InstallOptions["mode"], () => InstallStep[]> = {
    dev: () => buildDevSteps(options),
    cloud: () => buildCloudSteps(options),
    desktop: () => buildDesktopSteps(options),
    "vendor-full": () => buildVendorFullSteps(options),
    "vendor-minimal": () => buildVendorMinimalSteps(options),
    "global-cli": () => buildGlobalCliSteps(options),
  };

  const builder = stepBuilders[options.mode];
  return builder();
}

function buildDevSteps(options: InstallOptions): InstallStep[] {
  return [
    ...buildProjectCopySteps(options),
    buildDesktopPluginStep(options),
    buildVerifyStep(options, ["dev"]),
  ];
}

function buildCloudSteps(options: InstallOptions): InstallStep[] {
  return [
    ...buildProjectCopySteps(options),
    buildVerifyStep(options, ["cloud"]),
  ];
}

function buildDesktopSteps(options: InstallOptions): InstallStep[] {
  return [buildDesktopPluginStep(options), buildVerifyStep(options, ["desktop"])];
}

function buildVendorFullSteps(options: InstallOptions): InstallStep[] {
  return [
    ...buildProjectCopySteps(options),
    buildCopyClaudePluginStep(options, false),
    buildVerifyStep(options, ["vendor-full"]),
  ];
}

function buildVendorMinimalSteps(options: InstallOptions): InstallStep[] {
  return [
    buildCopySdlcSkillStep(options),
    ...buildCopySdlcCommandSteps(options),
    buildCopySdlcRuleStep(options),
    buildCopyClaudePluginStep(options, true),
    buildVerifyStep(options, ["vendor-minimal"]),
  ];
}

function buildCopyClaudePluginStep(
  options: InstallOptions,
  minimal: boolean,
): InstallStep {
  return {
    label: `copy Claude Code plugin bundle -> ${CLAUDE_PLUGIN_VENDOR_DIR_NAME}`,
    run: async () => {
      const copied = await copyClaudePluginBundle(
        options.sourceRoot,
        options.targetRoot,
        options.dryRun,
        { minimal },
      );
      if (copied) {
        console.log(
          `copied Claude Code plugin bundle -> ${CLAUDE_PLUGIN_VENDOR_DIR_NAME}/`,
        );
      }
    },
  };
}

function buildGlobalCliSteps(options: InstallOptions): InstallStep[] {
  return [
    buildNpmInstallStep(options),
    buildNpmLinkStep(options),
    buildVerifyStep(options, ["global-cli"]),
  ];
}

function buildProjectCopySteps(options: InstallOptions): InstallStep[] {
  return [
    buildCopyAllSkillsStep(options),
    buildCopyAllCommandsStep(options),
    buildCopyAllRulesStep(options),
  ];
}

function buildCopyAllSkillsStep(options: InstallOptions): InstallStep {
  return {
    label: "copy skills -> .cursor/skills",
    run: async () => {
      const source = skillsSourceDir(options.sourceRoot);
      const destination = skillsDestDir(options.targetRoot);
      const copied = await copyDirectoryChildren(
        source,
        destination,
        options.dryRun,
      );

      for (const skillName of copied) {
        console.log(`copied skills/${skillName} -> .cursor/skills/${skillName}`);
      }
    },
  };
}

function buildCopyAllCommandsStep(options: InstallOptions): InstallStep {
  return {
    label: "copy commands -> .cursor/commands",
    run: async () => {
      const source = commandsSourceDir(options.sourceRoot);
      const destination = commandsDestDir(options.targetRoot);
      const copied = await copyFilesByExtension(
        source,
        destination,
        ["md", "mdc", "markdown", "txt"],
        options.dryRun,
      );

      for (const commandName of copied) {
        console.log(
          `copied commands/${commandName} -> .cursor/commands/${commandName}`,
        );
      }
    },
  };
}

function buildCopyAllRulesStep(options: InstallOptions): InstallStep {
  return {
    label: "copy rules -> .cursor/rules",
    run: async () => {
      const source = rulesSourceDir(options.sourceRoot);
      const destination = rulesDestDir(options.targetRoot);
      const sourceExists = await pathExists(source);
      if (!sourceExists) {
        return;
      }

      const copied = await copyFilesByExtension(
        source,
        destination,
        ["mdc"],
        options.dryRun,
      );

      for (const ruleName of copied) {
        console.log(`copied rules/${ruleName} -> .cursor/rules/${ruleName}`);
      }
    },
  };
}

function buildCopySdlcSkillStep(options: InstallOptions): InstallStep {
  return {
    label: "copy skills/sdlc -> .cursor/skills/sdlc",
    run: async () => {
      const source = join(skillsSourceDir(options.sourceRoot), "sdlc");
      const destination = sdlcSkillDest(options.targetRoot);
      await ensureDir(skillsDestDir(options.targetRoot), options.dryRun);
      await removePath(destination, options.dryRun);
      await copyPath(source, destination, options.dryRun);
      console.log("copied skills/sdlc -> .cursor/skills/sdlc");
    },
  };
}

function buildCopySdlcCommandSteps(options: InstallOptions): InstallStep[] {
  return [
    {
      label: "copy commands/sdlc.md -> .cursor/commands/sdlc.md",
      run: async () => {
        const source = join(commandsSourceDir(options.sourceRoot), "sdlc.md");
        const destination = sdlcCommandDest(options.targetRoot);
        await ensureDir(commandsDestDir(options.targetRoot), options.dryRun);
        await copyPath(source, destination, options.dryRun);
        console.log("copied commands/sdlc.md -> .cursor/commands/sdlc.md");
      },
    },
  ];
}

function buildCopySdlcRuleStep(options: InstallOptions): InstallStep {
  return {
    label: "copy rules/sdlc-kit.mdc -> .cursor/rules/sdlc-kit.mdc",
    run: async () => {
      const source = join(rulesSourceDir(options.sourceRoot), "sdlc-kit.mdc");
      const destination = sdlcRuleDest(options.targetRoot);
      const sourceExists = await pathExists(source);
      if (!sourceExists) {
        return;
      }

      await ensureDir(rulesDestDir(options.targetRoot), options.dryRun);
      await copyPath(source, destination, options.dryRun);
      console.log("copied rules/sdlc-kit.mdc -> .cursor/rules/sdlc-kit.mdc");
    },
  };
}

function buildDesktopPluginStep(options: InstallOptions): InstallStep {
  return {
    label: "link ~/.cursor/plugins/local/agent-sdlc",
    run: async () => {
      const pluginParent = LOCAL_PLUGIN_DIR.split("/").slice(0, -1).join("/");
      await ensureDir(pluginParent, options.dryRun);

      const exists = await pathExists(LOCAL_PLUGIN_DIR);
      if (exists) {
        await removePath(LOCAL_PLUGIN_DIR, options.dryRun);
      }

      if (options.dryRun) {
        console.log(`linked ${LOCAL_PLUGIN_DIR} -> ${options.sourceRoot}`);
        return;
      }

      await symlink(options.sourceRoot, LOCAL_PLUGIN_DIR);
      console.log(`linked ${LOCAL_PLUGIN_DIR} -> ${options.sourceRoot}`);
    },
  };
}

function buildNpmInstallStep(options: InstallOptions): InstallStep {
  return {
    label: "npm install",
    run: async () => {
      await runNpmCommand(["install"], options.sourceRoot, options.dryRun);
    },
  };
}

function buildNpmLinkStep(options: InstallOptions): InstallStep {
  return {
    label: "npm link",
    run: async () => {
      await runNpmCommand(["link"], options.sourceRoot, options.dryRun);
    },
  };
}

function buildVerifyStep(
  options: InstallOptions,
  profiles: string[],
): InstallStep {
  return {
    label: `verify layout (${profiles.join(", ")})`,
    run: async () => {
      if (options.dryRun) {
        return;
      }

      await verifyInstallLayout(options, profiles);
    },
  };
}

async function verifyInstallLayout(
  options: InstallOptions,
  profiles: string[],
): Promise<void> {
  const needsProjectFiles = profiles.some((profile) => {
    return [
      "dev",
      "cloud",
      "vendor-full",
      "vendor-minimal",
    ].includes(profile);
  });

  if (needsProjectFiles) {
    await assertPathExists(pluginManifestPath(options.sourceRoot));
    await assertPathExists(sdlcSkillDest(options.targetRoot));
    await assertPathExists(sdlcCommandDest(options.targetRoot));
    await assertNotSymlink(sdlcSkillDest(options.targetRoot));
  }

  const needsDesktopLink = profiles.includes("dev") || profiles.includes("desktop");
  if (needsDesktopLink) {
    await assertPathExists(LOCAL_PLUGIN_DIR);
    await assertPathExists(`${LOCAL_PLUGIN_DIR}/.cursor-plugin/plugin.json`);
  }

  const needsClaudeBundle = profiles.includes("vendor-full") || profiles.includes("vendor-minimal");
  if (needsClaudeBundle) {
    const claudeManifestSource = claudePluginManifestSourceDir(options.sourceRoot);
    if (await pathExists(claudeManifestSource)) {
      await assertPathExists(join(claudePluginVendorManifestDir(options.targetRoot), "plugin.json"));
      await assertPathExists(claudePluginVendorSkillsDir(options.targetRoot));
    }
  }
}

async function assertPathExists(path: string): Promise<void> {
  const exists = await pathExists(path);
  if (exists) {
    return;
  }

  throw new Error(`expected path to exist: ${path}`);
}

async function assertNotSymlink(path: string): Promise<void> {
  const { lstat } = await import("node:fs/promises");
  const stats = await lstat(path);
  if (!stats.isSymbolicLink()) {
    return;
  }

  throw new Error(`expected real files, not symlink: ${path}`);
}

function runNpmCommand(
  args: string[],
  cwd: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`npm ${args.join(" ")} (dry run)`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn("npm", args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm ${args.join(" ")} failed with exit code ${String(code)}`));
    });
  });
}

export function printInstallSummary(result: InstallResult): void {
  console.log("");
  console.log(`agent-sdlc install complete (${result.mode}).`);

  const messages: Record<InstallResult["mode"], string> = {
    dev: "Reload Cursor (Developer: Reload Window) so Desktop picks up the local plugin (Cursor only — Claude Code reads skills/commands live from this checkout, nothing to re-copy for it).",
    cloud: "Cloud Agents use committed .cursor/skills copies — re-run after skill edits (Cursor only; unrelated to Claude Code).",
    desktop: "Reload Cursor (Developer: Reload Window) so Desktop picks up the local plugin.",
    "vendor-full": "Commit .cursor/skills and .cursor/commands (Cursor) in the target repository.",
    "vendor-minimal": "Commit .cursor/skills/sdlc and .cursor/commands/sdlc.md (Cursor) in the target repository.",
    "global-cli": "agent-sdlc-drain is now on your PATH (re-run after CLI changes).",
  };

  console.log(messages[result.mode]);
  console.log("Slash commands: /sdlc and specialist skills under Customize -> Skills.");

  if (result.mode === "vendor-full" || result.mode === "vendor-minimal") {
    printClaudePluginVendorNote();
  }
}
