import fs from "node:fs";
import path from "node:path";
import { normalizePackMetadata, resolvePackGraph } from "./resolver.js";
function validateDependencyArray(name, value, errors) {
    if (value === undefined)
        return;
    if (!Array.isArray(value)) {
        errors.push(`${name} must be an array`);
        return;
    }
    for (const item of value) {
        if (!item || typeof item !== "object") {
            errors.push(`Each ${name} item must be an object`);
            continue;
        }
        const d = item;
        if (typeof d.id !== "string" || !d.id.trim())
            errors.push(`Each ${name} item requires id`);
        if (typeof d.version !== "string" || !d.version.trim())
            errors.push(`Each ${name} item requires version`);
        if (typeof d.required !== "boolean")
            errors.push(`Each ${name} item requires required=true/false`);
    }
}
export function validatePack(packPath, dependencyRoots = []) {
    const errors = [];
    const warnings = [];
    const manifestPath = path.join(packPath, "pack.json");
    if (!fs.existsSync(manifestPath))
        return { valid: false, errors: ["Missing pack.json"], warnings };
    let metadata;
    try {
        metadata = normalizePackMetadata(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    }
    catch {
        return { valid: false, errors: ["Invalid JSON in pack.json"], warnings };
    }
    if (!metadata.name?.trim())
        errors.push("Missing name");
    if (!metadata.version?.trim())
        errors.push("Missing version");
    if (!metadata.description?.trim())
        errors.push("Missing description");
    if (!Array.isArray(metadata.capabilities))
        errors.push("capabilities must be an array");
    validateDependencyArray("instructions", metadata.instructions, errors);
    validateDependencyArray("agents", metadata.agents, errors);
    validateDependencyArray("skills", metadata.skills, errors);
    validateDependencyArray("dependencies", metadata.dependencies, errors);
    if (metadata.hub !== undefined) {
        if (typeof metadata.hub !== "object" || metadata.hub === null)
            errors.push("hub must be an object");
        else if (metadata.hub.contributions !== undefined && !Array.isArray(metadata.hub.contributions))
            errors.push("hub.contributions must be an array");
    }
    if (errors.length)
        return { valid: false, errors, warnings, metadata };
    const graph = resolvePackGraph(packPath, dependencyRoots);
    if (!graph)
        return { valid: false, errors: ["Unable to resolve pack graph"], warnings, metadata };
    errors.push(...graph.issues.filter(i => i.required).map(i => i.message));
    warnings.push(...graph.issues.filter(i => !i.required).map(i => i.message));
    const resourceRoots = dependencyRoots;
    for (const resource of [
        ...metadata.agents.map(d => ["agent", d]),
        ...metadata.skills.map(d => ["skill", d])
    ]) {
        const embeddedDir = path.join(packPath, resource[0] === "agent" ? "agents" : "skills", resource[1].id);
        if (resource[1].required && !fs.existsSync(embeddedDir)) {
            // External resources are resolved through the normal roots below.
        }
    }
    for (const resource of [
        ...metadata.instructions.map(d => ["instruction", d]),
        ...metadata.agents.map(d => ["agent", d]),
        ...metadata.skills.map(d => ["skill", d])
    ]) {
        if (resource[1].required && resourceRoots.length === 0)
            warnings.push(`Cannot resolve ${resource[0]} dependency ${resource[1].id} without resource roots.`);
    }
    return { valid: errors.length === 0, errors, warnings, metadata };
}
