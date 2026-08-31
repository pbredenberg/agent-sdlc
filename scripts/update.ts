#!/usr/bin/env node
import {
  parseUpdateArgs,
  printUpdateUsage,
} from "../src/install/parse-update-args.js";
import { runAgentSdlcUpdate } from "../src/install/update.js";

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseUpdateArgs(process.argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    printUpdateUsage();
    process.exit(1);
  }

  if (parsed.help) {
    printUpdateUsage();
    process.exit(0);
  }

  await runAgentSdlcUpdate(parsed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
