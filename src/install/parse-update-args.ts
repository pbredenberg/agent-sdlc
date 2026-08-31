import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installModeHelpLines } from "./mode-aliases.js";
import { pluginManifestPath, sdlcSkillDest } from "./paths.js";
import { DEFAULT_SOURCE_URL } from "./paths.js";

export type UpdateProfile = "dev" | "vendor" | "global-cli";

export type ParsedUpdateArgs = {
  profile: UpdateProfile;
  cwd: string;
  sourceUrl: string;
  sourceRoot: string;
  targetRoot: string;
  pull: boolean;
  commit: boolean;
  commitMessage: string;
  dryRun: boolean;
  help: boolean;
};

export function defaultSourceRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

export function printUpdateUsage(): void {
  const modeLines = installModeHelpLines();
  console.error(`Usage: agent-sdlc-update [profile] [options]
       npm run update [-- profile] [options]

Refresh agent-sdlc after upstream changes.

Profiles (auto-detected when omitted):
  dev          In the agent-sdlc checkout: git pull, npm install, reinstall dev
  vendor       In an app repo: re-copy skills from upstream into the current directory
  global-cli   In the agent-sdlc checkout: git pull, npm install, npm link drain CLI

Options:
  --profile <name>   Force dev, vendor, or global-cli
  --cwd <path>       Working directory (default: current directory)
  --source <path>    agent-sdlc checkout for dev/global-cli (default: package root)
  --target <path>    App repo for vendor profile (default: --cwd)
  --source-url <url> Upstream for vendor profile
                     (default: ${DEFAULT_SOURCE_URL})
  --no-pull          Skip git pull (dev and global-cli only)
  --commit           Stage and commit vendored .cursor files (vendor only)
  --message <text>   Commit message with --commit
                     (default: chore: refresh agent-sdlc skills)
  --dry-run          Print actions without writing files
  --help             Show this help

Install modes (for reference):
${modeLines.join("\n")}

Examples:
  npm run update
  agent-sdlc-update vendor --commit
  agent-sdlc-update global-cli
  npx github:pbredenberg/agent-sdlc update
`);
}

export function parseUpdateArgs(argv: string[]): ParsedUpdateArgs {
  const split = splitArgv(argv);
  let profile: UpdateProfile | null = null;
  let cwd = process.cwd();
  let sourceRoot = defaultSourceRoot();
  let targetRoot = cwd;
  let sourceUrl = DEFAULT_SOURCE_URL;
  let pull = true;
  let commit = false;
  let commitMessage = "chore: refresh agent-sdlc skills";
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

    if (arg === "--no-pull") {
      pull = false;
      continue;
    }

    if (arg === "--commit") {
      commit = true;
      continue;
    }

    if (arg === "--profile") {
      profile = parseProfile(requireValue(arg, split.flagTokens[++i]));
      continue;
    }

    if (arg === "--cwd") {
      cwd = resolve(requireValue(arg, split.flagTokens[++i]));
      targetRoot = cwd;
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

    if (arg === "--message" || arg === "-m") {
      commitMessage = requireValue(arg, split.flagTokens[++i]);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (split.positionals[0]) {
    profile = parseProfile(split.positionals[0]);
  }

  if (help) {
    return buildParsedArgs({
      profile: "dev",
      cwd,
      sourceRoot,
      targetRoot,
      sourceUrl,
      pull,
      commit,
      commitMessage,
      dryRun,
      help: true,
    });
  }

  const resolvedProfile = profile ?? detectUpdateProfile(cwd, sourceRoot);
  return buildParsedArgs({
    profile: resolvedProfile,
    cwd,
    sourceRoot,
    targetRoot,
    sourceUrl,
    pull,
    commit,
    commitMessage,
    dryRun,
    help: false,
  });
}

function buildParsedArgs(values: ParsedUpdateArgs): ParsedUpdateArgs {
  return values;
}

function detectUpdateProfile(cwd: string, sourceRoot: string): UpdateProfile {
  const pluginAtCwd = existsSync(pluginManifestPath(cwd));
  if (pluginAtCwd) {
    return "dev";
  }

  const vendoredAtCwd = existsSync(sdlcSkillDest(cwd));
  if (vendoredAtCwd) {
    return "vendor";
  }

  const pluginAtSource = existsSync(pluginManifestPath(sourceRoot));
  if (pluginAtSource) {
    return "dev";
  }

  throw new Error(
    "could not detect update profile — pass dev, vendor, or global-cli",
  );
}

function parseProfile(value: string): UpdateProfile {
  const normalized = value.trim().toLowerCase();
  const profiles: UpdateProfile[] = ["dev", "vendor", "global-cli"];

  if (profiles.includes(normalized as UpdateProfile)) {
    return normalized as UpdateProfile;
  }

  throw new Error(`invalid profile ${value}`);
}

type SplitArgv = {
  flagTokens: string[];
  positionals: string[];
};

function splitArgv(argv: string[]): SplitArgv {
  const flagTokens: string[] = [];
  const positionals: string[] = [];
  const valueFlags = new Set([
    "--profile",
    "--cwd",
    "--source",
    "--target",
    "--source-url",
    "--message",
    "-m",
  ]);

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const isFlag = arg.startsWith("-");

    if (!isFlag) {
      positionals.push(arg);
      continue;
    }

    flagTokens.push(arg);

    if (!valueFlags.has(arg)) {
      continue;
    }

    const next = argv[i + 1];
    const hasValue = Boolean(next) && !next.startsWith("-");
    if (!hasValue) {
      continue;
    }

    flagTokens.push(next);
    i++;
  }

  return { flagTokens, positionals };
}

function requireValue(flag: string, value: string | undefined): string {
  if (value) {
    return value;
  }

  throw new Error(`${flag} requires a value`);
}
