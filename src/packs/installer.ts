import fs from "node:fs";
import path from "node:path";
import { validatePack } from "./validator.js";
import { resolvePackGraph } from "./resolver.js";

export interface InstallResult {
  ok: boolean;
  message: string;
  installed?: string[];
}

export function installedPacksPath(projectPath: string): string {
  return path.join(projectPath, ".orchestrax", "packs");
}

export function installPack(
  sourcePackPath: string,
  projectPath: string,
  availablePackRoots: string[] = []
): InstallResult {
  const validation = validatePack(sourcePackPath, availablePackRoots);
  if (!validation.valid || !validation.metadata) {
    return { ok: false, message: `Pack validation failed: ${validation.errors.join("; ")}` };
  }

  const graph = resolvePackGraph(sourcePackPath, [...availablePackRoots, installedPacksPath(projectPath)]);
  if (!graph || graph.issues.some(i => i.required)) {
    const issues = graph?.issues.filter(i => i.required).map(i => i.message) ?? ["Unable to resolve pack dependency graph"];
    return { ok: false, message: `Pack dependency resolution failed: ${issues.join("; ")}` };
  }

  const destinationRoot = installedPacksPath(projectPath);
  fs.mkdirSync(destinationRoot, { recursive: true });
  const installed: string[] = [];

  for (const node of graph.order) {
    const destination = path.join(destinationRoot, node.pack.name);
    fs.cpSync(node.sourcePath, destination, { recursive: true, force: true });
    installed.push(`${node.pack.name}@${node.pack.version}`);
  }

  return {
    ok: true,
    message: `Installed ${validation.metadata.name}@${validation.metadata.version} for ${path.basename(projectPath)}${installed.length > 1 ? ` with ${installed.length - 1} dependency pack(s)` : ""}`,
    installed
  };
}

export function removePack(projectPath: string, packName: string): InstallResult {
  const destination = path.join(installedPacksPath(projectPath), packName);
  if (!fs.existsSync(destination)) {
    return { ok: false, message: `Pack "${packName}" is not installed.` };
  }

  fs.rmSync(destination, { recursive: true, force: true });
  return { ok: true, message: `Removed ${packName} from ${path.basename(projectPath)}` };
}

interface InstalledEntry {
  name: string;
  isDirectory(): boolean;
}

export function listInstalled(projectPath: string): string[] {
  const root = installedPacksPath(projectPath);
  if (!fs.existsSync(root)) return [];

  return (fs.readdirSync(root, { withFileTypes: true }) as InstalledEntry[])
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}
