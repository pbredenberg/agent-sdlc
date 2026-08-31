export { installAgentSdlc, printInstallSummary } from "./install.js";
export { cloneSourceRepository } from "./clone-source.js";
export {
  DEFAULT_SOURCE_URL,
  LOCAL_PLUGIN_DIR,
  commandsDestDir,
  commandsSourceDir,
  pluginManifestPath,
  sdlcCommandDest,
  sdlcSkillDest,
  skillsDestDir,
  skillsSourceDir,
} from "./paths.js";
export {
  defaultSourceRoot,
  parseInstallArgs,
  printInstallUsage,
} from "./parse-args.js";
export type { InstallMode, InstallOptions, InstallResult } from "./types.js";
export { installModeHelpLines, resolveInstallMode } from "./mode-aliases.js";
export {
  parseUpdateArgs,
  printUpdateUsage,
} from "./parse-update-args.js";
export { runAgentSdlcUpdate } from "./update.js";
