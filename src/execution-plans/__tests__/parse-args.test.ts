import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_MODEL,
  finalizeDrainArgs,
  parseDrainArgs,
} from "../parse-args.js";

const ORIGINAL_CURSOR_API_KEY = process.env.CURSOR_API_KEY;
const ORIGINAL_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function withArgv(args: string[]): string[] {
  return ["node", "agent-sdlc-drain", ...args];
}

describe("parseDrainArgs backend selection", () => {
  beforeEach(() => {
    delete process.env.CURSOR_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_CURSOR_API_KEY === undefined) {
      delete process.env.CURSOR_API_KEY;
    } else {
      process.env.CURSOR_API_KEY = ORIGINAL_CURSOR_API_KEY;
    }
    if (ORIGINAL_ANTHROPIC_API_KEY === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = ORIGINAL_ANTHROPIC_API_KEY;
    }
  });

  it("defaults to the cursor backend and its default model", () => {
    const options = parseDrainArgs(withArgv(["--phase", "example-phase"]));
    expect(options.backend).toBe("cursor");
    expect(options.model).toBe(DEFAULT_MODEL);
  });

  it("selects the claude backend and its default model", () => {
    const options = parseDrainArgs(withArgv(["--phase", "example-phase", "--backend", "claude"]));
    expect(options.backend).toBe("claude");
    expect(options.model).toBe(DEFAULT_CLAUDE_MODEL);
  });

  it("lets an explicit --model override the backend default", () => {
    const options = parseDrainArgs(
      withArgv(["--phase", "example-phase", "--backend", "claude", "--model", "claude-opus-5"]),
    );
    expect(options.model).toBe("claude-opus-5");
  });

  it("rejects an unknown --backend value", () => {
    expect(() => {
      parseDrainArgs(withArgv(["--phase", "example-phase", "--backend", "gpt"]));
    }).toThrow(/--backend/);
  });

  it("reads CURSOR_API_KEY for the cursor backend", () => {
    process.env.CURSOR_API_KEY = "cursor-key";
    const options = parseDrainArgs(withArgv(["--phase", "example-phase"]));
    expect(options.apiKey).toBe("cursor-key");
  });

  it("reads ANTHROPIC_API_KEY for the claude backend", () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    const options = parseDrainArgs(withArgv(["--phase", "example-phase", "--backend", "claude"]));
    expect(options.apiKey).toBe("anthropic-key");
  });

  it("does not fall back to CURSOR_API_KEY when using the claude backend", () => {
    process.env.CURSOR_API_KEY = "cursor-key";
    const options = parseDrainArgs(withArgv(["--phase", "example-phase", "--backend", "claude"]));
    expect(options.apiKey).toBeNull();
  });
});

describe("finalizeDrainArgs backend defaults", () => {
  const base = {
    phase: "example-phase",
    allPhases: false,
    cwd: "/repo",
    maxPlans: null,
    maxParallel: 1,
    maxAcceptanceRetries: 2,
    dryRun: true,
    skipAcceptance: false,
  };

  it("uses the cursor default model when model is null and backend is cursor", () => {
    const options = finalizeDrainArgs({ ...base, backend: "cursor", model: null });
    expect(options.model).toBe(DEFAULT_MODEL);
  });

  it("uses the claude default model when model is null and backend is claude", () => {
    const options = finalizeDrainArgs({ ...base, backend: "claude", model: null });
    expect(options.model).toBe(DEFAULT_CLAUDE_MODEL);
  });
});
