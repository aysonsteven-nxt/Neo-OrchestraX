import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { Project } from "./workspace/types.js";
import { projectHubPath } from "./project-hub/manager.js";

export const NEO_PROJECT_BOARD_REPOSITORY = "https://github.com/aysonsteven-nxt/Neo-Project-Board.git";
export const NEO_PROJECT_BOARD_APP = "neo-project-board";
export const NEO_PROJECT_BOARD_CONTRACT = "neo-orchestrax/project-board@1";
export const NEO_PROJECT_BOARD_MIN_VERSION = "0.4.0";

export function installProjectBoardDependencies(boardRoot: string): { ok: boolean; message: string } {
  const packageJson = path.join(boardRoot, "package.json");
  if (!fs.existsSync(packageJson)) return { ok: false, message: "Neo Project Board package.json is missing." };
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["install"], { cwd: boardRoot, stdio: "inherit", windowsHide: false });
  if (result.error) return { ok: false, message: `Failed to run npm install for Neo Project Board: ${result.error.message}` };
  if (result.status !== 0) return { ok: false, message: `npm install for Neo Project Board failed with exit code ${result.status}.` };
  return { ok: true, message: "Neo Project Board dependencies installed." };
}

export interface ProjectBoardManifest {
  schema?: string;
  app?: string;
  name?: string;
  version?: string;
  projectHub?: string;
  contract?: string;
  runtime?: string;
}

export interface ProjectBoardStatus {
  installed: boolean;
  valid: boolean;
  path: string;
  version?: string;
  contract?: string;
  repository?: string;
  message: string;
}

function boardPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  return path.join(projectHubPath(workspaceRoot, project), "neo-project-board");
}

function manifestPath(boardRoot: string): string { return path.join(boardRoot, "neo-project-board.json"); }

function readManifest(boardRoot: string): ProjectBoardManifest | undefined {
  const file = manifestPath(boardRoot);
  if (!fs.existsSync(file)) return undefined;
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectBoardManifest; } catch { return undefined; }
}

function versionParts(value: string): [number, number, number] {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function versionAtLeast(actual: string, minimum: string): boolean {
  const a = versionParts(actual); const m = versionParts(minimum);
  return a[0] > m[0] || (a[0] === m[0] && (a[1] > m[1] || (a[1] === m[1] && a[2] >= m[2])));
}

function git(args: string[], cwd?: string): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim()
  };
}

export function getProjectBoardPath(workspaceRoot: string, project: Pick<Project, "path" | "id">): string {
  return boardPath(workspaceRoot, project);
}

export function validateProjectBoard(workspaceRoot: string, project: Pick<Project, "path" | "id">): ProjectBoardStatus {
  const target = boardPath(workspaceRoot, project);
  if (!fs.existsSync(target)) return { installed: false, valid: false, path: target, message: "Neo Project Board is not installed." };
  const manifest = readManifest(target);
  if (!manifest) return { installed: true, valid: false, path: target, message: "Neo Project Board manifest is missing or invalid." };
  if (manifest.app !== NEO_PROJECT_BOARD_APP) return { installed: true, valid: false, path: target, version: manifest.version, contract: manifest.contract, message: `Unexpected Board app: ${manifest.app ?? "unknown"}.` };
  if (manifest.contract !== NEO_PROJECT_BOARD_CONTRACT) return { installed: true, valid: false, path: target, version: manifest.version, contract: manifest.contract, message: `Unsupported Board contract: ${manifest.contract ?? "missing"}. Expected ${NEO_PROJECT_BOARD_CONTRACT}.` };
  if (!manifest.version || !versionAtLeast(manifest.version, NEO_PROJECT_BOARD_MIN_VERSION)) return { installed: true, valid: false, path: target, version: manifest.version, contract: manifest.contract, message: `Board version ${manifest.version ?? "missing"} is below the supported minimum ${NEO_PROJECT_BOARD_MIN_VERSION}.` };
  return { installed: true, valid: true, path: target, version: manifest.version, contract: manifest.contract, repository: NEO_PROJECT_BOARD_REPOSITORY, message: `Neo Project Board ${manifest.version} is installed and compatible.` };
}

export function installProjectBoard(workspaceRoot: string, project: Pick<Project, "path" | "id" | "name">): ProjectBoardStatus {
  const hubRoot = projectHubPath(workspaceRoot, project);
  const target = boardPath(workspaceRoot, project);
  if (!fs.existsSync(path.join(hubRoot, "hub.json"))) {
    return { installed: false, valid: false, path: target, message: `Project Hub is not initialized: ${hubRoot}` };
  }

  const existing = validateProjectBoard(workspaceRoot, project);
  if (existing.installed) {
    if (!existing.valid) return existing;
    const deps = installProjectBoardDependencies(existing.path);
    return deps.ok ? { ...existing, message: `${existing.message} Dependencies installed.` } : { ...existing, valid: false, message: deps.message };
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const result = git(["clone", "--origin", "origin", NEO_PROJECT_BOARD_REPOSITORY, target]);
  if (!result.ok) {
    return { installed: false, valid: false, path: target, repository: NEO_PROJECT_BOARD_REPOSITORY, message: `Failed to clone Neo Project Board: ${result.stderr || result.stdout || "git clone failed"}` };
  }

  const installed = validateProjectBoard(workspaceRoot, project);
  if (!installed.valid) {
    return { ...installed, message: `Neo Project Board was cloned, but validation failed: ${installed.message}` };
  }
  const deps = installProjectBoardDependencies(target);
  if (!deps.ok) return { ...installed, valid: false, message: deps.message };
  return { ...installed, message: `Installed Neo Project Board ${installed.version} at ${target}; npm install completed.` };
}

export function updateProjectBoard(workspaceRoot: string, project: Pick<Project, "path" | "id">): ProjectBoardStatus {
  const current = validateProjectBoard(workspaceRoot, project);
  if (!current.installed) return current;
  if (!fs.existsSync(path.join(current.path, ".git"))) return { ...current, valid: false, message: "Neo Project Board exists but is not a Git checkout; update is unavailable." };
  const result = git(["pull", "--ff-only"], current.path);
  if (!result.ok) return { ...current, message: `Failed to update Neo Project Board: ${result.stderr || result.stdout || "git pull failed"}` };
  return { ...validateProjectBoard(workspaceRoot, project), message: `Neo Project Board updated successfully.` };
}

export function launchProjectBoard(workspaceRoot: string, project: Pick<Project, "path" | "id">): { ok: boolean; message: string } {
  const status = validateProjectBoard(workspaceRoot, project);
  if (!status.valid) return { ok: false, message: status.message };
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["run", "dev"], { cwd: status.path, stdio: "inherit", windowsHide: false });
  if (result.error) return { ok: false, message: `Failed to launch Neo Project Board: ${result.error.message}` };
  return { ok: result.status === 0, message: result.status === 0 ? "Neo Project Board stopped." : `Neo Project Board exited with code ${result.status}.` };
}
