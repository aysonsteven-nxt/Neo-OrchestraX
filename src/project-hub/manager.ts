import fs from "node:fs";
import path from "node:path";
import type { Project } from "../workspace/types.js";
import type { ProjectHubManifest } from "./types.js";

export function projectHubPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  const base = fs.existsSync(path.join(workspaceRoot, ".orchestrax", "workspace.json"))
    ? workspaceRoot
    : path.dirname(project.path);
  return path.join(base, `${project.id}-docs`);
}

export function projectHubPacksPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  return path.join(projectHubPath(workspaceRoot, project), "packs");
}

export function ensureProjectHub(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">): ProjectHubManifest {
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
  return manifest;
}

export function registerHubPack(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">, packName: string, version: string): void {
  const manifest = ensureProjectHub(workspaceRoot, project);
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
