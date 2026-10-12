import { analyzeProject } from "../analyzer/project-analyzer.js";
import { loadAgents } from "./registry.js";
import { resolveInstructions } from "../instructions/resolver.js";
import { resolveSkillsForAgent } from "../skills/resolver.js";
function versionParts(v) { const m = v.replace(/^[^0-9]*/, "").split(".").map(x => parseInt(x, 10)); return [m[0] || 0, m[1] || 0, m[2] || 0]; }
function satisfiesVersion(actual, range) { const a = versionParts(actual), r = versionParts(range); if (range.startsWith("^"))
    return a[0] === r[0] && (a[1] > r[1] || (a[1] === r[1] && a[2] >= r[2])); if (range.startsWith("~"))
    return a[0] === r[0] && a[1] === r[1] && a[2] >= r[2]; return actual === range || range === "*"; }
function applicable(a, p) { if (a.appliesTo.includes("*"))
    return true; const prof = analyzeProject(p), s = new Set(prof.signals.flatMap(x => [x.key.toLowerCase(), x.value.toLowerCase()])); return a.appliesTo.some(t => { t = t.toLowerCase(); return t === p.id.toLowerCase() || t === p.name.toLowerCase() || s.has(t); }); }
export function resolveAgents(orchestraxRoot, workspaceRoot, project) { const ds = loadAgents(orchestraxRoot, workspaceRoot, project.path).filter(a => applicable(a, project)), m = new Map(), conflicts = []; for (const a of ds) {
    const cur = m.get(a.id);
    if (!cur) {
        m.set(a.id, a);
        continue;
    }
    if (a.source === cur.source) {
        const w = a.priority >= cur.priority ? a : cur;
        m.set(a.id, w);
        conflicts.push(`Duplicate agent ${a.id} in ${w.source}; selected higher priority definition.`);
        continue;
    }
    if (!cur.overrideable && a.source !== "default") {
        conflicts.push(`Ignored ${a.source} override for non-overrideable agent ${a.id}.`);
        continue;
    }
    m.set(a.id, a);
    conflicts.push(`Agent ${a.id} from ${a.source} overrides ${cur.source}.`);
} const ir = resolveInstructions(orchestraxRoot, workspaceRoot, project), im = new Map(ir.instructions.map(i => [i.id.toLowerCase(), i])); const agents = [...m.values()].map(a => { const sr = resolveSkillsForAgent(orchestraxRoot, workspaceRoot, project, a.id); return { ...a, resolvedInstructions: a.requiredInstructions.map(d => { const i = im.get(d.id.toLowerCase()); return { id: d.id, version: d.version, required: d.required, available: !!i && satisfiesVersion(i.version, d.version), source: i?.source }; }), resolvedSkills: a.skills.map(d => { const sk = sr.skills.find(x => x.id.toLowerCase() === d.id.toLowerCase()); return { id: d.id, version: d.version, required: d.required, available: !!sk && satisfiesVersion(sk.version, d.version), source: sk?.source }; }) }; }).sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id)); for (const a of agents) {
    for (const d of a.resolvedInstructions)
        if (d.required && !d.available) {
            const i = im.get(d.id.toLowerCase());
            conflicts.push(i ? `Agent ${a.id} requires instruction ${d.id} ${d.version}, but effective version ${i.version} does not satisfy the dependency.` : `Agent ${a.id} requires instruction ${d.id} ${d.version}, but it is not available in the effective rails.`);
        }
    for (const d of a.resolvedSkills)
        if (d.required && !d.available) {
            const sr = resolveSkillsForAgent(orchestraxRoot, workspaceRoot, project, a.id);
            const sk = sr.skills.find(x => x.id.toLowerCase() === d.id.toLowerCase());
            conflicts.push(sk ? `Agent ${a.id} requires skill ${d.id} ${d.version}, but effective version ${sk.version} does not satisfy the dependency.` : `Agent ${a.id} requires skill ${d.id} ${d.version}, but it is not available for this agent.`);
        }
} return { agents, conflicts }; }
export const findAgent = (r, id) => r.agents.find(a => a.id.toLowerCase() === id.toLowerCase());
