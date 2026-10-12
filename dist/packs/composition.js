import fs from "node:fs";
import path from "node:path";
import { analyzeProject } from "../analyzer/project-analyzer.js";
import { resolveInstructions } from "../instructions/resolver.js";
import { resolveAgents } from "../agents/resolver.js";
import { resolveSkills } from "../skills/resolver.js";
import { listInstalled } from "./installer.js";
import { projectHubPacksPath } from "../project-hub/manager.js";
import { resolvePackGraph, satisfiesVersion, validatePackCompatibility } from "./resolver.js";
export function composePack(project, packName, orchestraxRoot, workspaceRoot) {
    const builtIn = path.join(orchestraxRoot, "packs");
    const workspaceInstalled = path.join(workspaceRoot, ".orchestrax", "packs");
    const installed = path.join(project.path, ".orchestrax", "packs");
    const hubInstalled = projectHubPacksPath(workspaceRoot, project);
    const packPath = fs.existsSync(path.join(hubInstalled, packName, "pack.json"))
        ? path.join(hubInstalled, packName)
        : fs.existsSync(path.join(installed, packName, "pack.json"))
            ? path.join(installed, packName)
            : fs.existsSync(path.join(workspaceInstalled, packName, "pack.json"))
                ? path.join(workspaceInstalled, packName)
                : path.join(builtIn, packName);
    if (!fs.existsSync(packPath))
        return undefined;
    const graph = resolvePackGraph(packPath, [builtIn, workspaceInstalled, installed, hubInstalled]);
    if (!graph)
        return undefined;
    const profile = analyzeProject(project);
    const capabilities = new Set(profile.signals.flatMap(s => [s.key.toLowerCase(), s.value.toLowerCase()]));
    const signals = new Set(profile.signals.flatMap(s => [s.key.toLowerCase(), s.value.toLowerCase()]));
    const compatibility = validatePackCompatibility(graph.root.pack, capabilities, signals);
    const instructionResolution = resolveInstructions(orchestraxRoot, workspaceRoot, project);
    const agentResolution = resolveAgents(orchestraxRoot, workspaceRoot, project);
    const skillResolution = resolveSkills(orchestraxRoot, workspaceRoot, project);
    const instructions = new Map(instructionResolution.instructions.map(i => [i.id.toLowerCase(), i.version]));
    const agents = new Map(agentResolution.agents.map(a => [a.id.toLowerCase(), a.version]));
    const skills = new Map(skillResolution.skills.map(s => [s.id.toLowerCase(), s.version]));
    for (const node of graph.order) {
        checkResources(node.pack, instructions, agents, skills, graph);
    }
    return {
        ...graph,
        compatibility,
        resolvedInstructions: [...instructions.keys()],
        resolvedAgents: [...agents.keys()],
        resolvedSkills: [...skills.keys()]
    };
}
function checkResources(pack, instructions, agents, skills, graph) {
    for (const dep of pack.instructions) {
        const actual = instructions.get(dep.id.toLowerCase());
        if (!actual)
            graph.issues.push({ kind: "instruction", ...dep, message: `Pack ${pack.name} requires instruction ${dep.id} ${dep.version}, but it is not available in the effective rails.` });
        else if (!satisfiesVersion(actual, dep.version))
            graph.issues.push({ kind: "instruction", ...dep, message: `Pack ${pack.name} requires instruction ${dep.id} ${dep.version}, but effective version is ${actual}.` });
    }
    for (const dep of pack.agents) {
        const actual = agents.get(dep.id.toLowerCase());
        if (!actual)
            graph.issues.push({ kind: "agent", ...dep, message: `Pack ${pack.name} requires agent ${dep.id} ${dep.version}, but it is not available.` });
        else if (!satisfiesVersion(actual, dep.version))
            graph.issues.push({ kind: "agent", ...dep, message: `Pack ${pack.name} requires agent ${dep.id} ${dep.version}, but effective version is ${actual}.` });
    }
    for (const dep of pack.skills) {
        const actual = skills.get(dep.id.toLowerCase());
        if (!actual)
            graph.issues.push({ kind: "skill", ...dep, message: `Pack ${pack.name} requires skill ${dep.id} ${dep.version}, but it is not available.` });
        else if (!satisfiesVersion(actual, dep.version))
            graph.issues.push({ kind: "skill", ...dep, message: `Pack ${pack.name} requires skill ${dep.id} ${dep.version}, but effective version is ${actual}.` });
    }
}
export function installedPackNames(projectPath) { return listInstalled(projectPath); }
