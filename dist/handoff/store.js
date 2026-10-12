import fs from "node:fs";
import path from "node:path";
const root = (p) => path.join(p, ".orchestrax", "handoff");
const file = (p) => path.join(root(p), "handoffs.json");
function ensure(p) {
    fs.mkdirSync(root(p), { recursive: true });
    if (!fs.existsSync(file(p)))
        fs.writeFileSync(file(p), "[]\n");
}
export function readHandoffs(p) {
    ensure(p);
    try {
        return JSON.parse(fs.readFileSync(file(p), "utf8"));
    }
    catch {
        return [];
    }
}
export function writeHandoffs(p, handoffs) {
    ensure(p);
    fs.writeFileSync(file(p), JSON.stringify(handoffs, null, 2) + "\n");
}
export function addHandoff(p, handoff) {
    writeHandoffs(p, [...readHandoffs(p), handoff]);
}
export function latestHandoff(p) {
    return [...readHandoffs(p)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
export function findHandoff(p, id) {
    return readHandoffs(p).find(h => h.id === id);
}
