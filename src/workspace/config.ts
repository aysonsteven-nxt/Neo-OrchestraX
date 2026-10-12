import fs from "node:fs";
import path from "node:path";

export interface WorkspaceConfig {
  version: 1;
  type: "workspace";
  name: string;
  projectsDirectory: string;
  documentationDirectory: string;
  contextDirectory: string;
}

export interface ProjectConfig {
  version: 1;
  type: "project";
  id: string;
  name: string;
}

export function workspaceConfigPath(root: string): string {
  return path.join(root, ".orchestrax", "workspace.json");
}

export function projectConfigPath(root: string): string {
  return path.join(root, ".orchestrax", "project.json");
}

export function isWorkspaceRoot(root: string): boolean {
  return fs.existsSync(workspaceConfigPath(root));
}

export function isProjectRoot(root: string): boolean {
  return fs.existsSync(projectConfigPath(root));
}

export function readWorkspaceConfig(root: string): WorkspaceConfig | undefined {
  try {
    return JSON.parse(fs.readFileSync(workspaceConfigPath(root), "utf8")) as WorkspaceConfig;
  } catch {
    return undefined;
  }
}

export function initWorkspace(root: string, name = path.basename(root)): WorkspaceConfig {
  const config: WorkspaceConfig = {
    version: 1,
    type: "workspace",
    name,
    projectsDirectory: "projects",
    documentationDirectory: "documentation",
    contextDirectory: "context"
  };

  fs.mkdirSync(path.join(root, "projects"), { recursive: true });
  fs.mkdirSync(path.join(root, "documentation"), { recursive: true });
  fs.mkdirSync(path.join(root, "context", "syntra"), { recursive: true });
  fs.mkdirSync(path.join(root, ".orchestrax", "packs"), { recursive: true });
  fs.writeFileSync(workspaceConfigPath(root), JSON.stringify(config, null, 2) + "\n", "utf8");
  return config;
}

export function initProject(root: string, name = path.basename(root)): ProjectConfig {
  const config: ProjectConfig = {
    version: 1,
    type: "project",
    id: name,
    name
  };

  fs.mkdirSync(path.join(root, ".orchestrax", "packs"), { recursive: true });
  fs.mkdirSync(path.join(root, ".orchestrax", "syntra"), { recursive: true });
  fs.writeFileSync(projectConfigPath(root), JSON.stringify(config, null, 2) + "\n", "utf8");
  return config;
}
