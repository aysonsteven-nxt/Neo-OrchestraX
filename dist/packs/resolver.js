import fs from "node:fs";
import path from "node:path";
import { loadPackRegistry } from "./registry.js";
function versionParts(v) {
    const clean = v.replace(/^[^0-9]*/, "");
    const parts = clean.split(".").map(p => Number.parseInt(p, 10));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}
export function satisfiesVersion(actual, range) {
    if (range === "*" || range === "latest")
        return true;
    const a = versionParts(actual);
    const r = versionParts(range);
    if (range.startsWith("^")) {
        if (r[0] > 0)
            return a[0] === r[0] && (a[1] > r[1] || (a[1] === r[1] && a[2] >= r[2]));
        if (r[1] > 0)
            return a[0] === 0 && a[1] === r[1] && a[2] >= r[2];
        return a[0] === 0 && a[1] === 0 && a[2] >= r[2];
    }
    if (range.startsWith("~"))
        return a[0] === r[0] && a[1] === r[1] && a[2] >= r[2];
    return actual === range;
}
function readPack(packPath) {
    const manifest = path.join(packPath, "pack.json");
    if (!fs.existsSync(manifest))
        return undefined;
    try {
        return JSON.parse(fs.readFileSync(manifest, "utf8"));
    }
    catch {
        return undefined;
    }
}
function normalizeDependency(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((d) => {
        if (!d || typeof d !== "object")
            return false;
        const x = d;
        return typeof x.id === "string" && typeof x.version === "string" && typeof x.required === "boolean";
    });
}
export function normalizePackMetadata(raw) {
    return {
        name: raw.name,
        version: raw.version,
        description: raw.description,
        capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : [],
        instructions: normalizeDependency(raw.instructions),
        agents: normalizeDependency(raw.agents),
        skills: normalizeDependency(raw.skills),
        dependencies: normalizeDependency(raw.dependencies),
        compatibility: raw.compatibility,
        hub: raw.hub
    };
}
function sourcesFromRoot(root) {
    if (!fs.existsSync(root))
        return [];
    return loadPackRegistry(root).flatMap(metadata => {
        const sourcePath = path.join(root, metadata.name);
        return readPack(sourcePath) ? [{ metadata: normalizePackMetadata(metadata), sourcePath }] : [];
    });
}
function buildSourceMap(roots, extra) {
    const map = new Map();
    for (const root of roots)
        for (const source of sourcesFromRoot(root))
            map.set(source.metadata.name.toLowerCase(), source);
    if (extra)
        map.set(extra.metadata.name.toLowerCase(), extra);
    return map;
}
function dependencyIssue(kind, dep, message) {
    return { kind, id: dep.id, version: dep.version, required: dep.required, message };
}
function resolvePackNode(source, sources, stack, cache) {
    const key = source.metadata.name.toLowerCase();
    if (stack.includes(key)) {
        const issue = {
            kind: "pack",
            id: source.metadata.name,
            version: source.metadata.version,
            required: true,
            message: `Circular pack dependency detected: ${[...stack, key].join(" -> ")}`
        };
        const existing = cache.get(key);
        if (existing) {
            if (!existing.issues.some(i => i.message === issue.message))
                existing.issues.push(issue);
            return existing;
        }
        return { pack: source.metadata, sourcePath: source.sourcePath, dependencies: [], issues: [issue] };
    }
    const cached = cache.get(key);
    if (cached)
        return cached;
    const node = { pack: source.metadata, sourcePath: source.sourcePath, dependencies: [], issues: [] };
    cache.set(key, node);
    for (const dep of source.metadata.dependencies) {
        const target = sources.get(dep.id.toLowerCase());
        if (!target) {
            node.issues.push(dependencyIssue("pack", dep, `Pack ${source.metadata.name} requires pack ${dep.id} ${dep.version}, but it is not available.`));
            continue;
        }
        if (!satisfiesVersion(target.metadata.version, dep.version)) {
            node.issues.push(dependencyIssue("pack", dep, `Pack ${source.metadata.name} requires pack ${dep.id} ${dep.version}, but available version is ${target.metadata.version}.`));
            continue;
        }
        const child = resolvePackNode(target, sources, [...stack, key], cache);
        node.dependencies.push(child);
        node.issues.push(...child.issues);
    }
    return node;
}
export function flattenPackGraph(root) {
    const result = [];
    const seen = new Set();
    const visit = (node) => {
        const key = node.pack.name.toLowerCase();
        if (seen.has(key))
            return;
        seen.add(key);
        for (const dep of node.dependencies)
            visit(dep);
        result.push(node);
    };
    visit(root);
    return result;
}
export function resolvePackGraph(packPath, availableRoots = [], extraRoots = []) {
    const raw = readPack(packPath);
    if (!raw)
        return undefined;
    const root = { metadata: normalizePackMetadata(raw), sourcePath: packPath };
    const sources = buildSourceMap([...availableRoots, ...extraRoots], root);
    const resolved = resolvePackNode(root, sources, [], new Map());
    const order = flattenPackGraph(resolved);
    const issues = [...new Map(order.flatMap(n => n.issues).map(i => [`${i.kind}:${i.id}:${i.version}:${i.message}`, i])).values()];
    return { root: resolved, order, issues };
}
export function validatePackCompatibility(metadata, capabilities, signals) {
    const compatibility = metadata.compatibility;
    if (!compatibility)
        return [];
    const errors = [];
    for (const capability of compatibility.capabilities ?? [])
        if (!capabilities.has(capability.toLowerCase()))
            errors.push(`Requires capability: ${capability}`);
    for (const signal of compatibility.signals ?? [])
        if (!signals.has(signal.toLowerCase()))
            errors.push(`Requires project signal: ${signal}`);
    for (const excluded of compatibility.excludes ?? [])
        if (capabilities.has(excluded.toLowerCase()) || signals.has(excluded.toLowerCase()))
            errors.push(`Incompatible with project signal/capability: ${excluded}`);
    return errors;
}
