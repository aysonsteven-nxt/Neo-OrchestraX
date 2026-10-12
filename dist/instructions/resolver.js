import { analyzeProject } from "../analyzer/project-analyzer.js";
import { loadInstructions } from "./registry.js";
function applicable(instruction, project) {
    if (instruction.appliesTo.includes("*"))
        return true;
    const profile = analyzeProject(project);
    const signals = new Set(profile.signals.flatMap(s => [s.key.toLowerCase(), s.value.toLowerCase()]));
    return instruction.appliesTo.some(target => {
        const normalized = target.toLowerCase();
        return normalized === project.id.toLowerCase() || normalized === project.name.toLowerCase() || signals.has(normalized);
    });
}
export function resolveInstructions(orchestraxRoot, workspaceRoot, project) {
    const discovered = loadInstructions(orchestraxRoot, workspaceRoot, project.path).filter(i => applicable(i, project));
    const byId = new Map();
    const conflicts = [];
    for (const instruction of discovered) {
        const current = byId.get(instruction.id);
        if (!current) {
            byId.set(instruction.id, instruction);
            continue;
        }
        if (instruction.source === current.source) {
            const winner = instruction.priority >= current.priority ? instruction : current;
            const loser = winner === instruction ? current : instruction;
            byId.set(instruction.id, winner);
            conflicts.push(`Duplicate instruction ${instruction.id} in ${winner.source}; selected higher priority definition.`);
            continue;
        }
        if (!current.overrideable && instruction.source !== "default") {
            conflicts.push(`Ignored ${instruction.source} override for non-overrideable instruction ${instruction.id}.`);
            continue;
        }
        byId.set(instruction.id, { ...instruction, overridden: current.source });
    }
    return {
        instructions: [...byId.values()].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id)),
        conflicts
    };
}
export function findInstruction(resolution, id) {
    return resolution.instructions.find(i => i.id.toLowerCase() === id.toLowerCase());
}
