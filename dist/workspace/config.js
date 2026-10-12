import fs from "node:fs";
import path from "node:path";
export function workspaceConfigPath(root) {
    return path.join(root, ".orchestrax", "workspace.json");
}
export function projectConfigPath(root) {
    return path.join(root, ".orchestrax", "project.json");
}
export function isWorkspaceRoot(root) {
    return fs.existsSync(workspaceConfigPath(root));
}
export function isProjectRoot(root) {
    return fs.existsSync(projectConfigPath(root));
}
export function readWorkspaceConfig(root) {
    try {
        return JSON.parse(fs.readFileSync(workspaceConfigPath(root), "utf8"));
    }
    catch {
        return undefined;
    }
}
export function initWorkspace(root, name = path.basename(root)) {
    const config = {
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
export function initProject(root, name = path.basename(root)) {
    const config = {
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
