import fs from "node:fs";
import path from "node:path";
import { validatePack } from "./validator.js";
import { resolvePackGraph } from "./resolver.js";

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

export function installPack(sourcePackPath: string, projectPath: string, availablePackRoots: string[] = []): InstallResult {
  return installPackAt(sourcePackPath, installedPacksPath(projectPath), availablePackRoots, `project ${path.basename(projectPath)}`);
}

export function installWorkspacePack(sourcePackPath: string, workspacePath: string, availablePackRoots: string[] = []): InstallResult {
  return installPackAt(sourcePackPath, workspaceInstalledPacksPath(workspacePath), availablePackRoots, `workspace ${path.basename(workspacePath)}`);
}

export function removePack(projectPath: string, packName: string): InstallResult {
  return removePackAt(installedPacksPath(projectPath), packName, `project ${path.basename(projectPath)}`);
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
export function listInstalled(projectPath: string): string[] { return listInstalledAt(installedPacksPath(projectPath)); }
export function listWorkspaceInstalled(workspacePath: string): string[] { return listInstalledAt(workspaceInstalledPacksPath(workspacePath)); }
