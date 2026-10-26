import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentPromptFn } from "./drain.js";

/**
 * Pre-approved so a headless run doesn't stall on tool prompts. Deliberately
 * not `bypassPermissions` — this keeps Claude Code's safety rails for
 * anything outside this allowlist instead of disabling them entirely.
 */
const ALLOWED_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"];

export const claudeAgentPrompt: AgentPromptFn = async (prompt, options) => {
  let sessionId: string | undefined;
  let status = "error";
  let result: string | undefined;

  for await (const message of query({
    prompt,
    options: {
      cwd: options.local.cwd,
      model: options.model.id,
      permissionMode: "acceptEdits",
      allowedTools: ALLOWED_TOOLS,
    },
  })) {
    if ("session_id" in message && typeof message.session_id === "string") {
      sessionId = message.session_id;
    }

    if (message.type === "result") {
      const succeeded = message.subtype === "success" && !message.is_error;
      status = succeeded ? "finished" : message.subtype;
      result = message.subtype === "success" ? message.result : message.errors.join("; ");
    }
  }

  return { status, id: sessionId, agentId: sessionId, result };
};
