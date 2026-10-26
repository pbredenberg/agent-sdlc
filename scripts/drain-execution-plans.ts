#!/usr/bin/env node
import { CursorAgentError } from "@cursor/sdk";
import { claudeAgentPrompt } from "../src/execution-plans/claude-agent-prompt.js";
import { cursorAgentPrompt } from "../src/execution-plans/cursor-agent-prompt.js";
import {
  drainExecutionPlans,
  EXIT_STARTUP,
  parseDrainArgs,
  printDrainUsage,
} from "../src/execution-plans/index.js";

async function main(): Promise<void> {
  let options;
  try {
    options = parseDrainArgs(process.argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    printDrainUsage();
    process.exit(EXIT_STARTUP);
  }

  if (options.help) {
    printDrainUsage();
    process.exit(0);
  }

  const agentPrompt = options.backend === "claude" ? claudeAgentPrompt : cursorAgentPrompt;

  try {
    const code = await drainExecutionPlans(options, { agentPrompt });
    process.exit(code);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `CursorAgentError: ${err.message} (retryable=${String(err.isRetryable)})`,
      );
      process.exit(EXIT_STARTUP);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Agent run failed: ${message}`);
    process.exit(EXIT_STARTUP);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_STARTUP);
});
