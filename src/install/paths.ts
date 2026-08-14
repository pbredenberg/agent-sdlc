import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_SOURCE_URL =
  "https://github.com/pbredenberg/agent-sdlc.git";

export const SKILLS_DIR_NAME = "skills";
export const COMMANDS_DIR_NAME = "commands";
export const RULES_DIR_NAME = "rules";
export const CURSOR_DIR_NAME = ".cursor";
export const PLUGIN_MANIFEST = ".cursor-plugin/plugin.json";
export const SDL_SKILL_NAME = "sdlc";
export const LOCAL_PLUGIN_DIR = join(
  homedir(),
  ".cursor",
  "plugins",
  "local",
  "agent-sdlc",
);

export function skillsSourceDir(sourceRoot: string): string {
  return join(sourceRoot, SKILLS_DIR_NAME);
}

export function commandsSourceDir(sourceRoot: string): string {
  return join(sourceRoot, COMMANDS_DIR_NAME);
}

export function skillsDestDir(targetRoot: string): string {
  return join(targetRoot, CURSOR_DIR_NAME, SKILLS_DIR_NAME);
}

export function commandsDestDir(targetRoot: string): string {
  return join(targetRoot, CURSOR_DIR_NAME, COMMANDS_DIR_NAME);
}

export function rulesSourceDir(sourceRoot: string): string {
  return join(sourceRoot, RULES_DIR_NAME);
}

export function rulesDestDir(targetRoot: string): string {
  return join(targetRoot, CURSOR_DIR_NAME, "rules");
}

export function sdlcRuleDest(targetRoot: string): string {
  return join(rulesDestDir(targetRoot), "sdlc-kit.mdc");
}

export function sdlcSkillDest(targetRoot: string): string {
  return join(skillsDestDir(targetRoot), SDL_SKILL_NAME);
}

export function sdlcCommandDest(targetRoot: string): string {
  return join(commandsDestDir(targetRoot), "sdlc.md");
}

export function pluginManifestPath(sourceRoot: string): string {
  return join(sourceRoot, PLUGIN_MANIFEST);
}
