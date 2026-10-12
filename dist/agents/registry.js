import fs from "node:fs";
import path from "node:path";
import os from "node:os";
function readRoot(root, source) { if (!fs.existsSync(root))
    return []; const out = []; function visit(dir) { const m = path.join(dir, "agent.json"), c = path.join(dir, "agent.md"); if (fs.existsSync(m) || fs.existsSync(c)) {
    if (!fs.existsSync(m) || !fs.existsSync(c))
        return;
    try {
        const x = JSON.parse(fs.readFileSync(m, "utf8"));
        const deps = Array.isArray(x.requiredInstructions) ? x.requiredInstructions.filter((d) => !!d && typeof d === "object" && typeof d.id === "string" && typeof d.version === "string" && typeof d.required === "boolean") : [];
        const skillDeps = Array.isArray(x.skills) ? x.skills.filter((d) => !!d && typeof d === "object" && typeof d.id === "string" && typeof d.version === "string" && typeof d.required === "boolean") : [];
        out.push({ id: x.id ?? path.basename(dir), version: x.version ?? "0.0.0", description: x.description ?? "", role: x.role ?? "", capabilities: Array.isArray(x.capabilities) ? x.capabilities.filter(v => typeof v === "string") : [], appliesTo: Array.isArray(x.appliesTo) ? x.appliesTo.filter(v => typeof v === "string") : ["*"], requiredInstructions: deps, skills: skillDeps, overrideable: x.overrideable ?? true, priority: typeof x.priority === "number" ? x.priority : 0, source, content: fs.readFileSync(c, "utf8").trim(), sourcePath: dir });
    }
    catch { }
    return;
} for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    if (e.isDirectory() && !e.name.startsWith("."))
        visit(path.join(dir, e.name)); } visit(root); return out; }
export const defaultAgentsRoot = (r) => path.join(r, "defaults", "agents");
export const userAgentsRoot = () => path.join(os.homedir(), ".orchestrax", "agents");
export const workspaceAgentsRoot = (r) => path.join(r, ".orchestrax", "agents");
export const projectAgentsRoot = (r) => path.join(r, ".orchestrax", "agents");
function findProjectHubPacksRoot(projectPath) { const id = path.basename(path.resolve(projectPath)); let cursor = path.resolve(projectPath); while (true) {
    const candidate = path.join(cursor, `${id}-docs`, `packs`);
    if (fs.existsSync(candidate))
        return candidate;
    const parent = path.dirname(cursor);
    if (parent === cursor)
        break;
    cursor = parent;
} return undefined; }
export function loadAgents(orchestraxRoot, workspaceRoot, projectPath) { const hub = findProjectHubPacksRoot(projectPath); const roots = [["default", defaultAgentsRoot(orchestraxRoot)], ["user", userAgentsRoot()], ["workspace", workspaceAgentsRoot(workspaceRoot)], ["project", projectAgentsRoot(projectPath)]]; if (hub)
    roots.push(["project", hub]); return roots.flatMap(([s, r]) => readRoot(r, s)); }
export function validateAgentDirectory(dir) { const e = [], m = path.join(dir, "agent.json"), c = path.join(dir, "agent.md"); if (!fs.existsSync(m))
    e.push("Missing agent.json"); if (!fs.existsSync(c))
    e.push("Missing agent.md"); if (e.length)
    return e; try {
    const x = JSON.parse(fs.readFileSync(m, "utf8"));
    for (const k of ["id", "version", "description", "role"])
        if (typeof x[k] !== "string" || !x[k].trim())
            e.push(`Missing ${k}`);
    for (const k of ["capabilities", "appliesTo", "requiredInstructions", "skills"])
        if (x[k] !== undefined && !Array.isArray(x[k]))
            e.push(`${k} must be an array`);
    if (x.overrideable !== undefined && typeof x.overrideable !== "boolean")
        e.push("overrideable must be boolean");
    if (x.priority !== undefined && typeof x.priority !== "number")
        e.push("priority must be a number");
    if (Array.isArray(x.requiredInstructions))
        for (const d of x.requiredInstructions)
            if (!d || typeof d !== "object" || typeof d.id !== "string" || typeof d.version !== "string" || typeof d.required !== "boolean")
                e.push("Each requiredInstructions item must contain id, version and required");
    if (Array.isArray(x.skills))
        for (const d of x.skills)
            if (!d || typeof d !== "object" || typeof d.id !== "string" || typeof d.version !== "string" || typeof d.required !== "boolean")
                e.push("Each skills item must contain id, version and required");
}
catch {
    e.push("Invalid JSON in agent.json");
} return e; }
