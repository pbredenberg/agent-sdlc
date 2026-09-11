import { spawn } from "node:child_process";
import { cloneSourceRepository } from "./clone-source.js";
import { installAgentSdlc, printInstallSummary } from "./install.js";
import {
  CLAUDE_PLUGIN_VENDOR_DIR_NAME,
  refreshClaudeCodeProjectMarketplace,
} from "./claude-plugin.js";
import type { ParsedUpdateArgs } from "./parse-update-args.js";
import type { InstallMode } from "./types.js";

const VENDOR_PATHS = [
  ".cursor/skills",
  ".cursor/commands",
  ".cursor/rules",
  CLAUDE_PLUGIN_VENDOR_DIR_NAME,
];

export async function runAgentSdlcUpdate(
  parsed: ParsedUpdateArgs,
): Promise<void> {
  if (parsed.profile === "vendor") {
    await runVendorUpdate(parsed);
    return;
  }

  if (parsed.profile === "global-cli") {
    await runCheckoutUpdate(parsed, "global-cli");
    return;
  }

  await runCheckoutUpdate(parsed, "dev");
}

async function runCheckoutUpdate(
  parsed: ParsedUpdateArgs,
  mode: Extract<InstallMode, "dev" | "global-cli">,
): Promise<void> {
  const checkoutRoot = parsed.sourceRoot;

  if (parsed.pull) {
    await runGitCommand(["pull"], checkoutRoot, parsed.dryRun);
  }

  await runNpmCommand(["install"], checkoutRoot, parsed.dryRun);

  const result = await installAgentSdlc({
    mode,
    sourceRoot: checkoutRoot,
    targetRoot: checkoutRoot,
    dryRun: parsed.dryRun,
  });

  printInstallSummary(result);

  if (mode === "dev") {
    await refreshClaudeCodeProjectMarketplace(checkoutRoot, checkoutRoot, parsed.dryRun);
  }

  printUpdateSummary(parsed.profile);
}

async function runVendorUpdate(parsed: ParsedUpdateArgs): Promise<void> {
  const cloned = await cloneSourceRepository(parsed.sourceUrl, parsed.dryRun);
  const sourceRoot = cloned.sourceRoot;

  try {
    const result = await installAgentSdlc({
      mode: "vendor-full",
      sourceRoot,
      targetRoot: parsed.targetRoot,
      dryRun: parsed.dryRun,
    });

    printInstallSummary(result);

    await refreshClaudeCodeProjectMarketplace(parsed.targetRoot, sourceRoot, parsed.dryRun);

    if (parsed.commit) {
      await commitVendorPaths(parsed);
    }

    printUpdateSummary("vendor");
  } finally {
    await cloned.cleanup();
  }
}

async function commitVendorPaths(parsed: ParsedUpdateArgs): Promise<void> {
  const paths = VENDOR_PATHS.join(" ");
  const message = parsed.commitMessage;

  if (parsed.dryRun) {
    console.log(`git add ${paths}`);
    console.log(`git commit -m "${message}"`);
    return;
  }

  await runGitCommand(["add", ...VENDOR_PATHS], parsed.targetRoot, false);
  await runGitCommand(["commit", "-m", message], parsed.targetRoot, false);
}

function printUpdateSummary(profile: ParsedUpdateArgs["profile"]): void {
  const messages: Record<ParsedUpdateArgs["profile"], string> = {
    dev: "Update complete (this checkout). Reload Cursor (Developer: Reload Window). Claude Code needed no refresh unless a project-scope GitHub marketplace was detected above (Claude Code's local install always reads live).",
    vendor: "Vendor update complete (target repo). Push the commit when ready — includes the Cursor .cursor/* copies and the Claude Code ad hoc bundle (.agent-sdlc-plugin/, see note above).",
    "global-cli": "Global CLI update complete. agent-sdlc-drain is refreshed.",
  };

  console.log("");
  console.log(messages[profile]);
}

function runGitCommand(
  args: string[],
  cwd: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`git ${args.join(" ")} (dry run)`);
    return Promise.resolve();
  }

  return runCommand("git", args, cwd);
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

  return runCommand("npm", args, cwd);
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${String(code)}`,
        ),
      );
    });
  });
}
