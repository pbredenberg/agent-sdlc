const PLAN_FILE_RE = /^(\d{2})-.+\.md$/;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

const YAML_STRING_RE = /^["']?(.+?)["']?$/;

export function parsePlanFileName(fileName: string): number | null {
  const match = PLAN_FILE_RE.exec(fileName);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export function parseYamlList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === "[]" || trimmed === "") {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === "") {
      return [];
    }
    return inner.split(",").map((item) => {
      return parseYamlString(item.trim());
    });
  }

  return [parseYamlString(trimmed)];
}

function parseYamlString(value: string): string {
  const match = YAML_STRING_RE.exec(value);
  if (!match) {
    return value;
  }
  return match[1];
}

export type ParsedFrontmatter = {
  id: string;
  title: string;
  dependsOn: string[];
  parallelGroup: string | null;
};

export function parseFrontmatter(markdown: string): ParsedFrontmatter | null {
  const match = FRONTMATTER_RE.exec(markdown);
  if (!match) {
    return null;
  }

  const yaml = match[1];
  const fields: Record<string, string> = {};

  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }

  const id = fields.id ? parseYamlString(fields.id) : "";
  const title = fields.title ? parseYamlString(fields.title) : "";

  if (id === "" || title === "") {
    return null;
  }

  const dependsOn = fields.depends_on ? parseYamlList(fields.depends_on) : [];
  const parallelRaw = fields.parallel_group?.trim() ?? "null";
  const parallelGroup =
    parallelRaw === "null" || parallelRaw === "" ? null : parseYamlString(parallelRaw);

  return { id, title, dependsOn, parallelGroup };
}

export function buildCommitMessagePattern(phase: string, title?: string): RegExp {
  const escaped = phase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (title) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^exec-plan\\(${escaped}\\):\\s+${escapedTitle}`, "m");
  }
  return new RegExp(`^exec-plan\\(${escaped}\\):\\s+.+`, "m");
}
