import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultSourceRoot,
  parseInstallArgs,
} from "../parse-args.js";

describe("parseInstallArgs", () => {
  it("parses dev mode with defaults", () => {
    const result = parseInstallArgs(["node", "install.ts", "--mode", "dev"]);
    expect(result.mode).toBe("dev");
    expect(result.sourceRoot).toBe(defaultSourceRoot());
    expect(result.targetRoot).toBe(defaultSourceRoot());
    expect(result.dryRun).toBe(false);
    expect(result.help).toBe(false);
  });

  it("parses vendor-full with target", async () => {
    const target = await mkdtemp(join(tmpdir(), "app-"));
    const result = parseInstallArgs([
      "node",
      "install.ts",
      "--mode",
      "vendor-full",
      "--target",
      target,
      "--dry-run",
    ]);

    expect(result.mode).toBe("vendor-full");
    expect(result.targetRoot).toBe(target);
    expect(result.dryRun).toBe(true);
  });

  it("requires target for vendor modes", () => {
    expect(() => {
      parseInstallArgs(["node", "install.ts", "--mode", "vendor-full"]);
    }).toThrow(/requires --target/);
  });

  it("returns help flag", () => {
    const result = parseInstallArgs(["node", "install.ts", "--help"]);
    expect(result.help).toBe(true);
  });
});
