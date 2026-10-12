import fs from "node:fs";
import path from "node:path";
import type { SyntraEntry } from "./types.js";

export function syntraRoot(projectPath: string): string { return path.join(projectPath, ".orchestrax", "syntra"); }
export function workspaceSyntraRoot(workspacePath: string): string { return path.join(workspacePath, "context", "syntra"); }

function entriesFile(root: string): string { return path.join(root, "entries.json"); }
function initRoot(root: string): void { fs.mkdirSync(root, { recursive: true }); if (!fs.existsSync(entriesFile(root))) fs.writeFileSync(entriesFile(root), "[]\n"); }

export function initSyntra(projectPath: string): void { initRoot(syntraRoot(projectPath)); }
export function initWorkspaceSyntra(workspacePath: string): void { initRoot(workspaceSyntraRoot(workspacePath)); }

export function readEntries(projectPath: string): SyntraEntry[] { return readEntriesAt(syntraRoot(projectPath)); }
export function readEntriesAt(root: string): SyntraEntry[] { initRoot(root); try { return JSON.parse(fs.readFileSync(entriesFile(root), "utf8")) as SyntraEntry[]; } catch { return []; } }

export function writeEntries(projectPath: string, entries: SyntraEntry[]): void { writeEntriesAt(syntraRoot(projectPath), entries); }
export function writeEntriesAt(root: string, entries: SyntraEntry[]): void { initRoot(root); fs.writeFileSync(entriesFile(root), JSON.stringify(entries, null, 2) + "\n"); }

export function addEntry(projectPath: string, entry: SyntraEntry): void { writeEntries(projectPath, [...readEntries(projectPath), entry]); }
export function addEntryAt(root: string, entry: SyntraEntry): void { writeEntriesAt(root, [...readEntriesAt(root), entry]); }

export function updateEntry(projectPath: string, id: string, patch: Partial<SyntraEntry>): SyntraEntry | undefined { return updateEntryAt(syntraRoot(projectPath), id, patch); }
export function updateEntryAt(root: string, id: string, patch: Partial<SyntraEntry>): SyntraEntry | undefined {
  const entries = readEntriesAt(root); const i = entries.findIndex(e => e.id === id); if (i < 0) return undefined;
  entries[i] = { ...entries[i], ...patch, updatedAt: new Date().toISOString() }; writeEntriesAt(root, entries); return entries[i];
}

export function searchEntries(projectPath: string, query: string): SyntraEntry[] { return searchEntriesAt(syntraRoot(projectPath), query); }
export function searchEntriesAt(root: string, query: string): SyntraEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return readEntriesAt(root).filter(e => { const haystack = [e.id,e.title,e.content,e.category,e.status].join(" ").toLowerCase(); return terms.every(t => haystack.includes(t)); });
}
