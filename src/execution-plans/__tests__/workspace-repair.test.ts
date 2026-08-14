import { describe, expect, it } from "vitest";
import {
  extractFailedWorkspaces,
  isRepairableScriptFailure,
} from "../workspace-repair.js";

describe("isRepairableScriptFailure", () => {
  it("detects missing next/react typecheck failures", () => {
    const details = `apps/web typecheck: .next/types/app/page.ts(59,14): error TS2503: Cannot find namespace 'React'.
apps/web typecheck: next.config.ts(2,33): error TS2307: Cannot find module 'next' or its corresponding type declarations.`;

    expect(isRepairableScriptFailure("typecheck", details)).toBe(true);
  });

  it("rejects unrelated failures", () => {
    const details = "apps/web typecheck: src/foo.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.";

    expect(isRepairableScriptFailure("typecheck", details)).toBe(false);
  });

  it("rejects empty output", () => {
    expect(isRepairableScriptFailure("typecheck", "")).toBe(false);
    expect(isRepairableScriptFailure("typecheck", undefined)).toBe(false);
  });
});

describe("extractFailedWorkspaces", () => {
  it("extracts workspace prefixes and app paths", () => {
    const details = `apps/web typecheck: .next/types/app/page.ts(59,14): error TS2503
packages/ui lint: src/button.tsx(1,1): error TS2307`;

    expect(extractFailedWorkspaces(details)).toEqual(
      expect.arrayContaining(["apps/web", "packages/ui"]),
    );
  });
});
