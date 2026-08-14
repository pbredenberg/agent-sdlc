export type InstallMode =
  | "dev"
  | "cloud"
  | "desktop"
  | "vendor-full"
  | "vendor-minimal"
  | "global-cli";

export type InstallOptions = {
  mode: InstallMode;
  sourceRoot: string;
  targetRoot: string;
  dryRun: boolean;
};

export type InstallStep = {
  label: string;
  run: () => Promise<void> | void;
};

export type InstallResult = {
  mode: InstallMode;
  sourceRoot: string;
  targetRoot: string;
  steps: string[];
};
