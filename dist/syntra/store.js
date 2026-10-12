import fs from "node:fs";
import path from "node:path";
export function syntraRoot(projectPath) { return path.join(projectPath, ".orchestrax", "syntra"); }
export function workspaceSyntraRoot(workspacePath) { return path.join(workspacePath, "context", "syntra"); }
function entriesFile(root) { return path.join(root, "entries.json"); }
function initRoot(root) { fs.mkdirSync(root, { recursive: true }); if (!fs.existsSync(entriesFile(root)))
    fs.writeFileSync(entriesFile(root), "[]\n"); }
export function initSyntra(projectPath) { initRoot(syntraRoot(projectPath)); }
export function initWorkspaceSyntra(workspacePath) { initRoot(workspaceSyntraRoot(workspacePath)); }
export function readEntries(projectPath) { return readEntriesAt(syntraRoot(projectPath)); }
export function readEntriesAt(root) { initRoot(root); try {
    return JSON.parse(fs.readFileSync(entriesFile(root), "utf8"));
}
catch {
    return [];
} }
export function writeEntries(projectPath, entries) { writeEntriesAt(syntraRoot(projectPath), entries); }
export function writeEntriesAt(root, entries) { initRoot(root); fs.writeFileSync(entriesFile(root), JSON.stringify(entries, null, 2) + "\n"); }
export function addEntry(projectPath, entry) { writeEntries(projectPath, [...readEntries(projectPath), entry]); }
export function addEntryAt(root, entry) { writeEntriesAt(root, [...readEntriesAt(root), entry]); }
export function updateEntry(projectPath, id, patch) { return updateEntryAt(syntraRoot(projectPath), id, patch); }
export function updateEntryAt(root, id, patch) {
    const entries = readEntriesAt(root);
    const i = entries.findIndex(e => e.id === id);
    if (i < 0)
        return undefined;
    entries[i] = { ...entries[i], ...patch, updatedAt: new Date().toISOString() };
    writeEntriesAt(root, entries);
    return entries[i];
}
export function searchEntries(projectPath, query) { return searchEntriesAt(syntraRoot(projectPath), query); }
export function searchEntriesAt(root, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return readEntriesAt(root).filter(e => { const haystack = [e.id, e.title, e.content, e.category, e.status].join(" ").toLowerCase(); return terms.every(t => haystack.includes(t)); });
}
