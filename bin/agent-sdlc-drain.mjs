#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(packageRoot, "package.json"));
const tsxLoader = pathToFileURL(require.resolve("tsx")).href;
const script = join(packageRoot, "scripts", "drain-execution-plans.ts");
const args = ["--import", tsxLoader, script, ...process.argv.slice(2)];

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

const exitCode = result.status ?? 1;
process.exit(exitCode);
