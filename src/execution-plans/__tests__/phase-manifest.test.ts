import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  formatCrossPhaseBlockMessage,
  getCrossPhaseBlocks,
  getRunnablePhases,
  loadPhaseManifest,
  parsePhaseManifestYaml,
} from "../phase-manifest.js";

const SAMPLE_MANIFEST = `active:
  - composition-ir
  - preview-editor
  - export-pipeline
  - hardening-qa

depends:
  preview-editor: [composition-ir]
  export-pipeline: [composition-ir]
  hardening-qa: [preview-editor, export-pipeline]
`;

describe("parsePhaseManifestYaml", () => {
  it("parses active and depends sections", () => {
    const manifest = parsePhaseManifestYaml(SAMPLE_MANIFEST);
    expect(manifest).toEqual({
      active: ["composition-ir", "preview-editor", "export-pipeline", "hardening-qa"],
      depends: {
        "preview-editor": ["composition-ir"],
        "export-pipeline": ["composition-ir"],
        "hardening-qa": ["preview-editor", "export-pipeline"],
      },
    });
  });

  it("returns null when active is empty", () => {
    expect(parsePhaseManifestYaml("depends:\n  a: [b]\n")).toBeNull();
  });
});

describe("getRunnablePhases", () => {
  const manifest = parsePhaseManifestYaml(SAMPLE_MANIFEST);
  if (manifest === null) {
    throw new Error("fixture manifest missing");
  }

  it("returns roots when only first wave has pending plans", () => {
    const pendingByPhase = {
      "composition-ir": 1,
      "preview-editor": 4,
      "export-pipeline": 2,
      "hardening-qa": 1,
    };
    const phasesWithPending = manifest.active.filter((phase) => {
      return pendingByPhase[phase as keyof typeof pendingByPhase] > 0;
    });

    expect(getRunnablePhases(manifest, phasesWithPending, pendingByPhase)).toEqual([
      "composition-ir",
    ]);
  });

  it("returns parallel siblings after composition-ir drains", () => {
    const pendingByPhase = {
      "composition-ir": 0,
      "preview-editor": 4,
      "export-pipeline": 2,
      "hardening-qa": 1,
    };
    const phasesWithPending = manifest.active.filter((phase) => {
      return pendingByPhase[phase as keyof typeof pendingByPhase] > 0;
    });

    expect(getRunnablePhases(manifest, phasesWithPending, pendingByPhase)).toEqual([
      "export-pipeline",
      "preview-editor",
    ]);
  });

  it("blocks hardening-qa until siblings drain", () => {
    const pendingByPhase = {
      "composition-ir": 0,
      "preview-editor": 0,
      "export-pipeline": 2,
      "hardening-qa": 1,
    };
    const phasesWithPending = manifest.active.filter((phase) => {
      return pendingByPhase[phase as keyof typeof pendingByPhase] > 0;
    });

    expect(getRunnablePhases(manifest, phasesWithPending, pendingByPhase)).toEqual([
      "export-pipeline",
    ]);
  });
});

describe("formatCrossPhaseBlockMessage", () => {
  it("formats waiting phases", () => {
    const blocks = getCrossPhaseBlocks(
      parsePhaseManifestYaml(SAMPLE_MANIFEST) as NonNullable<ReturnType<typeof parsePhaseManifestYaml>>,
      ["hardening-qa"],
      {
        "composition-ir": 0,
        "preview-editor": 1,
        "export-pipeline": 2,
        "hardening-qa": 1,
      },
    );

    expect(formatCrossPhaseBlockMessage(blocks)).toBe(
      "Blocked: unsatisfied cross-phase dependencies\n  hardening-qa waiting on: preview-editor, export-pipeline",
    );
  });
});

describe("loadPhaseManifest", () => {
  it("returns null when phases.yaml is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-sdlc-manifest-"));
    expect(await loadPhaseManifest(root)).toBeNull();
  });

  it("loads manifest from docs/execution-plans/phases.yaml", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-sdlc-manifest-"));
    const plansRoot = join(root, "docs/execution-plans");
    await mkdir(plansRoot, { recursive: true });
    await writeFile(join(plansRoot, "phases.yaml"), SAMPLE_MANIFEST, "utf8");

    const manifest = await loadPhaseManifest(root);
    expect(manifest?.active).toContain("composition-ir");
    expect(manifest?.depends["hardening-qa"]).toEqual(["preview-editor", "export-pipeline"]);
  });
});
