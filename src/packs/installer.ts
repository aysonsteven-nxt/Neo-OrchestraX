import fs from "node:fs";
import path from "node:path";
import { validatePack } from "./validator.js";

export interface InstallResult {
  ok: boolean;
  message: string;
}

export function installedPacksPath(projectPath: string): string {
  return path.join(projectPath, ".orchestrax", "packs");
}

export function installPack(
  sourcePackPath: string,
  projectPath: string
): InstallResult {
  const validation = validatePack(sourcePackPath);
  if (!validation.valid || !validation.metadata) {
    return { ok: false, message: `Pack validation failed: ${validation.errors.join("; ")}` };
  }

  const destinationRoot = installedPacksPath(projectPath);
  const destination = path.join(destinationRoot, validation.metadata.name);

  fs.mkdirSync(destinationRoot, { recursive: true });
  fs.cpSync(sourcePackPath, destination, { recursive: true, force: true });

  return {
    ok: true,
    message: `Installed ${validation.metadata.name}@${validation.metadata.version} for ${path.basename(projectPath)}`
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

export function listInstalled(projectPath: string): string[] {
  const root = installedPacksPath(projectPath);
  if (!fs.existsSync(root)) return [];

  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}
