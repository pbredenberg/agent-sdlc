#!/usr/bin/env node
import { Agent, CursorAgentError } from "@cursor/sdk";
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

  try {
    const code = await drainExecutionPlans(options, {
      agentPrompt: async (prompt, agentOptions) => {
        await using agent = await Agent.create(agentOptions);
        const run = await agent.send(prompt);
        console.log(`agentId=${agent.agentId} runId=${run.id}`);
        const result = await run.wait();
        return {
          status: result.status,
          id: result.id,
          agentId: agent.agentId,
          result: result.result,
        };
      },
    });
    process.exit(code);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(
        `CursorAgentError: ${err.message} (retryable=${String(err.isRetryable)})`,
      );
      process.exit(EXIT_STARTUP);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_STARTUP);
});
