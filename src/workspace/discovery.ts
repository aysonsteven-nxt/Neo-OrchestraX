import fs from "node:fs";
import path from "node:path";

interface DirectoryEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

export function isOrchestraXDirectory(dir: string): boolean {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as { name?: string };
    return packageJson.name === "neo-orchestrax";
  } catch {
    return false;
  }
}

export function isProjectDirectory(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }) as DirectoryEntry[];
    const files = new Set(entries.filter(entry => entry.isFile()).map(entry => entry.name));
    const directories = new Set(entries.filter(entry => entry.isDirectory()).map(entry => entry.name));

    const projectFiles = [
      "package.json",
      "angular.json",
      "project.json",
      "pom.xml",
      "build.gradle",
      "build.gradle.kts",
      "settings.gradle",
      "settings.gradle.kts",
      "Cargo.toml",
      "go.mod",
      "pyproject.toml",
      "requirements.txt",
      "composer.json"
    ];

    if (projectFiles.some(file => files.has(file))) return true;
    if ([".git", ".devkit", ".orchestrax", ".angular"].some(dirName => directories.has(dirName))) return true;
    if (directories.has("src") && (directories.has("public") || directories.has(".vscode") || directories.has(".idea"))) return true;
    if (["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].some(file => files.has(file))) return true;

    return false;
  } catch {
    return false;
  }
}

export function locateOrchestraX(start: string): { workspaceRoot: string; orchestraxRoot: string } {
  let cursor = path.resolve(start);

  while (true) {
    if (isOrchestraXDirectory(cursor)) {
      return { workspaceRoot: path.dirname(cursor), orchestraxRoot: cursor };
    }

    try {
      const entries = fs.readdirSync(cursor, { withFileTypes: true }) as DirectoryEntry[];
      const candidates = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
        .map(entry => path.join(cursor, entry.name))
        .filter(isOrchestraXDirectory);

      if (candidates.length === 1) {
        return { workspaceRoot: cursor, orchestraxRoot: candidates[0] };
      }
    } catch {
      // Continue searching upward.
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  const fallback = path.resolve(start);
  return { workspaceRoot: fallback, orchestraxRoot: path.join(fallback, "neo-orchestrax") };
}
