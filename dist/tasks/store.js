import fs from "node:fs";
import path from "node:path";
const root = (p) => path.join(p, ".orchestrax", "tasks"), file = (p) => path.join(root(p), "tasks.json");
function ensure(p) { fs.mkdirSync(root(p), { recursive: true }); if (!fs.existsSync(file(p)))
    fs.writeFileSync(file(p), "[]\n"); }
export function readTasks(p) { ensure(p); try {
    return JSON.parse(fs.readFileSync(file(p), "utf8"));
}
catch {
    return [];
} }
export function writeTasks(p, t) { ensure(p); fs.writeFileSync(file(p), JSON.stringify(t, null, 2) + "\n"); }
export function addTask(p, t) { writeTasks(p, [...readTasks(p), t]); }
export function findTask(p, id) { return readTasks(p).find(t => t.id === id); }
export function updateTask(p, id, patch) { const t = readTasks(p), i = t.findIndex(x => x.id === id); if (i < 0)
    return; t[i] = { ...t[i], ...patch, updatedAt: new Date().toISOString() }; writeTasks(p, t); return t[i]; }
