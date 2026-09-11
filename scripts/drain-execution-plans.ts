#!/usr/bin/env node
import { Agent, CursorAgentError } from "@cursor/sdk";
import { claudeAgentPrompt } from "../src/execution-plans/claude-agent-prompt.js";
import {
  drainExecutionPlans,
  EXIT_STARTUP,
  parseDrainArgs,
  printDrainUsage,
} from "../src/execution-plans/index.js";
import type { AgentPromptFn } from "../src/execution-plans/index.js";

const cursorAgentPrompt: AgentPromptFn = async (prompt, agentOptions) => {
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
};

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
