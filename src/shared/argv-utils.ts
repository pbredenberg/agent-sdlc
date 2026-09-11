import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function defaultSourceRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

export type SplitArgv = {
  flagTokens: string[];
  positionals: string[];
};

export function splitArgv(argv: string[], valueFlags: Iterable<string>): SplitArgv {
  const flagTokens: string[] = [];
  const positionals: string[] = [];
  const valueFlagSet = new Set(valueFlags);

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const isFlag = arg.startsWith("-");

    if (!isFlag) {
      positionals.push(arg);
      continue;
    }

    flagTokens.push(arg);

    if (!valueFlagSet.has(arg)) {
      continue;
    }

    const next = argv[i + 1];
    const hasValue = Boolean(next) && !next.startsWith("-");
    if (!hasValue) {
      continue;
    }

    flagTokens.push(next);
    i++;
  }

  return { flagTokens, positionals };
}

export function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}
