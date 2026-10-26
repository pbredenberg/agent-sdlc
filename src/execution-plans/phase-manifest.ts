import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { listPhases, listPendingPlans } from "./list-plans.js";
import { parseYamlList } from "./parse-frontmatter.js";
import { phaseDir, phasesManifestPath } from "./paths.js";

export type PhaseManifest = {
  active: string[];
  depends: Record<string, string[]>;
};

export type CrossPhaseBlock = {
  phase: string;
  waitingOn: string[];
};

function parseYamlString(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseListItem(line: string): string | null {
  const match = /^\s*-\s+(.+)$/.exec(line);
  if (!match) {
    return null;
  }
  return parseYamlString(match[1]);
}

export function parsePhaseManifestYaml(yaml: string): PhaseManifest | null {
  const active: string[] = [];
  const depends: Record<string, string[]> = {};
  let section: "none" | "active" | "depends" = "none";

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed === "active:" || trimmed.startsWith("active:")) {
      section = "active";
      const value = trimmed.slice("active:".length).trim();
      if (value !== "") {
        active.push(...parseYamlList(value));
      }
      continue;
    }

    if (trimmed === "depends:") {
      section = "depends";
      continue;
    }

    if (section === "active") {
      const listItem = parseListItem(line);
      if (listItem !== null) {
        active.push(listItem);
        continue;
      }

      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      if (key !== "active") {
        continue;
      }

      active.push(...parseYamlList(value));
      continue;
    }

    if (section === "depends") {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const phase = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      depends[phase] = parseYamlList(value);
    }
  }

  if (active.length === 0) {
    return null;
  }

  return { active, depends };
}

export async function loadPhaseManifest(repoRoot: string): Promise<PhaseManifest | null> {
  const filePath = phasesManifestPath(repoRoot);
  if (!existsSync(filePath)) {
    return null;
  }

  const raw = await readFile(filePath, "utf8");
  return parsePhaseManifestYaml(raw);
}

export async function countPendingByPhase(
  repoRoot: string,
  phases: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const phase of phases) {
    const directory = phaseDir(repoRoot, phase);
    const pending = await listPendingPlans(repoRoot, phase, directory);
    counts[phase] = pending.length;
  }

  return counts;
}

export function getRunnablePhases(
  manifest: PhaseManifest,
  phasesWithPending: string[],
  pendingByPhase: Record<string, number>,
): string[] {
  const runnable: string[] = [];

  for (const phase of phasesWithPending) {
    const deps = manifest.depends[phase] ?? [];
    const unsatisfied = deps.filter((dep) => {
      return (pendingByPhase[dep] ?? 0) > 0;
    });

    if (unsatisfied.length === 0) {
      runnable.push(phase);
    }
  }

  return runnable.sort();
}

export function getCrossPhaseBlocks(
  manifest: PhaseManifest,
  phasesWithPending: string[],
  pendingByPhase: Record<string, number>,
): CrossPhaseBlock[] {
  const blocks: CrossPhaseBlock[] = [];

  for (const phase of phasesWithPending) {
    const deps = manifest.depends[phase] ?? [];
    const waitingOn = deps.filter((dep) => {
      return (pendingByPhase[dep] ?? 0) > 0;
    });

    if (waitingOn.length > 0) {
      blocks.push({ phase, waitingOn });
    }
  }

  return blocks;
}

export function formatCrossPhaseBlockMessage(blocks: CrossPhaseBlock[]): string {
  const lines = blocks.map((block) => {
    return `  ${block.phase} waiting on: ${block.waitingOn.join(", ")}`;
  });

  return ["Blocked: unsatisfied cross-phase dependencies", ...lines].join("\n");
}

export async function listPhasesForDrain(repoRoot: string): Promise<string[]> {
  const manifest = await loadPhaseManifest(repoRoot);
  if (manifest !== null) {
    return manifest.active;
  }

  return listPhases(repoRoot);
}
