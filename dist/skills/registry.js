import fs from "node:fs";
import path from "node:path";
import os from "node:os";
function readRoot(root, source) { if (!fs.existsSync(root))
    return []; const out = []; function visit(dir) { const m = path.join(dir, "skill.json"), c = path.join(dir, "skill.md"); if (fs.existsSync(m) || fs.existsSync(c)) {
    if (!fs.existsSync(m) || !fs.existsSync(c))
        return;
    try {
        const x = JSON.parse(fs.readFileSync(m, "utf8"));
        const deps = Array.isArray(x.requiredInstructions) ? x.requiredInstructions.filter((d) => !!d && typeof d === "object" && typeof d.id === "string" && typeof d.version === "string" && typeof d.required === "boolean") : [];
        out.push({ id: x.id ?? path.basename(dir), version: x.version ?? "0.0.0", description: x.description ?? "", category: x.category ?? "general", capabilities: Array.isArray(x.capabilities) ? x.capabilities.filter(v => typeof v === "string") : [], appliesToAgents: Array.isArray(x.appliesToAgents) ? x.appliesToAgents.filter(v => typeof v === "string") : ["*"], appliesTo: Array.isArray(x.appliesTo) ? x.appliesTo.filter(v => typeof v === "string") : ["*"], requiredInstructions: deps, overrideable: x.overrideable ?? true, priority: typeof x.priority === "number" ? x.priority : 0, source, content: fs.readFileSync(c, "utf8").trim(), sourcePath: dir });
    }
    catch { }
    return;
} for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    if (e.isDirectory() && !e.name.startsWith("."))
        visit(path.join(dir, e.name)); } visit(root); return out; }
export const defaultSkillsRoot = (r) => path.join(r, "defaults", "skills");
export const userSkillsRoot = () => path.join(os.homedir(), ".orchestrax", "skills");
export const workspaceSkillsRoot = (r) => path.join(r, ".orchestrax", "skills");
export const projectSkillsRoot = (r) => path.join(r, ".orchestrax", "skills");
function findProjectHubPacksRoot(projectPath) { const id = path.basename(path.resolve(projectPath)); let cursor = path.resolve(projectPath); while (true) {
    const candidate = path.join(cursor, `${id}-docs`, `packs`);
    if (fs.existsSync(candidate))
        return candidate;
    const parent = path.dirname(cursor);
    if (parent === cursor)
        break;
    cursor = parent;
} return undefined; }
export function loadSkills(orchestraxRoot, workspaceRoot, projectPath) { const hub = findProjectHubPacksRoot(projectPath); const roots = [["default", defaultSkillsRoot(orchestraxRoot)], ["user", userSkillsRoot()], ["workspace", workspaceSkillsRoot(workspaceRoot)], ["project", projectSkillsRoot(projectPath)]]; if (hub)
    roots.push(["project", hub]); return roots.flatMap(([s, r]) => readRoot(r, s)); }
export function validateSkillDirectory(dir) { const e = [], m = path.join(dir, "skill.json"), c = path.join(dir, "skill.md"); if (!fs.existsSync(m))
    e.push("Missing skill.json"); if (!fs.existsSync(c))
    e.push("Missing skill.md"); if (e.length)
    return e; try {
    const x = JSON.parse(fs.readFileSync(m, "utf8"));
    for (const k of ["id", "version", "description", "category"])
        if (typeof x[k] !== "string" || !x[k].trim())
            e.push(`Missing ${k}`);
    for (const k of ["capabilities", "appliesToAgents", "appliesTo", "requiredInstructions"])
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
}
catch {
    e.push("Invalid JSON in skill.json");
} return e; }
