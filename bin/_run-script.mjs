import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function runScript(scriptRelativePath) {
  const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(join(packageRoot, "package.json"));
  const tsxLoader = pathToFileURL(require.resolve("tsx")).href;
  const script = join(packageRoot, scriptRelativePath);
  const args = ["--import", tsxLoader, script, ...process.argv.slice(2)];

  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  process.exit(result.status ?? 1);
}
