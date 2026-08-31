import type { InstallMode } from "./types.js";

const MODE_ALIASES: Record<string, InstallMode> = {
  vendor: "vendor-full",
  minimal: "vendor-minimal",
};

const VALID_MODES: InstallMode[] = [
  "dev",
  "cloud",
  "desktop",
  "vendor-full",
  "vendor-minimal",
  "global-cli",
];

export function resolveInstallMode(value: string): InstallMode {
  const normalized = value.trim().toLowerCase();
  const alias = MODE_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  if (VALID_MODES.includes(normalized as InstallMode)) {
    return normalized as InstallMode;
  }

  throw new Error(`invalid mode ${value}`);
}

export function installModeHelpLines(): string[] {
  return [
    "Modes (use as first argument or --mode):",
    "  dev              Copy skills/commands into this repo + Desktop local plugin link",
    "  cloud            Copy skills/commands only (Cloud Agents / environment builds)",
    "  desktop          Link ~/.cursor/plugins/local/agent-sdlc only",
    "  vendor-full      Copy full skills + commands into target repo (alias: vendor)",
    "  vendor-minimal   Copy only /sdlc skill + command (alias: minimal)",
    "  global-cli       npm install + npm link in the agent-sdlc checkout (drain CLI)",
  ];
}
