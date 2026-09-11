import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  copyDirectoryChildren,
  copyFilesByExtension,
  pathExists,
} from "../src/install/copy-tree.js";
import {
  commandsDestDir,
  commandsSourceDir,
  rulesDestDir,
  rulesSourceDir,
  skillsDestDir,
  skillsSourceDir,
} from "../src/install/paths.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

async function regenerateCursorDirs(sourceRoot: string, targetRoot: string) {
  await copyDirectoryChildren(
    skillsSourceDir(sourceRoot),
    skillsDestDir(targetRoot),
    false,
  );
  await copyFilesByExtension(
    commandsSourceDir(sourceRoot),
    commandsDestDir(targetRoot),
    ["md", "mdc", "markdown", "txt"],
    false,
  );
  const rulesSource = rulesSourceDir(sourceRoot);
  if (await pathExists(rulesSource)) {
    await copyFilesByExtension(rulesSource, rulesDestDir(targetRoot), ["mdc"], false);
  }
}

function diffDirs(expected: string, actual: string): string[] {
  const result = spawnSync("diff", ["-rq", expected, actual], {
    encoding: "utf8",
  });
  if (result.status === 0) {
    return [];
  }

  // diff exits non-zero both for real content differences (reported on
  // stdout) and for a missing path entirely (reported on stderr, e.g. one
  // side of the comparison was deleted) — surface both, or a generic
  // fallback, so a non-zero exit can never be silently swallowed as "in sync".
  const lines = [
    ...result.stdout.trim().split("\n").filter(Boolean),
    ...result.stderr.trim().split("\n").filter(Boolean),
  ];
  if (lines.length > 0) {
    return lines;
  }
  return [
    `diff exited with status ${result.status ?? "unknown"} comparing ${expected} vs ${actual}`,
  ];
}

const SHARED_PLUGIN_FIELDS = [
  "name",
  "author",
  "repository",
  "homepage",
  "license",
  "keywords",
  "skills",
] as const;

async function diffSharedPluginFields(): Promise<string[]> {
  const claude = JSON.parse(
    await readFile(join(repoRoot, ".claude-plugin/plugin.json"), "utf8"),
  );
  const cursor = JSON.parse(
    await readFile(join(repoRoot, ".cursor-plugin/plugin.json"), "utf8"),
  );

  const mismatches: string[] = [];
  for (const field of SHARED_PLUGIN_FIELDS) {
    const claudeValue = JSON.stringify(claude[field]);
    const cursorValue = JSON.stringify(cursor[field]);
    if (claudeValue !== cursorValue) {
      mismatches.push(
        `plugin.json field "${field}" differs: .claude-plugin=${claudeValue} .cursor-plugin=${cursorValue}`,
      );
    }
  }
  return mismatches;
}

// marketplace.json is expected to be byte-identical between the two plugin
// dirs. Each platform's marketplace loader needs a real file at its own
// path (symlink tolerance is unverified), so this stays a drift check
// rather than a single shared file.
async function diffMarketplaceFiles(): Promise<string[]> {
  const claude = await readFile(
    join(repoRoot, ".claude-plugin/marketplace.json"),
    "utf8",
  );
  const cursor = await readFile(
    join(repoRoot, ".cursor-plugin/marketplace.json"),
    "utf8",
  );

  if (claude !== cursor) {
    return [
      "marketplace.json differs between .claude-plugin/ and .cursor-plugin/ (expected byte-identical)",
    ];
  }
  return [];
}

async function main() {
  const scratchRoot = await mkdtemp(join(tmpdir(), "agent-sdlc-verify-sync-"));

  try {
    await regenerateCursorDirs(repoRoot, scratchRoot);

    const mismatches = [
      ...diffDirs(skillsDestDir(scratchRoot), skillsDestDir(repoRoot)),
      ...diffDirs(commandsDestDir(scratchRoot), commandsDestDir(repoRoot)),
      ...diffDirs(rulesDestDir(scratchRoot), rulesDestDir(repoRoot)),
      ...(await diffSharedPluginFields()),
      ...(await diffMarketplaceFiles()),
    ];

    if (mismatches.length > 0) {
      console.error(
        "verify-sync: committed generated/mirrored files have drifted from their source.\n",
      );
      for (const line of mismatches) {
        console.error(`  ${line}`);
      }
      console.error(
        "\nFor .cursor/{skills,commands,rules} drift: run `npm run install:dev` and commit the result.\nFor plugin.json/marketplace.json drift: reconcile the divergent field/file by hand in both plugin dirs.",
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      "verify-sync: .cursor/{skills,commands,rules}, plugin.json shared fields, and marketplace.json are in sync.",
    );
  } finally {
    await rm(scratchRoot, { recursive: true, force: true });
  }
}

await main();
