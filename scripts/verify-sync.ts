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
  return result.stdout.trim().split("\n").filter(Boolean);
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

async function main() {
  const scratchRoot = await mkdtemp(join(tmpdir(), "agent-sdlc-verify-sync-"));

  try {
    await regenerateCursorDirs(repoRoot, scratchRoot);

    const mismatches = [
      ...diffDirs(skillsDestDir(scratchRoot), skillsDestDir(repoRoot)),
      ...diffDirs(commandsDestDir(scratchRoot), commandsDestDir(repoRoot)),
      ...diffDirs(rulesDestDir(scratchRoot), rulesDestDir(repoRoot)),
      ...(await diffSharedPluginFields()),
    ];

    if (mismatches.length > 0) {
      console.error(
        "verify-sync: committed .cursor/{skills,commands,rules} or plugin.json shared fields have drifted from their source.\n",
      );
      for (const line of mismatches) {
        console.error(`  ${line}`);
      }
      console.error(
        "\nRun `npm run install:dev` and commit the result, or edit the divergent plugin.json field in both files.",
      );
      process.exitCode = 1;
      return;
    }

    console.log("verify-sync: .cursor/{skills,commands,rules} and plugin.json shared fields are in sync.");
  } finally {
    await rm(scratchRoot, { recursive: true, force: true });
  }
}

await main();
