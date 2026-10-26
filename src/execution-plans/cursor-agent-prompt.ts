import { Agent } from "@cursor/sdk";
import type { AgentPromptFn } from "./drain.js";

export const cursorAgentPrompt: AgentPromptFn = async (prompt, options) => {
  await using agent = await Agent.create(options);
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
