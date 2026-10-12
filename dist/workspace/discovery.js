import fs from "node:fs";
import path from "node:path";
import { isProjectRoot, isWorkspaceRoot, projectConfigPath, workspaceConfigPath } from "./config.js";
function stripJsonCommentsAndTrailingCommas(input) {
    return input.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1");
}
function readCodeWorkspace(file) {
    try {
        return JSON.parse(stripJsonCommentsAndTrailingCommas(fs.readFileSync(file, "utf8")));
    }
    catch {
        return undefined;
    }
}
function findCodeWorkspaceFile(start) {
    let cursor = path.resolve(start);
    while (true) {
        try {
            const candidates = fs.readdirSync(cursor, { withFileTypes: true })
                .filter(e => e.isFile() && e.name.endsWith(".code-workspace"))
                .map(e => path.join(cursor, e.name));
            if (candidates.length === 1)
                return candidates[0];
            if (candidates.length > 1)
                return candidates.find(c => path.basename(c).startsWith(".sample-workspace")) ?? candidates[0];
        }
        catch { }
        const parent = path.dirname(cursor);
        if (parent === cursor)
            break;
        cursor = parent;
    }
    return undefined;
}
export function getCodeWorkspaceRoots(workspaceFile) {
    const config = readCodeWorkspace(workspaceFile);
    if (!config?.folders?.length)
        return [];
    const base = path.dirname(workspaceFile);
    return config.folders.map(f => f.path).filter((p) => Boolean(p)).map(p => path.resolve(base, p));
}
export function isOrchestraXDirectory(dir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name === "neo-orchestrax";
    }
    catch {
        return false;
    }
}
export function isProjectDirectory(dir) {
    if (isWorkspaceRoot(dir))
        return false;
    if (isProjectRoot(dir))
        return true;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = new Set(entries.filter(e => e.isFile()).map(e => e.name));
        const dirs = new Set(entries.filter(e => e.isDirectory()).map(e => e.name));
        const projectFiles = ["package.json", "angular.json", "project.json", "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "Cargo.toml", "go.mod", "pyproject.toml", "requirements.txt", "composer.json"];
        if (projectFiles.some(f => files.has(f)))
            return true;
        if ([".git", ".devkit", ".orchestrax", ".angular"].some(d => dirs.has(d)))
            return true;
        if (dirs.has("src") && (dirs.has("public") || dirs.has(".vscode") || dirs.has(".idea")))
            return true;
        return ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].some(f => files.has(f));
    }
    catch {
        return false;
    }
}
function nearestMarker(start, predicate) {
    let cursor = path.resolve(start);
    while (true) {
        if (predicate(cursor))
            return cursor;
        const parent = path.dirname(cursor);
        if (parent === cursor)
            break;
        cursor = parent;
    }
    return undefined;
}
export function locateOrchestraX(start, installationRoot) {
    const install = path.resolve(installationRoot ?? path.resolve(start, "neo-orchestrax"));
    const codeWorkspace = findCodeWorkspaceFile(start);
    if (codeWorkspace) {
        const workspaceDir = path.dirname(codeWorkspace);
        const folderRoots = getCodeWorkspaceRoots(codeWorkspace);
        const workspaceMarker = nearestMarker(start, isWorkspaceRoot) ?? (isWorkspaceRoot(workspaceDir) ? workspaceDir : undefined);
        if (workspaceMarker)
            return { workspaceRoot: workspaceMarker, orchestraxRoot: install, installationRoot: install, folderRoots, workspaceFile: codeWorkspace, configPath: workspaceConfigPath(workspaceMarker), initialized: true, scope: "workspace" };
        const legacy = folderRoots.find(isOrchestraXDirectory) ?? fs.readdirSync(workspaceDir, { withFileTypes: true }).find(e => e.isDirectory() && isOrchestraXDirectory(path.join(workspaceDir, e.name)));
        if (legacy)
            return { workspaceRoot: workspaceDir, orchestraxRoot: install, installationRoot: install, folderRoots, workspaceFile: codeWorkspace, initialized: false, scope: "legacy" };
    }
    const workspace = nearestMarker(start, isWorkspaceRoot);
    if (workspace)
        return { workspaceRoot: workspace, orchestraxRoot: install, installationRoot: install, configPath: workspaceConfigPath(workspace), initialized: true, scope: "workspace" };
    const project = nearestMarker(start, isProjectRoot);
    if (project)
        return { workspaceRoot: project, orchestraxRoot: install, installationRoot: install, configPath: projectConfigPath(project), initialized: true, scope: "project" };
    const legacy = nearestMarker(start, isOrchestraXDirectory);
    if (legacy)
        return { workspaceRoot: path.dirname(legacy), orchestraxRoot: install, installationRoot: install, initialized: false, scope: "legacy" };
    const fallback = path.resolve(start);
    return { workspaceRoot: fallback, orchestraxRoot: install, installationRoot: install, initialized: false, scope: "legacy" };
}
