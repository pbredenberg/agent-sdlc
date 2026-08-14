import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export async function cloneSourceRepository(
  sourceUrl: string,
  dryRun: boolean,
): Promise<{ sourceRoot: string; cleanup: () => Promise<void> }> {
  if (dryRun) {
    return {
      sourceRoot: "/tmp/agent-sdlc-dry-run",
      cleanup: async () => {},
    };
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "agent-sdlc-install-"));
  const cloneDir = join(tempRoot, "agent-sdlc");

  await runGitClone(sourceUrl, cloneDir);

  const cleanup = async () => {
    await rm(tempRoot, { recursive: true, force: true });
  };

  return { sourceRoot: cloneDir, cleanup };
}

function runGitClone(sourceUrl: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      ["clone", "--depth", "1", sourceUrl, destination],
      { stdio: "inherit" },
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`git clone failed with exit code ${String(code)}`));
    });
  });
}
