import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export async function ensureDir(path: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }

  await mkdir(path, { recursive: true });
}

export async function removePath(path: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }

  await rm(path, { recursive: true, force: true });
}

export async function copyPath(
  source: string,
  destination: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    return;
  }

  await cp(source, destination, { recursive: true, force: true });
}

export async function listChildDirectories(parent: string): Promise<string[]> {
  const entries = await readdir(parent, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name));
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function copyDirectoryChildren(
  sourceDir: string,
  destDir: string,
  dryRun: boolean,
): Promise<string[]> {
  const copied: string[] = [];
  const children = await listChildDirectories(sourceDir);

  await ensureDir(destDir, dryRun);

  for (const childPath of children) {
    const childName = childPath.split("/").pop() ?? childPath;
    const destination = join(destDir, childName);
    await removePath(destination, dryRun);
    await copyPath(childPath, destination, dryRun);
    copied.push(childName);
  }

  return copied;
}

export async function copyFilesByExtension(
  sourceDir: string,
  destDir: string,
  extensions: string[],
  dryRun: boolean,
): Promise<string[]> {
  const copied: string[] = [];
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const extensionSet = new Set(extensions);

  await ensureDir(destDir, dryRun);

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = entry.name.split(".").pop() ?? "";
    const matchesExtension = extensionSet.has(extension);
    if (!matchesExtension) {
      continue;
    }

    const source = join(sourceDir, entry.name);
    const destination = join(destDir, entry.name);
    await copyPath(source, destination, dryRun);
    copied.push(entry.name);
  }

  return copied;
}
