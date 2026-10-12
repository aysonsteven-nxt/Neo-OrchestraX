import fs from "node:fs";
import path from "node:path";
import { validatePack } from "./validator.js";
import { resolvePackGraph } from "./resolver.js";
import { ensureProjectHub, listHubInstalled, projectHubPacksPath, registerHubPack, unregisterHubPack } from "../project-hub/manager.js";
import type { Project } from "../workspace/types.js";
import { installProjectBoard } from "../project-board.js";

export interface InstallResult { ok: boolean; message: string; installed?: string[]; }

export function installedPacksPath(projectPath: string): string { return path.join(projectPath, ".orchestrax", "packs"); }
export function workspaceInstalledPacksPath(workspacePath: string): string { return path.join(workspacePath, ".orchestrax", "packs"); }

export function installPackAt(sourcePackPath: string, destinationRoot: string, availablePackRoots: string[] = [], scopeLabel = "scope"): InstallResult {
  const validation = validatePack(sourcePackPath, availablePackRoots);
  if (!validation.valid || !validation.metadata) return { ok: false, message: `Pack validation failed: ${validation.errors.join("; ")}` };
  const graph = resolvePackGraph(sourcePackPath, [...availablePackRoots, destinationRoot]);
  if (!graph || graph.issues.some(i => i.required)) {
    const issues = graph?.issues.filter(i => i.required).map(i => i.message) ?? ["Unable to resolve pack dependency graph"];
    return { ok: false, message: `Pack dependency resolution failed: ${issues.join("; ")}` };
  }
  fs.mkdirSync(destinationRoot, { recursive: true });
  const installed: string[] = [];
  for (const node of graph.order) {
    const destination = path.join(destinationRoot, node.pack.name);
    fs.cpSync(node.sourcePath, destination, { recursive: true, force: true });
    installed.push(`${node.pack.name}@${node.pack.version}`);
  }
  return { ok: true, message: `Installed ${validation.metadata.name}@${validation.metadata.version} to ${scopeLabel}${installed.length > 1 ? ` with ${installed.length - 1} dependency pack(s)` : ""}`, installed };
}

function isHubPack(packName: string): boolean {
  return ["project-manager", "solutions-architect"].includes(packName.toLowerCase());
}

export function installProjectPack(sourcePackPath: string, project: Project, workspaceRoot: string, availablePackRoots: string[] = [], workspaceFile?: string): InstallResult {
  const validation = validatePack(sourcePackPath, availablePackRoots);
  if (!validation.valid || !validation.metadata) return { ok: false, message: `Pack validation failed: ${validation.errors.join("; ")}` };
  if (!isHubPack(validation.metadata.name)) return installPack(sourcePackPath, project.path, availablePackRoots);

  const hubManifest = ensureProjectHub(workspaceRoot, project, workspaceFile);
  const hubPacks = projectHubPacksPath(workspaceRoot, project);
  const hubRoot = path.dirname(hubPacks);
  const graph = resolvePackGraph(sourcePackPath, [...availablePackRoots, hubPacks]);
  if (!graph || graph.issues.some(i => i.required)) {
    const issues = graph?.issues.filter(i => i.required).map(i => i.message) ?? ["Unable to resolve pack dependency graph"];
    return { ok: false, message: `Pack dependency resolution failed: ${issues.join("; ")}` };
  }

  fs.mkdirSync(hubPacks, { recursive: true });
  const installed: string[] = [];
  for (const node of graph.order) {
    if (!isHubPack(node.pack.name)) continue;
    const destination = path.join(hubPacks, node.pack.name);
    if (path.resolve(node.sourcePath) !== path.resolve(destination)) fs.cpSync(node.sourcePath, destination, { recursive: true, force: true });
    if (node.pack.name.toLowerCase() === "project-manager") {
      const schemaSource = path.join(destination, "hub-schemas");
      const schemaDestination = path.join(hubRoot, "board", "schemas");
      if (fs.existsSync(schemaSource)) fs.cpSync(schemaSource, schemaDestination, { recursive: true, force: true });
    }
    registerHubPack(workspaceRoot, project, node.pack.name, node.pack.version, workspaceFile);
    installed.push(`${node.pack.name}@${node.pack.version}`);
  }

  // SA/other future hub contributions can add their own directories without replacing the existing hub.
  if (validation.metadata.name.toLowerCase() === "solutions-architect") {
    fs.mkdirSync(path.join(hubRoot, "architecture"), { recursive: true });
    const architectureManifest = path.join(hubRoot, "architecture", "architecture.json");
    if (!fs.existsSync(architectureManifest)) {
      fs.writeFileSync(architectureManifest, JSON.stringify({
        schema: "neo-orchestrax/architecture@1",
        version: 1,
        projectId: project.id,
        systems: [],
        components: [],
        apis: [],
        dataStores: [],
        integrations: [],
        decisions: []
      }, null, 2) + "\n", "utf8");
    }
  }

  let boardMessage = "";
  if (installed.some(value => value.toLowerCase().startsWith("project-manager@"))) {
    const boardResult = installProjectBoard(workspaceRoot, project);
    if (!boardResult.valid) {
      return { ok: false, message: `Project Manager was installed, but Neo Project Board provisioning failed: ${boardResult.message}`, installed };
    }
    boardMessage = ` Neo Project Board ${boardResult.version ?? ""} provisioned with npm install.`;
  }

  const registrationNote = hubManifest.workspaceRegistration === "added"
    ? " and registered it in the active VS Code workspace"
    : hubManifest.workspaceRegistration === "already-registered"
      ? " (already registered in the workspace)"
      : " (workspace registration unavailable)";
  return { ok: true, message: `Installed ${validation.metadata.name}@${validation.metadata.version} to Project Hub ${path.basename(hubRoot)}${registrationNote}${installed.length > 1 ? ` with ${installed.length - 1} dependency pack(s)` : ""}.${boardMessage}`, installed };
}

export function installPack(sourcePackPath: string, projectPath: string, availablePackRoots: string[] = []): InstallResult {
  return installPackAt(sourcePackPath, installedPacksPath(projectPath), availablePackRoots, `project ${path.basename(projectPath)}`);
}

export function installWorkspacePack(sourcePackPath: string, workspacePath: string, availablePackRoots: string[] = []): InstallResult {
  return installPackAt(sourcePackPath, workspaceInstalledPacksPath(workspacePath), availablePackRoots, `workspace ${path.basename(workspacePath)}`);
}

export function removePack(projectPath: string, packName: string): InstallResult {
  return removePackAt(installedPacksPath(projectPath), packName, `project ${path.basename(projectPath)}`);
}
export function removeProjectPack(project: Project, workspaceRoot: string, packName: string): InstallResult {
  if (isHubPack(packName)) {
    const destination = path.join(projectHubPacksPath(workspaceRoot, project), packName);
    if (!fs.existsSync(destination)) return { ok: false, message: `Pack "${packName}" is not installed in Project Hub ${project.name}.` };
    const hubPacks = projectHubPacksPath(workspaceRoot, project);
    if (packName.toLowerCase() === "project-manager") {
      const dependents: string[] = [];
      for (const installed of listHubInstalled(workspaceRoot, project)) {
        if (installed.toLowerCase() === "project-manager") continue;
        const manifest = path.join(hubPacks, installed, "pack.json");
        try {
          const metadata = JSON.parse(fs.readFileSync(manifest, "utf8")) as { dependencies?: Array<{ id?: string; required?: boolean }> };
          if (metadata.dependencies?.some(d => d.id?.toLowerCase() === "project-manager" && d.required)) dependents.push(installed);
        } catch { /* ignore malformed optional metadata here; pack validation handles it */ }
      }
      if (dependents.length) return { ok: false, message: `Cannot remove project-manager from Project Hub ${project.name}; required by: ${dependents.join(", ")}.` };
    }
    fs.rmSync(destination, { recursive: true, force: true });
    unregisterHubPack(workspaceRoot, project, packName);
    return { ok: true, message: `Removed ${packName} from Project Hub ${project.name}` };
  }
  return removePack(project.path, packName);
}
export function removeWorkspacePack(workspacePath: string, packName: string): InstallResult {
  return removePackAt(workspaceInstalledPacksPath(workspacePath), packName, `workspace ${path.basename(workspacePath)}`);
}
function removePackAt(root: string, packName: string, label: string): InstallResult {
  const destination = path.join(root, packName);
  if (!fs.existsSync(destination)) return { ok: false, message: `Pack "${packName}" is not installed in ${label}.` };
  fs.rmSync(destination, { recursive: true, force: true });
  return { ok: true, message: `Removed ${packName} from ${label}` };
}

export function listInstalledAt(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
}
export function listInstalled(projectPath: string, workspaceRoot?: string, project?: Project): string[] {
  const projectPacks = listInstalledAt(installedPacksPath(projectPath));
  if (!workspaceRoot || !project) return projectPacks;
  return [...new Set([...projectPacks, ...listHubInstalled(workspaceRoot, project)])].sort();
}
export function listWorkspaceInstalled(workspacePath: string): string[] { return listInstalledAt(workspaceInstalledPacksPath(workspacePath)); }
