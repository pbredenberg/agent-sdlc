import { resolve } from "node:path";
import { defaultSourceRoot, requireValue, splitArgv } from "../shared/argv-utils.js";
import { installModeHelpLines, resolveInstallMode } from "./mode-aliases.js";
import type { InstallMode, InstallOptions } from "./types.js";

export { defaultSourceRoot } from "../shared/argv-utils.js";

export type ParsedInstallArgs = InstallOptions & {
  sourceUrl: string | null;
  help: boolean;
};

const VALUE_FLAGS = ["--mode", "--source", "--target", "--source-url"];

export function printInstallUsage(): void {
  const modeLines = installModeHelpLines();
  console.error(`Usage: agent-sdlc-install [mode] [target] [options]
       npm run install:plugin -- [mode] [target] [options]
       npm run setup | install:dev | install:cloud | vendor -- <target>

Install agent-sdlc for Desktop, Cloud Agents, or application repositories.

${modeLines.join("\n")}

Options:
  --mode <mode>    Same as the first positional argument
  --source <path>  agent-sdlc checkout (default: this repository)
  --target <path>  Target repo root (default: --source; required for vendor-*)
  --source-url <url>
                   Clone upstream for vendor-* when --source is omitted
                   (default: https://github.com/pbredenberg/agent-sdlc.git)
  --dry-run        Print actions without writing files
  --help           Show this help

Examples:
  npm run setup
  agent-sdlc-install dev
  npm run install:cloud
  agent-sdlc-install vendor /path/to/app
  agent-sdlc-install vendor . --source-url https://github.com/pbredenberg/agent-sdlc.git
  npm run install:global-cli
`);
}

export function parseInstallArgs(argv: string[]): ParsedInstallArgs {
  const split = splitArgv(argv, VALUE_FLAGS);
  let mode: InstallMode | null = null;
  let sourceRoot = defaultSourceRoot();
  let targetRoot = sourceRoot;
  let sourceUrl: string | null = null;
  let dryRun = false;
  let help = false;

  for (let i = 0; i < split.flagTokens.length; i++) {
    const arg = split.flagTokens[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--mode") {
      mode = resolveInstallMode(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--source") {
      sourceRoot = resolve(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--target") {
      targetRoot = resolve(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--source-url") {
      sourceUrl = requireValue(arg, split.flagTokens[++i]);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (split.positionals[0]) {
    mode = resolveInstallMode(split.positionals[0]);
  }

  if (split.positionals[1]) {
    targetRoot = resolve(split.positionals[1]);
  }

  if (help) {
    return {
      mode: "dev",
      sourceRoot,
      targetRoot,
      sourceUrl,
      dryRun,
      help: true,
    };
  }

  const resolvedMode = mode ?? "dev";
  validateModeTargets(resolvedMode, sourceRoot, targetRoot);

  return {
    mode: resolvedMode,
    sourceRoot,
    targetRoot,
    sourceUrl,
    dryRun,
    help: false,
  };
}

function validateModeTargets(
  mode: InstallMode,
  sourceRoot: string,
  targetRoot: string,
): void {
  const vendorModes: InstallMode[] = ["vendor-full", "vendor-minimal"];
  const needsDistinctTarget = vendorModes.includes(mode);
  const sameTarget = sourceRoot === targetRoot;

  if (needsDistinctTarget && sameTarget) {
    throw new Error(`${mode} requires a target path (second argument or --target)`);
  }
}
