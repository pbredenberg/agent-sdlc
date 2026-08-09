import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dispatchStatePath } from "./paths.js";
import type { DispatchState, DispatchStatus } from "./types.js";

export function createDispatchState(input: {
  phase: string;
  planRelativePaths: string[];
  status: DispatchStatus;
  agentIds: string[];
  runIds: string[];
  message: string | null;
}): DispatchState {
  return {
    phase: input.phase,
    planRelativePaths: input.planRelativePaths,
    status: input.status,
    agentIds: input.agentIds,
    runIds: input.runIds,
    message: input.message,
    updatedAt: new Date().toISOString(),
  };
}

export async function writeDispatchState(
  repoRoot: string,
  state: DispatchState,
): Promise<void> {
  const filePath = dispatchStatePath(repoRoot);
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readDispatchState(
  repoRoot: string,
): Promise<DispatchState | null> {
  const filePath = dispatchStatePath(repoRoot);
  if (!existsSync(filePath)) {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as DispatchState;
}
