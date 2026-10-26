#!/usr/bin/env node
import { cloneSourceRepository } from "../src/install/clone-source.js";
import {
  installAgentSdlc,
  printInstallSummary,
} from "../src/install/install.js";
import {
  parseInstallArgs,
  printInstallUsage,
} from "../src/install/parse-args.js";
import { DEFAULT_SOURCE_URL } from "../src/install/paths.js";

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseInstallArgs(process.argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    printInstallUsage();
    process.exit(1);
  }

  if (parsed.help) {
    printInstallUsage();
    process.exit(0);
  }

  let sourceRoot = parsed.sourceRoot;
  let cleanup = async () => {};

  const shouldCloneSource = parsed.sourceUrl !== null;
  if (shouldCloneSource) {
    const sourceUrl = parsed.sourceUrl ?? DEFAULT_SOURCE_URL;
    const cloned = await cloneSourceRepository(sourceUrl, parsed.dryRun);
    sourceRoot = cloned.sourceRoot;
    cleanup = cloned.cleanup;
  }

  try {
    const result = await installAgentSdlc({
      mode: parsed.mode,
      sourceRoot,
      targetRoot: parsed.targetRoot,
      dryRun: parsed.dryRun,
    });
    printInstallSummary(result);
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
