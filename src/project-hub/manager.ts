import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { Project } from "../workspace/types.js";
import type { ProjectHubManifest } from "./types.js";

function stripJsonCommentsAndTrailingCommas(input: string): string {
  return input.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1");
}

export type WorkspaceRegistrationResult = "added" | "already-registered" | "unavailable" | "failed";

/**
 * Register a generated Project Hub in the currently active VS Code window.
 *
 * `code --add` is important here: a CLI process cannot reliably infer which
 * `.code-workspace` file is the active VS Code window when several workspaces
 * can contain the same project (or when the workspace is still untitled). VS
 * Code provides `--add` specifically for adding a folder to the last active
 * window, including multi-root workspaces.
 */
export function registerProjectHubInActiveWorkspace(hubPath: string): WorkspaceRegistrationResult {
  const resolvedHub = path.resolve(hubPath);
  try {
    const result = process.platform === "win32"
      ? spawnSync("code.cmd", ["--reuse-window", "--add", resolvedHub], { stdio: "ignore", windowsHide: true })
      : spawnSync("code", ["--reuse-window", "--add", resolvedHub], { stdio: "ignore" });
    if (result.status === 0) return "added";
    if (result.error) return "unavailable";
    return "failed";
  } catch {
    return "unavailable";
  }
}

/** Register a generated Project Hub in a known VS Code multi-root workspace file. */
export function registerProjectHubInWorkspace(workspaceFile: string | undefined, hubPath: string): WorkspaceRegistrationResult {
  if (!workspaceFile || !fs.existsSync(workspaceFile)) return "unavailable";

  try {
    const raw = fs.readFileSync(workspaceFile, "utf8");
    const config = JSON.parse(stripJsonCommentsAndTrailingCommas(raw)) as { folders?: Array<{ path?: string; name?: string }> };
    if (!Array.isArray(config.folders)) config.folders = [];

    const workspaceDir = path.dirname(workspaceFile);
    const resolvedHub = path.resolve(hubPath);
    const alreadyRegistered = config.folders.some(folder => {
      if (!folder?.path) return false;
      return path.resolve(workspaceDir, folder.path) === resolvedHub;
    });

    if (alreadyRegistered) return "already-registered";

    let folderPath = path.relative(workspaceDir, resolvedHub);
    if (!folderPath) folderPath = ".";
    config.folders.push({ path: folderPath });

    fs.writeFileSync(workspaceFile, JSON.stringify(config, null, 2) + "\n", "utf8");
    return "added";
  } catch {
    return "failed";
  }
}

/**
 * Register a Project Hub in the resolved workspace.
 *
 * If OrchestraX has positively identified the saved `.code-workspace` that
 * contains the current project, update that file directly. This is more
 * deterministic than `code --add`, which targets whichever VS Code window
 * VS Code considers the last active window. For untitled workspaces there is
 * no file to update, so fall back to VS Code's active-window registration.
 */
export function registerProjectHub(workspaceFile: string | undefined, hubPath: string): WorkspaceRegistrationResult {
  if (workspaceFile) {
    const known = registerProjectHubInWorkspace(workspaceFile, hubPath);
    if (known === "added" || known === "already-registered") return known;
  }
  return registerProjectHubInActiveWorkspace(hubPath);
}

export function projectHubPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  // A Project Hub belongs to the resolved workspace scope, not to the
  // project's physical parent directory. A workspace may be a multi-root
  // logical workspace whose projects live in completely different locations.
  // For a standalone project (workspaceRoot === project.path), keep the hub
  // beside the project as the local fallback.
  const workspaceResolved = path.resolve(workspaceRoot);
  const projectResolved = path.resolve(project.path);
  const base = workspaceResolved !== projectResolved ? workspaceResolved : path.dirname(projectResolved);
  return path.join(base, `${project.id}-docs`);
}

export function projectHubPacksPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  return path.join(projectHubPath(workspaceRoot, project), "packs");
}

export function ensureProjectHub(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">, workspaceFile?: string): ProjectHubManifest & { workspaceRegistration: WorkspaceRegistrationResult } {
  const root = projectHubPath(workspaceRoot, project);
  const manifestPath = path.join(root, "hub.json");
  const now = new Date().toISOString();
  let manifest: ProjectHubManifest;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ProjectHubManifest;
    } catch {
      manifest = {
        schema: "neo-orchestrax/project-hub@1",
        version: 1,
        projectId: project.id,
        projectName: project.name,
        createdAt: now,
        updatedAt: now,
        packs: []
      };
    }
  } else {
    manifest = {
      schema: "neo-orchestrax/project-hub@1",
      version: 1,
      projectId: project.id,
      projectName: project.name,
      createdAt: now,
      updatedAt: now,
      packs: []
    };
  }

  fs.mkdirSync(path.join(root, "packs"), { recursive: true });
  fs.mkdirSync(path.join(root, "board", "epics"), { recursive: true });
  fs.mkdirSync(path.join(root, "board", "stories"), { recursive: true });
  fs.mkdirSync(path.join(root, "board", "subtasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "discussions"), { recursive: true });
  const workspaceRegistration = registerProjectHub(workspaceFile, root);

  const boardPath = path.join(root, "board", "board.json");
  if (!fs.existsSync(boardPath)) {
    fs.writeFileSync(boardPath, JSON.stringify({
      schema: "neo-orchestrax/project-board@1",
      version: 1,
      projectId: project.id,
      statuses: ["todo", "in-progress", "blocked", "done"],
      priorities: ["low", "medium", "high", "critical"],
      hierarchy: ["epic", "user-story", "subtask"]
    }, null, 2) + "\n", "utf8");
  }

  manifest.projectId = project.id;
  manifest.projectName = project.name;
  manifest.updatedAt = now;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return { ...manifest, workspaceRegistration };
}

export function registerHubPack(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">, packName: string, version: string, workspaceFile?: string): void {
  const manifest = ensureProjectHub(workspaceRoot, project, workspaceFile);
  const existing = manifest.packs.find(p => p.id.toLowerCase() === packName.toLowerCase());
  const now = new Date().toISOString();
  if (existing) {
    existing.version = version;
    existing.installedAt = existing.installedAt || now;
  } else {
    manifest.packs.push({ id: packName, version, installedAt: now });
  }
  manifest.updatedAt = now;
  fs.writeFileSync(path.join(projectHubPath(workspaceRoot, project), "hub.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export function unregisterHubPack(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">, packName: string): boolean {
  const root = projectHubPath(workspaceRoot, project);
  const manifestPath = path.join(root, "hub.json");
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ProjectHubManifest;
  const before = manifest.packs.length;
  manifest.packs = manifest.packs.filter(p => p.id.toLowerCase() !== packName.toLowerCase());
  if (before === manifest.packs.length) return false;
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return true;
}

export function listHubInstalled(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">): string[] {
  const root = projectHubPacksPath(workspaceRoot, project);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
}
