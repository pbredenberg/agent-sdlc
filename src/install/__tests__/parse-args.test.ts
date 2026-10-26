import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveInstallMode } from "../mode-aliases.js";
import {
  defaultSourceRoot,
  parseInstallArgs,
} from "../parse-args.js";

describe("resolveInstallMode", () => {
  it("resolves vendor alias", () => {
    expect(resolveInstallMode("vendor")).toBe("vendor-full");
  });

  it("resolves minimal alias", () => {
    expect(resolveInstallMode("minimal")).toBe("vendor-minimal");
  });
});

describe("parseInstallArgs", () => {
  it("parses dev mode with defaults", () => {
    const result = parseInstallArgs(["node", "install.ts", "dev"]);
    expect(result.mode).toBe("dev");
    expect(result.sourceRoot).toBe(defaultSourceRoot());
    expect(result.targetRoot).toBe(defaultSourceRoot());
    expect(result.dryRun).toBe(false);
    expect(result.help).toBe(false);
  });

  it("defaults to dev when mode is omitted", () => {
    const result = parseInstallArgs(["node", "install.ts"]);
    expect(result.mode).toBe("dev");
  });

  it("parses vendor-full with positional target", async () => {
    const target = await mkdtemp(join(tmpdir(), "app-"));
    const result = parseInstallArgs([
      "node",
      "install.ts",
      "vendor",
      target,
      "--dry-run",
    ]);

    expect(result.mode).toBe("vendor-full");
    expect(result.targetRoot).toBe(target);
    expect(result.dryRun).toBe(true);
  });

  it("still accepts --mode flag", () => {
    const result = parseInstallArgs([
      "node",
      "install.ts",
      "--mode",
      "cloud",
    ]);
    expect(result.mode).toBe("cloud");
  });

  it("requires target for vendor modes", () => {
    expect(() => {
      parseInstallArgs(["node", "install.ts", "vendor-full"]);
    }).toThrow(/requires a target path/);
  });

  it("returns help flag", () => {
    const result = parseInstallArgs(["node", "install.ts", "--help"]);
    expect(result.help).toBe(true);
  });
});
