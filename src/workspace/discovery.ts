import fs from "node:fs";
import path from "node:path";

interface DirectoryEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

interface CodeWorkspaceFolder {
  path?: string;
  name?: string;
}

interface CodeWorkspaceFile {
  folders?: CodeWorkspaceFolder[];
}

function stripJsonCommentsAndTrailingCommas(input: string): string {
  return input
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1");
}

function readCodeWorkspace(file: string): CodeWorkspaceFile | undefined {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(stripJsonCommentsAndTrailingCommas(raw)) as CodeWorkspaceFile;
  } catch {
    return undefined;
  }
}

function findCodeWorkspaceFile(start: string): string | undefined {
  let cursor = path.resolve(start);
  while (true) {
    try {
      const candidates = (fs.readdirSync(cursor, { withFileTypes: true }) as DirectoryEntry[])
        .filter(entry => entry.isFile() && entry.name.endsWith(".code-workspace"))
        .map(entry => path.join(cursor, entry.name));
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) {
        const preferred = candidates.find(candidate => path.basename(candidate).startsWith(".sample-workspace"));
        return preferred ?? candidates[0];
      }
    } catch {
      // Continue upward.
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return undefined;
}

export function getCodeWorkspaceRoots(workspaceFile: string): string[] {
  const config = readCodeWorkspace(workspaceFile);
  if (!config?.folders?.length) return [];
  const base = path.dirname(workspaceFile);
  return config.folders
    .map(folder => folder.path)
    .filter((folderPath): folderPath is string => Boolean(folderPath))
    .map(folderPath => path.resolve(base, folderPath));
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

export function locateOrchestraX(start: string): { workspaceRoot: string; orchestraxRoot: string; folderRoots?: string[]; workspaceFile?: string } {
  const codeWorkspace = findCodeWorkspaceFile(start);
  if (codeWorkspace) {
    const workspaceDir = path.dirname(codeWorkspace);
    const folderRoots = getCodeWorkspaceRoots(codeWorkspace);
    const configuredOrchestraX = folderRoots.find(root => isOrchestraXDirectory(root));
    if (configuredOrchestraX) {
      return { workspaceRoot: workspaceDir, orchestraxRoot: configuredOrchestraX, folderRoots, workspaceFile: codeWorkspace };
    }

    const entries = fs.readdirSync(workspaceDir, { withFileTypes: true }) as DirectoryEntry[];
    const candidate = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
      .map(entry => path.join(workspaceDir, entry.name))
      .find(isOrchestraXDirectory);
    if (candidate) {
      return { workspaceRoot: workspaceDir, orchestraxRoot: candidate, folderRoots, workspaceFile: codeWorkspace };
    }
  }

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
