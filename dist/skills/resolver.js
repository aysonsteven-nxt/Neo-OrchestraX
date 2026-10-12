import { analyzeProject } from "../analyzer/project-analyzer.js";
import { loadSkills } from "./registry.js";
import { resolveInstructions } from "../instructions/resolver.js";
function versionParts(v) { const m = v.replace(/^[^0-9]*/, "").split(".").map(x => parseInt(x, 10)); return [m[0] || 0, m[1] || 0, m[2] || 0]; }
function satisfiesVersion(actual, range) { const a = versionParts(actual), r = versionParts(range); if (range.startsWith("^"))
    return a[0] === r[0] && (a[1] > r[1] || (a[1] === r[1] && a[2] >= r[2])); if (range.startsWith("~"))
    return a[0] === r[0] && a[1] === r[1] && a[2] >= r[2]; return actual === range || range === "*"; }
function applicable(s, p) { if (s.appliesTo.includes("*"))
    return true; const prof = analyzeProject(p), signals = new Set(prof.signals.flatMap(x => [x.key.toLowerCase(), x.value.toLowerCase()])); return s.appliesTo.some(t => { t = t.toLowerCase(); return t === p.id.toLowerCase() || t === p.name.toLowerCase() || signals.has(t); }); }
function resolve(orchestraxRoot, workspaceRoot, project, agentId) { const ds = loadSkills(orchestraxRoot, workspaceRoot, project.path).filter(s => agentId ? (s.appliesToAgents.includes("*") || s.appliesToAgents.some(a => a.toLowerCase() === agentId.toLowerCase())) : applicable(s, project)), m = new Map(), conflicts = []; for (const s of ds) {
    const cur = m.get(s.id);
    if (!cur) {
        m.set(s.id, s);
        continue;
    }
    if (s.source === cur.source) {
        const w = s.priority >= cur.priority ? s : cur;
        m.set(s.id, w);
        conflicts.push(`Duplicate skill ${s.id} in ${w.source}; selected higher priority definition.`);
        continue;
    }
    if (!cur.overrideable && s.source !== "default") {
        conflicts.push(`Ignored ${s.source} override for non-overrideable skill ${s.id}.`);
        continue;
    }
    m.set(s.id, s);
    conflicts.push(`Skill ${s.id} from ${s.source} overrides ${cur.source}.`);
} const ir = resolveInstructions(orchestraxRoot, workspaceRoot, project), im = new Map(ir.instructions.map(i => [i.id.toLowerCase(), i])); const skills = [...m.values()].map(s => ({ ...s })).sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id)); for (const s of skills)
    for (const d of s.requiredInstructions) {
        const i = im.get(d.id.toLowerCase());
        if (d.required && (!i || !satisfiesVersion(i.version, d.version)))
            conflicts.push(i ? `Skill ${s.id} requires instruction ${d.id} ${d.version}, but effective version ${i.version} does not satisfy the dependency.` : `Skill ${s.id} requires instruction ${d.id} ${d.version}, but it is not available in the effective rails.`);
    } return { skills, conflicts }; }
export function resolveSkills(orchestraxRoot, workspaceRoot, project, agentId) { return resolve(orchestraxRoot, workspaceRoot, project, agentId); }
export const findSkill = (r, id) => r.skills.find(s => s.id.toLowerCase() === id.toLowerCase());
export function resolveSkillsForAgent(orchestraxRoot, workspaceRoot, project, agentId) { return resolveSkills(orchestraxRoot, workspaceRoot, project, agentId); }
export function resolveAllSkills(orchestraxRoot, workspaceRoot, project) { const ds = loadSkills(orchestraxRoot, workspaceRoot, project.path), seen = new Map(), conflicts = []; for (const sk of ds) {
    const cur = seen.get(sk.id);
    if (!cur) {
        seen.set(sk.id, sk);
        continue;
    }
    if (sk.source === cur.source) {
        seen.set(sk.id, sk.priority >= cur.priority ? sk : cur);
        continue;
    }
    if (!cur.overrideable && sk.source !== "default") {
        conflicts.push(`Ignored ${sk.source} override for non-overrideable skill ${sk.id}.`);
        continue;
    }
    seen.set(sk.id, sk);
} return { skills: [...seen.values()].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id)), conflicts }; }
